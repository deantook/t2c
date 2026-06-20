---
title: "Vitest 测命令逻辑，不测 DOM 细节"
date: 2024-09-25
tags: [testing, vitest, frontend]
description: "纯函数优先、fake FS 与命令 executor 的分层测试"
---

# Vitest 测命令逻辑，不测 DOM 细节

终端 UI 看起来是 React，但**命令解析、路径补全、输出格式**应该是纯函数。t2c 把可测逻辑放在 `src/lib/`，Vitest 跑在 Node 里，不启浏览器——快、稳、CI 友好。

## 测什么、不测什么

| 测 | 不测（第一版） |
|----|--------------|
| parser 把 `cd docs/..` 解析成正确 argv | xterm 光标闪烁 |
| executor 在 mock FS 上 `ll` 输出条目 | CSS 颜色对比度 |
| completion 补全唯一前缀 | Playwright 全站 e2e |
| timeline 按 date 降序 | React 18 vs 19 内部实现 |

UI 回归交给人工 smoke + 少量 e2e；**业务规则**用单元测试锁住。

## 纯函数示例

```typescript
// parser.ts
export function parseInput(raw: string): ParsedCommand {
  const trimmed = raw.trim();
  if (!trimmed) return { cmd: "", args: [] };
  const [cmd, ...args] = trimmed.split(/\s+/);
  return { cmd, args };
}
```

```typescript
// parser.test.ts
import { describe, it, expect } from "vitest";
import { parseInput } from "./parser";

describe("parseInput", () => {
  it("splits command and args", () => {
    expect(parseInput("cat react-hooks.md")).toEqual({
      cmd: "cat",
      args: ["react-hooks.md"],
    });
  });

  it("handles extra whitespace", () => {
    expect(parseInput("  ll  ").cmd).toBe("ll");
  });
});
```

## Fake 文件系统

不要读真实 `content/`——测试应自包含：

```typescript
const fs: FsTree = {
  cwd: "/",
  dirs: ["docs", "blog"],
  files: [
    { name: "about.md", path: "about.md", date: "2024-01-01", title: "About" },
    { name: "hello.md", path: "blog/hello.md", date: "2024-02-01", title: "Hi" },
  ],
};

it("ll lists current directory", () => {
  const out = runCommand("ll", [], { fs, cwd: "/" });
  expect(out.lines.some((l) => l.kind === "entry" && l.name === "blog")).toBe(true);
});
```

集成测试可以单独用 fixture 拷贝一小棵真实 tree，但单元测试保持 minimal fake。

## 表驱动

命令行为适合 `it.each`：

```typescript
const cases = [
  ["cd docs", "/docs"],
  ["cd ..", "/"],
  ["cd /blog", "/blog"],
] as const;

it.each(cases)("cd %s → cwd %s", (input, expectedCwd) => {
  const state = initialState(fs);
  const next = runInput(state, input);
  expect(next.cwd).toBe(expectedCwd);
});
```

新 bug 修完后加一行 case，防止回归。

## Mock fetch（cat 懒加载）

```typescript
vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  if (url.includes("react-hooks.md")) {
    return new Response("<p>hooks</p>", { status: 200 });
  }
  return new Response("", { status: 404 });
}));
```

测「404 时输出错误行」，不依赖 Astro build 产物。

## 和 CI 集成

```json
"test": "vitest run"
```

watch 模式本地用 `vitest`；CI 用 `vitest run` 单次退出。覆盖率第一版可以不开——先把 critical path 测满比追求 80% 数字有意义。

## 小结

React 组件是壳；`lib/` 里的 parser、executor、completion 才是语义。Vitest + fake FS + 表驱动，十分钟可以覆盖 `help`、`ll`、`cd`、`cat` 失败路径——比调试「为什么 Tab 补全偶发不对」省时间得多。
