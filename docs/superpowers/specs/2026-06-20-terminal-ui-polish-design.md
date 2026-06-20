# t2c — 终端 UI 完整打磨设计规格

**日期：** 2026-06-20  
**状态：** 已批准  
**项目：** t2c（terminal-to-content）  
**依赖：** [2026-06-20-terminal-blog-design.md](./2026-06-20-terminal-blog-design.md)

---

## 1. 概述

在 v1 终端博客功能完整可用的基础上，对终端 UI 进行一轮完整打磨：结构化输出渲染、语义着色、智能点击、输入层增强、欢迎页、状态栏、Ghost Tab 补全、文章内联分层、智能滚动与无障碍补强。

### 1.1 目标

- 从「能看」提升到「好用」：输出可读、路径可点、输入可靠
- 保持终端隐喻克制，不引入传统网页导航
- 纯前端改动，不增加后端或构建复杂度（除既有 fs-tree 数据外）

### 1.2 核心原则

- **结构化输出**：命令层返回 typed `OutputLine`，渲染层负责着色与交互
- **YAGNI**：明确排除主题切换、CRT 纹理、阅读模式折叠、Tab 下拉列表等
- **移动端优先**：sticky 输入行、safe-area、状态栏始终可见

### 1.3 用户决策记录

| 决策 | 选择 |
|------|------|
| 范围 | C — 完整 UI 打磨 |
| 架构 | 结构化 OutputLine（方案 A） |
| 路径点击 | 智能默认：目录 → `cd`，`.md` 文件 → `cat`，grep 结果 → `cat` |
| cat 长文 | 内联分层（边框 + meta + 宽度限制） |
| Tab 补全 | Ghost text 灰色后缀 |
| 欢迎页 | ASCII logo + 快捷命令 + localStorage resume |
| 状态栏 | 始终显示 |
| 滚动 | 智能 near-bottom auto-scroll |

---

## 2. 架构

### 2.1 方案选型

采用**结构化 OutputLine**（discriminated union）：

- 命令 handler 返回 typed payload
- `Output.tsx` 按 kind 分发到专用渲染组件
- 点击交互通过 `onRunCommand(input: string)` 回调注入

未采用「渲染时 regex 解析纯文本」：脆弱、难测、grep 高亮不可行。

### 2.2 组件布局

```
Terminal
├── Output          (flex-1, overflow-y-auto, role="log")
├── StatusBar       (新增, 固定于 Output 与 Input 之间)
└── InputLine       (sticky bottom-0, ghost 补全层)
    └── Prompt
```

`ViViewer` 不变，全屏替换主终端视图。

### 2.3 数据流

```
用户输入 → executor → CommandResult { output: OutputLine[] }
                    → asyncOutput → loading 行替换为结果
                    → setState → Output 渲染
                    → 点击路径 → onRunCommand("cat foo.md") → executor
```

---

## 3. 输出模型

### 3.1 OutputLine 类型

```typescript
type OutputLine =
  | { kind: "command-echo"; input: string; cwd: string }
  | { kind: "text"; content: string }
  | { kind: "error"; content: string; hint?: string }
  | { kind: "loading"; message: string; id: string }
  | { kind: "ll"; entries: LlEntry[] }
  | { kind: "timeline"; entries: TimelineEntry[] }
  | { kind: "grep"; query: string; matches: GrepMatch[] }
  | { kind: "article"; path: string; date: string; title: string; html: string }
  | { kind: "welcome"; shortcuts: Shortcut[]; lastRead?: string };

interface LlEntry {
  type: "dir" | "file";
  name: string;
  path: string;
  date?: string;
}

interface TimelineEntry {
  date: string;
  path: string;
  title: string;
}

interface GrepMatch {
  path: string;
  line: number;
  excerpt: string;
  highlight: string;
}

interface Shortcut {
  label: string;
  command: string;
}
```

### 3.2 迁移说明

- 移除 `{ kind: "html" }`，由 `{ kind: "article" }` 替代
- `command-echo` 从 `{ content: string }` 改为 `{ input, cwd }`
- `executor` 在 echo 时注入执行前的 `state.cwd`
- `clear` 使用 `replaceOutput: true`，output 清空后 Output 检测 `lines.length === 0` 渲染 welcome

### 3.3 Loading 替换机制

异步命令（`grep`、`cat`）流程：

1. 同步返回 `[loading]` + 更新 state
2. `asyncOutput` resolve 后，按 `loading.id` 替换该行及 append 结果
3. loading 行带 `aria-busy="true"`

---

## 4. 输出渲染与智能点击

### 4.1 着色规则

| 元素 | Tailwind 类 |
|------|-------------|
| 目录名 | `text-terminal-blue` |
| 权限位 / `drwx` 前缀 | `text-terminal-text/40` |
| 日期 | `text-terminal-text/60` |
| 文件名 | `text-terminal-text`，hover 下划线 |
| grep 命中词 | `<mark class="bg-yellow-500/30 text-terminal-text">` |
| 错误 | `text-terminal-red` |
| 错误 hint | `text-terminal-text/50 text-xs` |

