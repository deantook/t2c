# t2c — 终端风格 Markdown 博客设计规格

**日期：** 2026-06-20  
**状态：** 已批准  
**项目：** t2c（terminal-to-content）

---

## 1. 概述

t2c 是一个终端风格的 Markdown 博客/文档网站。访客通过模拟 shell 命令（`ll`、`cat`、`cd`、`timeline`、`grep` 等）浏览和阅读内容，而非传统网页导航。

### 1.1 定位

- **个人博客**：按时间线浏览文章
- **技术文档站**：按层级目录组织主题文档

### 1.2 核心原则

- 纯静态站点，无后端，免费部署
- Markdown 文件即内容源，git push 即发布
- 命令语义贴近真实 Unix 终端，降低学习成本
- 第一版 YAGNI，预留扩展空间

---

## 2. 技术方案

### 2.1 选型（方案 A）

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Astro 5 + React | 内容优先的静态站，构建时处理 Markdown |
| 终端 UI | 自研 React 组件 | 轻量、可控、移动端友好 |
| 样式 | Tailwind CSS | 快速实现终端配色 |
| Markdown 渲染 | Astro 内置 + Shiki | 构建时高亮，cat 加载预渲染 HTML |
| 搜索 | Pagefind | 构建时全文索引，纯静态，无后端 |
| 字体 | `@fontsource/jetbrains-mono` | 等宽终端字体 |
| 部署 | Vercel 或 GitHub Pages | 免费、自动 CI |
| 测试 | Vitest | 命令逻辑单元测试 |

未采用 xterm.js：包体积大（~500KB），对博客/文档场景过重；自研组件足以覆盖所需交互。

### 2.2 架构

```
content/                    # Markdown 源文件
├── blog/
│   └── hello-world.md
├── docs/
│   ├── frontend/
│   │   └── react-hooks.md
│   └── backend/
│       └── go-concurrency.md
└── about.md

构建时 (Astro)：
  → 扫描 content/，解析 frontmatter
  → 生成 fs-tree.json（虚拟文件系统）
  → 每篇文章预渲染 HTML 片段
  → Pagefind 索引全文 → public/pagefind/
  → 输出静态 HTML/JS

运行时 (浏览器)：
  → 终端 UI 接收用户输入
  → CommandParser 解析并 dispatch
  → 输出渲染到终端屏幕
  → cat 懒加载对应文章 HTML
  → grep 调用 Pagefind 客户端 API
```

---

## 3. 命令系统

### 3.1 内置命令

| 命令 | 行为 | 示例 |
|------|------|------|
| `help` | 列出所有可用命令 | `help` |
| `ll` | 列出当前目录内容（目录 + 文章） | `ll` |
| `ls` | `ll` 的别名 | `ls` |
| `cd <path>` | 切换目录；`cd` 回根目录；`cd ..` 上一级 | `cd docs/frontend` |
| `pwd` | 显示当前路径 | `pwd` |
| `cat <file>` | 渲染并显示 Markdown 文章 | `cat react-hooks.md` |
| `timeline` | 按日期倒序列出全部文章（跨目录） | `timeline` |
| `grep <keyword>` | 全文搜索标题和内容 | `grep react` |
| `clear` | 清空终端输出 | `clear` |
| `about` | 显示站点/作者介绍（content/about.md） | `about` |

### 3.2 导航语义

- **`ll`**：列出**当前目录**内容，与真实终端一致
- **`timeline`**：按发布时间倒序列出**全部文章**，跨所有目录
- **`cd`**：在层级目录间导航，用于文档主题浏览
- 首页默认显示欢迎语 + 提示，不自动执行任何命令

### 3.3 交互细节

- **Tab 补全**：命令名、目录名、文件名
- **上下方向键**：命令历史，持久化到 `localStorage`
- **提示符格式**：`visitor@t2c:~/docs/frontend$`
- **错误提示**：
  - 未知命令 → `command not found: xxx`
  - 文件不存在 → `cat: xxx: No such file`

### 3.4 输出格式

**`ll` 输出：**

```
drwxr-xr-x  backend/
drwxr-xr-x  frontend/
-rw-r--r--  2024-03-15  react-hooks.md
-rw-r--r--  2024-02-10  vue-composition.md
```

**`timeline` 输出：**

```
2024-03-15  docs/frontend/react-hooks.md    React Hooks 入门
2024-02-10  docs/frontend/vue-composition.md  Vue Composition API
2024-01-20  blog/hello-world.md              Hello World
```

**`grep` 输出：**

```
docs/frontend/react-hooks.md:3: ...matching context...
blog/hello-world.md:1: ...matching context...

2 matches found
```

无结果时：`No matches found`

**`cat` 输出：** 终端内渲染 Markdown；长文可选分页（`--More--` 或 `[Press Enter to continue]`）

### 3.5 状态模型

```typescript
interface TerminalState {
  cwd: string;           // 当前目录，默认 "~"
  history: string[];     // 命令历史
  output: OutputLine[];  // 终端输出缓冲区
}
```

命令执行为纯函数：`(state, input) → { state, output }`，与 UI 分离，便于单元测试。

---

## 4. UI / 视觉