### 4.2 点击行为

| 来源 | 点击目标 | 执行命令 |
|------|----------|----------|
| `ll` 目录 | 目录名 | `cd <path>` |
| `ll` 文件 | 文件名 | `cat <path>` |
| `timeline` | 路径 | `cat <path>` |
| `grep` | 匹配行 | `cat <path>` |
| `welcome` 快捷按钮 | 按钮 | 对应 command 字符串 |
| `welcome` resume | 链接 | `cat <lastRead>` |

实现：路径渲染为 `<button type="button">`，`onClick` 调用 `onRunCommand`。目录与文件通过 `aria-label` 区分（如 `Open directory backend` / `Read file react-hooks.md`）。

### 4.3 命令回显

```
visitor@t2c:~/docs/frontend$ ll
```

复用 `Prompt` 组件渲染 `{ cwd }` + 用户 `{ input }`。

---

## 5. 命令层变更

| 命令 | 变更 |
|------|------|
| `ll` | 返回 `{ kind: "ll", entries }` |
| `timeline` | 返回 `{ kind: "timeline", entries }` |
| `grep` | 同步返回 loading；async 返回 `{ kind: "grep", ... }` |
| `cat` | 同步返回 loading；async 返回 `{ kind: "article", ... }`；成功后写 `localStorage('t2c:last-read', path)` |
| `help` / `pwd` / `about` | 保持 `{ kind: "text" }` |
| 未知命令 | `{ kind: "error", hint: "Try 'help'" }` |
| `clear` | `replaceOutput: true` |

`cat` 的 meta（date, title）从 `ctx.fs.files` 按 path 查找。

---

## 6. 输入层

### 6.1 块光标

- input 值为空时，在 input 后显示绿色竖线（`w-2 h-4 bg-terminal-green cursor-blink`）
- 有文字时隐藏块光标，保留原生 `caret-terminal-green`
- `@keyframes blink` 定义于 `global.css`
- `@media (prefers-reduced-motion: reduce)` 关闭动画

### 6.2 Sticky 与 Safe Area

```css
/* InputLine 容器 */
sticky bottom-0 bg-terminal-bg z-10
pb-[env(safe-area-inset-bottom)]
border-t border-terminal-codeBg
```

### 6.3 Refocus

- `Output` 容器 `onClick` → `inputRef.current?.focus()`
- 不影响 button 点击（事件不冒泡阻止）

---

## 7. Ghost Tab 补全

### 7.1 视觉

InputLine 内相对定位容器，ghost 层叠于 input 上方：

```
visitor@t2c:~$ gre|p          ← input 层
              ███             ← ghost 层（灰色 text-terminal-text/30）
```

ghost 显示当前 fragment 之后的补全后缀；`pointer-events-none`。

### 7.2 逻辑

1. `onChange` / 每次 input 变化时调用 `getGhostSuffix(input, cwd, fs)`
2. 唯一匹配 → suffix = 匹配项去掉已输入部分
3. 多匹配 → suffix = 最长公共前缀超出 fragment 的部分
4. 无匹配 → 无 ghost
5. **Tab** 行为不变：调用现有 `applyCompletion`

新增 `getGhostSuffix()` 于 `completion.ts`，单元测试覆盖。

---

## 8. 状态栏

### 8.1 位置与样式

- 位于 Output 与 InputLine 之间
- `text-xs text-terminal-green/60 px-4 py-1 border-t border-terminal-codeBg`
- `bg-terminal-bg`，不随 Output 滚动

### 8.2 内容

```
~/docs/frontend · 12 posts · Tab complete · ↑↓ history · fs fullscreen
```

| 段 | 来源 |
|----|------|
| cwd | `state.cwd` |
| posts | `fs.files.length`（props 传入） |
| 快捷键提示 | 静态字符串；viewport < 640px 时缩短为 `Tab · ↑↓ · fs` |

---

## 9. 欢迎页

### 9.1 触发条件

- 首次进入且 output 为空（无 hash 深链命令时，hash 命令执行后 welcome 不再显示）
- `clear` 后 output 为空

### 9.2 内容

```
  ████████╗ ██████╗ ██████╗
  ╚══██╔══╝╚═██╔═╝╚════██╗
     ██║     ██║    █████╔╝
     ██║     ██║   ██╔═══╝
     ██║     ██║   ███████╗
     ╚═╝     ╚═╝   ╚══════╝

  terminal-to-content · type 'help' for commands

  [ timeline ]  [ ll blog ]  [ grep astro ]  [ about ]

  Continue reading: blog/pagefind-static-search.md
```

- ASCII logo：组件内常量字符串
- 快捷命令默认：`timeline`、`ll blog`、`grep astro`、`about`
- `lastRead`：读取 `localStorage('t2c:last-read')`；不存在则隐藏 resume 行

### 9.3 Welcome kind

构建时不需要生成；`Output` 在 `lines.length === 0` 时渲染内置 welcome 组件（或 push welcome kind on clear — 采用 **Output 内置渲染**，不占用 output buffer）。