### 4.1 配色（GitHub Dark 风格）

| 元素 | 颜色 |
|------|------|
| 背景 | `#0d1117` |
| 主文字 | `#c9d1d9` |
| 提示符用户名 | `#3fb950`（绿） |
| 路径 | `#58a6ff`（蓝） |
| 目录（ll 输出） | `#58a6ff` |
| 文件 | `#c9d1d9` |
| 错误 | `#f85149` |
| 链接 | `#39d353`，hover 下划线 |

### 4.2 布局

- 全屏终端，占满视口，无传统网页导航
- 输出区可滚动，新输出自动滚到底部
- 输入行固定底部
- 闪烁光标（`prefers-reduced-motion` 时关闭）

### 4.3 响应式

| 断点 | 行为 |
|------|------|
| Desktop | 全屏终端，Tab 补全，方向键历史 |
| Mobile | 全屏终端；虚拟键盘弹起时输入行保持可见 |

### 4.4 Markdown 渲染（cat 内）

- 标准 Markdown 元素，终端配色
- 代码块：Shiki 高亮，背景 `#161b22`
- 图片：inline，max-width 100%
- 外链：`target="_blank"`，终端内可点击

### 4.5 无障碍

- 输入框使用真实 `<input>` 元素
- 文字对比度满足 WCAG AA
- 支持 `prefers-reduced-motion`

---

## 5. 内容结构

### 5.1 仓库目录

```
t2c/
├── content/                     # Markdown 源文件
│   ├── about.md
│   ├── blog/
│   │   └── hello-world.md
│   └── docs/
│       ├── frontend/
│       │   └── react-hooks.md
│       └── backend/
│           └── go-concurrency.md
├── src/
│   ├── components/
│   │   └── Terminal/
│   ├── lib/
│   │   ├── commands/
│   │   ├── parser.ts
│   │   └── fs.ts
│   └── pages/
│       └── index.astro
├── public/
├── docs/superpowers/specs/
├── astro.config.mjs
└── package.json
```

### 5.2 Frontmatter 规范

```yaml
---
title: "文章标题"          # 必填
date: 2024-03-15           # 必填，ISO 8601 日期
tags: [react, frontend]   # 可选
description: "一句话摘要"   # 可选，用于 grep 摘要和 SEO
draft: false              # 可选，true 时不纳入构建
---
```

### 5.3 虚拟文件系统

浏览器不读取真实文件系统，使用构建时生成的 `fs-tree.json`：

```json
{
  "name": "~",
  "type": "dir",
  "children": [
    { "name": "blog", "type": "dir", "children": ["..."] },
    { "name": "docs", "type": "dir", "children": ["..."] },
    { "name": "about.md", "type": "file", "title": "About", "date": "2024-01-01" }
  ]
}
```

`cat` 通过路径懒加载构建时预渲染的 HTML 片段（含 Shiki 代码高亮）。

---

## 6. 深链（URL Hash）

| URL | 行为 |
|-----|------|
| `/` | 显示欢迎页 |
| `/#cat/blog/hello-world.md` | 自动执行 `cat blog/hello-world.md` |
| `/#cd/docs/frontend` | 自动 `cd` 到该目录 |

支持分享直达某篇文章或目录的链接。

---

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| 未知命令 | `command not found: xxx`，提示输入 `help` |
| 路径不存在 | `cd: xxx: No such file or directory` |
| 文件不存在 | `cat: xxx: No such file` |
| 空输入 | 忽略，仅换行 |
| grep 无结果 | `No matches found` |
| 文章懒加载失败 | `Error: failed to load article` |

---

## 8. 测试策略

| 层级 | 内容 |
|------|------|
| 单元测试 | 命令解析器、虚拟 FS 路径解析、各命令纯函数 |
| 集成测试 | `cd` + `ll` + `cat` 组合流程 |
| E2E（v1.1） | Playwright 模拟终端输入 |

---

## 9. 第一版范围

### 9.1 包含

- 全部 10 个命令（help, ll/ls, cd, pwd, cat, timeline, grep, clear, about）
- Tab 补全 + 命令历史（localStorage）
- URL hash 深链
- 响应式终端 UI
- 2–3 篇示例文章
- Pagefind 全文搜索

### 9.2 不包含（后续迭代）

- 标签过滤命令（如 `tag react`）
- 主题切换（如 `theme light`）
- RSS / sitemap
- 评论系统
- 后台 CMS
- xterm.js 完整终端模拟
- Playwright E2E 测试

---

## 10. 部署

1. 推送代码到 GitHub
2. Vercel 连接仓库，构建命令 `npm run build`，输出目录 `dist/`
3. 每次 push 自动部署

备选：GitHub Actions + GitHub Pages。

---

## 11. 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 终端实现 | 自研组件 vs xterm.js | 更轻量，移动端更可控 |
| 框架 | Astro vs Next.js | 内容静态站更合适 |
| 搜索 | Pagefind vs 自建 JSON | 零后端，构建时索引 |
| timeline 与 ll 分离 | 独立命令 | 语义清晰，最易理解 |
| 内容组织 | 层级目录 + timeline | 同时满足博客和文档需求 |