**决策：** welcome 由 `Output` 在 `lines.length === 0` 时直接渲染，不写入 `TerminalState.output`。`clear` 仅清空 buffer。

---

## 10. Cat 内联分层

### 10.1 Article 块结构

```html
<div class="article-block border-l-2 border-terminal-green/30 pl-4 my-4 max-w-3xl">
  <div class="article-meta text-xs text-terminal-green/60 mb-2">
    {path} · {date} · {title}
  </div>
  <div class="terminal-prose" dangerouslySetInnerHTML={html} />
</div>
```

### 10.2 terminal-prose 补强

| 元素 | 样式 |
|------|------|
| 行内 `code` | `bg-terminal-codeBg px-1 rounded text-sm` |
| `blockquote` | `border-l-2 border-terminal-green/40 pl-3 italic text-terminal-text/80` |
| `h2` | 现有 bold + `border-b border-terminal-codeBg pb-1` |
| `pre` / 代码块 | 保持现有 Shiki 输出样式 |

代码块 copy 按钮：**不在本次范围**。

---

## 11. 智能滚动

### 11.1 规则

Output 容器持 `ref`，`state.output` 变化时：

```typescript
const threshold = 80;
const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
if (nearBottom) {
  el.scrollTo({ top: el.scrollHeight, behavior: hasNewArticle ? "instant" : "smooth" });
}
```

- 用户在底部 80px 内 → auto-scroll
- 用户上滚阅读 → 不滚动
- 新增 `article` kind → `instant`（避免 smooth 拖慢长文）

### 11.2 移除

删除现有无条件 `scrollIntoView({ behavior: "smooth" })`。

---

## 12. 无障碍

| 项 | 实现 |
|----|------|
| 输出区 | `role="log" aria-live="polite"` |
| 可点击路径 | `<button>` + `aria-label` |
| loading | `aria-busy="true"` |
| focus ring | 可点击元素 `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green` |
| vi 行号 | gutter 透明度从 `/40` 提至 `/55` |
| 块光标 | 装饰性，`aria-hidden="true"` |

---

## 13. 错误处理

| 场景 | 输出 |
|------|------|
| 未知命令 | `{ kind: "error", content: "command not found: xxx", hint: "Try 'help'" }` |
| grep 无结果 | `{ kind: "grep", matches: [] }` → 渲染 `No matches found` |
| cat 加载失败 | 替换 loading 为 `{ kind: "error", content: "Error: failed to load article" }` |
| grep 无 pagefind | loading 替换为 `{ kind: "error", content: "Search unavailable (build required)" }` |

---

## 14. 测试策略

| 层级 | 内容 |
|------|------|
| 单元 | `ll`/`timeline`/`grep`/`cat` 返回正确 kind；`getGhostSuffix`；near-bottom 滚动逻辑（纯函数） |
| 单元 | executor echo 含 cwd；loading 替换 |
| 组件 | Output 渲染 ll 条目着色；点击 callback 触发 |
| 集成 | clear → welcome 显示；cat → lastRead 写入 |
| 不测 | Playwright E2E（留后续） |

---

## 15. 明确不包含

- 主题切换（`theme light`）
- CRT 扫描线 / 伪窗口装饰
- Shift+单击复制路径
- Tab 下拉列表
- 阅读模式折叠 / 长文自动 vi
- 代码块 copy 按钮
- 虚拟键盘 `visualViewport` API（可后续单独立项）

---

## 16. 文件变更预估

| 文件 | 变更 |
|------|------|
| `src/lib/types.ts` | 扩展 OutputLine union |
| `src/lib/executor.ts` | echo cwd；loading 替换逻辑 |
| `src/lib/commands/ll.ts` | 结构化 entries |
| `src/lib/commands/timeline.ts` | 结构化 entries |
| `src/lib/commands/grep.ts` | loading + structured |
| `src/lib/commands/cat.ts` | loading + article + lastRead |
| `src/lib/completion.ts` | `getGhostSuffix()` |
| `src/lib/last-read.ts` | localStorage 读写（新） |
| `src/lib/scroll.ts` | near-bottom 判断（新，可测） |
| `src/components/Terminal/Output.tsx` | 分 kind 渲染 + welcome |
| `src/components/Terminal/InputLine.tsx` | ghost 层 + sticky + 块光标 |
| `src/components/Terminal/StatusBar.tsx` | 新组件 |
| `src/components/Terminal/Prompt.tsx` | 无变或小幅复用 |
| `src/components/Terminal/Terminal.tsx` | StatusBar + scroll ref + onRunCommand |
| `src/styles/global.css` | blink keyframes + prose 补强 |

---

## 17. 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 输出架构 | 结构化 OutputLine | 类型安全、可测、支持点击/着色 |
| welcome 存储 | Output 条件渲染，不写 state | clear 语义干净 |
| grep pagefind 不可用 | 明确 error 而非空结果 | dev 模式可感知 |
| 滚动 threshold | 80px | 平衡误触与体验 |
