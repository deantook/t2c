# t2c Terminal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static terminal-style Markdown blog where visitors use shell commands (`ll`, `cat`, `cd`, `timeline`, `grep`) to browse and read content.

**Architecture:** Astro 5 builds a single-page static site. A Vite plugin scans `content/` at build time, generates `fs-tree.json` and pre-rendered article HTML. A React terminal component parses user input, dispatches to pure-function command handlers backed by the virtual FS index. Pagefind indexes the built site for `grep`.

**Tech Stack:** Astro 5, React 19, Tailwind CSS 4, TypeScript, Vitest, gray-matter, marked, Shiki, Pagefind, @fontsource/jetbrains-mono

**Spec:** `docs/superpowers/specs/2026-06-20-terminal-blog-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `astro.config.mjs` | Astro + React + Tailwind + content Vite plugin |
| `vitest.config.ts` | Unit test runner |
| `tailwind.config.mjs` | Terminal color tokens |
| `src/styles/global.css` | Tailwind imports + terminal prose styles |
| `src/lib/types.ts` | Shared types: `FsNode`, `TerminalState`, `OutputLine`, `CommandResult` |
| `src/lib/fs.ts` | Virtual FS: path resolve, list dir, find file, all posts |
| `src/lib/parser.ts` | Tokenize input into `{ command, args }` |
| `src/lib/executor.ts` | Dispatch parsed command to handler |
| `src/lib/completion.ts` | Tab-completion candidates |
| `src/lib/history.ts` | localStorage command history |
| `src/lib/hash.ts` | URL hash ↔ command sync |
| `src/lib/commands/*.ts` | One file per command |
| `src/lib/commands/index.ts` | Command registry |
| `src/integrations/content-builder.ts` | Vite plugin: scan content, emit JSON + HTML |
| `src/components/Terminal/Terminal.tsx` | Root terminal container |
| `src/components/Terminal/Output.tsx` | Render output lines |
| `src/components/Terminal/InputLine.tsx` | Prompt + input + key handlers |
| `src/components/Terminal/Prompt.tsx` | `visitor@t2c:~/path$` |
| `src/pages/index.astro` | Single page, mounts Terminal |
| `content/**/*.md` | Markdown source |
| `public/generated/fs-tree.json` | Build output (gitignored) |
| `public/generated/articles/**/*.html` | Build output (gitignored) |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `tailwind.config.mjs`, `src/env.d.ts`, `src/styles/global.css`, `.gitignore`, `vercel.json`

- [ ] **Step 1: Initialize Astro project**

Run:
```bash
cd /Users/dean/code/t2c
npm create astro@latest . -- --template minimal --typescript strict --install --no-git
```

Expected: Astro scaffold created in existing repo.

- [ ] **Step 2: Add dependencies**

Run:
```bash
npm install @astrojs/react @astrojs/tailwind react react-dom @fontsource/jetbrains-mono gray-matter marked shiki pagefind
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom
```

- [ ] **Step 3: Create `astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { contentBuilder } from "./src/integrations/content-builder.ts";

export default defineConfig({
  integrations: [react(), tailwind(), contentBuilder()],
  vite: {
    ssr: {
      noExternal: ["marked"],
    },
  },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `tailwind.config.mjs`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0d1117",
          text: "#c9d1d9",
          green: "#3fb950",
          blue: "#58a6ff",
          red: "#f85149",
          link: "#39d353",
          codeBg: "#161b22",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create `src/styles/global.css`**

```css
@import "@fontsource/jetbrains-mono/400.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #terminal-root {
  height: 100%;
  margin: 0;
}

.terminal-prose h1, .terminal-prose h2, .terminal-prose h3 {
  @apply text-terminal-text font-bold mt-4 mb-2;
}
.terminal-prose p { @apply mb-2; }
.terminal-prose a { @apply text-terminal-link underline; }
.terminal-prose pre {
  @apply bg-terminal-codeBg p-3 rounded overflow-x-auto my-2;
}
.terminal-prose code { @apply font-mono text-sm; }
.terminal-prose img { @apply max-w-full; }

@media (prefers-reduced-motion: reduce) {
  .cursor-blink { animation: none; }
}
```

- [ ] **Step 7: Create `.gitignore` additions**

Append to `.gitignore`:
```
public/generated/
dist/
node_modules/
```

- [ ] **Step 8: Create `vercel.json`**

```json
{
  "buildCommand": "npm run build && npx pagefind --site dist",
  "outputDirectory": "dist"
}
```

- [ ] **Step 9: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with React, Tailwind, Vitest"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/lib/types.ts
export type FsNodeType = "file" | "dir";

export interface FsFile {
  name: string;
  type: "file";
  path: string;       // e.g. "docs/frontend/react-hooks.md"
  title: string;
  date: string;       // ISO date "2024-03-15"
  description?: string;
}

export interface FsDir {
  name: string;
  type: "dir";
  children: FsNode[];
}

export type FsNode = FsFile | FsDir;

export interface FsTree {
  root: FsDir;
  files: FsFile[];    // flat list for timeline/grep
}

export type OutputKind = "text" | "error" | "html" | "command-echo";

export interface OutputLine {
  kind: OutputKind;
  content: string;
}

export interface TerminalState {
  cwd: string;        // "~" or "~/docs/frontend"
  history: string[];
  output: OutputLine[];
}

export interface CommandContext {
  fs: FsTree;
  loadArticle: (path: string) => Promise<string>;
  search: (query: string) => Promise<SearchResult[]>;
}

export interface SearchResult {
  path: string;
  excerpt: string;
  line?: number;
}

export interface CommandResult {
  state: TerminalState;
  output: OutputLine[];
  asyncOutput?: Promise<OutputLine[]>;
}

export interface ParsedCommand {
  command: string;
  args: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add core terminal and filesystem types"
```

---

### Task 3: Virtual Filesystem

**Files:**
- Create: `src/lib/fs.ts`, `src/lib/fs.test.ts`, `src/lib/__fixtures__/fs-tree.ts`

- [ ] **Step 1: Write fixture**

```typescript
// src/lib/__fixtures__/fs-tree.ts
import type { FsTree } from "../types";

export const mockFs: FsTree = {
  root: {
    name: "~",
    type: "dir",
    children: [
      {
        name: "blog",
        type: "dir",
        children: [
          {
            name: "hello-world.md",
            type: "file",
            path: "blog/hello-world.md",
            title: "Hello World",
            date: "2024-01-20",
          },
        ],
      },
      {
        name: "docs",
        type: "dir",
        children: [
          {
            name: "frontend",
            type: "dir",
            children: [
              {
                name: "react-hooks.md",
                type: "file",
                path: "docs/frontend/react-hooks.md",
                title: "React Hooks",
                date: "2024-03-15",
              },
            ],
          },
        ],
      },
      {
        name: "about.md",
        type: "file",
        path: "about.md",
        title: "About",
        date: "2024-01-01",
      },
    ],
  },
  files: [
    { name: "hello-world.md", type: "file", path: "blog/hello-world.md", title: "Hello World", date: "2024-01-20" },
    { name: "react-hooks.md", type: "file", path: "docs/frontend/react-hooks.md", title: "React Hooks", date: "2024-03-15" },
    { name: "about.md", type: "file", path: "about.md", title: "About", date: "2024-01-01" },
  ],
};
```

- [ ] **Step 2: Write failing tests**

```typescript
// src/lib/fs.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "./__fixtures__/fs-tree";
import { normalizeCwd, resolvePath, getDirNode, findFile, listDir } from "./fs";

describe("normalizeCwd", () => {
  it("strips leading ~/", () => {
    expect(normalizeCwd("~/docs")).toBe("docs");
    expect(normalizeCwd("~")).toBe("");
  });
});

describe("resolvePath", () => {
  it("resolves relative paths from cwd", () => {
    expect(resolvePath("~/docs", "frontend")).toBe("~/docs/frontend");
    expect(resolvePath("~/docs/frontend", "..")).toBe("~/docs");
  });

  it("resolves absolute-from-root paths", () => {
    expect(resolvePath("~", "blog")).toBe("~/blog");
  });
});

describe("getDirNode", () => {
  it("finds nested directory", () => {
    const node = getDirNode(mockFs, "~/docs/frontend");
    expect(node?.name).toBe("frontend");
  });

  it("returns null for missing path", () => {
    expect(getDirNode(mockFs, "~/nope")).toBeNull();
  });
});

describe("listDir", () => {
  it("lists root contents", () => {
    const entries = listDir(mockFs, "~");
    expect(entries.map((e) => e.name)).toEqual(["blog", "docs", "about.md"]);
  });
});

describe("findFile", () => {
  it("finds file by name in cwd", () => {
    const file = findFile(mockFs, "~/docs/frontend", "react-hooks.md");
    expect(file?.title).toBe("React Hooks");
  });

  it("finds file by full path", () => {
    const file = findFile(mockFs, "~", "docs/frontend/react-hooks.md");
    expect(file?.path).toBe("docs/frontend/react-hooks.md");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/fs.test.ts`
Expected: FAIL — module `./fs` not found

- [ ] **Step 4: Implement `src/lib/fs.ts`**

```typescript
import type { FsDir, FsFile, FsNode, FsTree } from "./types";

export function normalizeCwd(cwd: string): string {
  if (cwd === "~") return "";
  return cwd.startsWith("~/") ? cwd.slice(2) : cwd;
}

export function toDisplayPath(internal: string): string {
  return internal === "" ? "~" : `~/${internal}`;
}

export function resolvePath(cwd: string, target: string): string {
  if (target === "" || target === "~") return "~";
  const base = normalizeCwd(cwd);
  const parts = target.startsWith("~/")
    ? target.slice(2).split("/")
    : [...(base ? base.split("/") : []), ...target.split("/")];

  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return toDisplayPath(stack.join("/"));
}

function getNodeAtPath(root: FsDir, path: string): FsNode | null {
  const segments = path ? path.split("/") : [];
  let current: FsNode = root;
  for (const seg of segments) {
    if (current.type !== "dir") return null;
    const next = current.children.find((c) => c.name === seg);
    if (!next) return null;
    current = next;
  }
  return current;
}

export function getDirNode(fs: FsTree, cwd: string): FsDir | null {
  const node = getNodeAtPath(fs.root, normalizeCwd(cwd));
  return node?.type === "dir" ? node : null;
}

export function listDir(fs: FsTree, cwd: string): FsNode[] {
  const dir = getDirNode(fs, cwd);
  if (!dir) return [];
  return [...dir.children].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function findFile(fs: FsTree, cwd: string, name: string): FsFile | null {
  const byPath = fs.files.find((f) => f.path === name || f.path === `${normalizeCwd(cwd)}/${name}`.replace(/^\//, ""));
  if (byPath) return byPath;
  const dir = normalizeCwd(cwd);
  const local = dir ? `${dir}/${name}` : name;
  return fs.files.find((f) => f.path === local || f.name === name) ?? null;
}

export function getAllFilesSorted(fs: FsTree): FsFile[] {
  return [...fs.files].sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/fs.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/fs.ts src/lib/fs.test.ts src/lib/__fixtures__/fs-tree.ts
git commit -m "feat: add virtual filesystem path utilities"
```

---

### Task 4: Command Parser

**Files:**
- Create: `src/lib/parser.ts`, `src/lib/parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseInput } from "./parser";

describe("parseInput", () => {
  it("parses command with args", () => {
    expect(parseInput("cd docs/frontend")).toEqual({ command: "cd", args: ["docs/frontend"] });
  });

  it("handles extra whitespace", () => {
    expect(parseInput("  ll  ")).toEqual({ command: "ll", args: [] });
  });

  it("returns empty command for blank input", () => {
    expect(parseInput("")).toEqual({ command: "", args: [] });
  });

  it("preserves quoted args", () => {
    expect(parseInput('grep "react hooks"')).toEqual({ command: "grep", args: ["react hooks"] });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/lib/parser.test.ts`

- [ ] **Step 3: Implement parser**

```typescript
// src/lib/parser.ts
import type { ParsedCommand } from "./types";

export function parseInput(raw: string): ParsedCommand {
  const trimmed = raw.trim();
  if (!trimmed) return { command: "", args: [] };

  const tokens: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;

  for (const ch of trimmed) {
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " ") {
      if (current) { tokens.push(current); current = ""; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  const [command = "", ...args] = tokens;
  return { command, args };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser.ts src/lib/parser.test.ts
git commit -m "feat: add shell-like command parser"
```

---

### Task 5: Command Handlers — Navigation & Listing

**Files:**
- Create: `src/lib/commands/ll.ts`, `src/lib/commands/cd.ts`, `src/lib/commands/pwd.ts`, `src/lib/commands/nav.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/commands/nav.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "../__fixtures__/fs-tree";
import { runLl } from "./ll";
import { runCd } from "./cd";
import { runPwd } from "./pwd";
import type { TerminalState, CommandContext } from "../types";

const baseState: TerminalState = { cwd: "~", history: [], output: [] };
const ctx: CommandContext = {
  fs: mockFs,
  loadArticle: async () => "",
  search: async () => [],
};

describe("runLl", () => {
  it("lists root directory", () => {
    const { output } = runLl(baseState, [], ctx);
    expect(output[0].content).toContain("blog/");
    expect(output[0].content).toContain("about.md");
  });
});

describe("runCd", () => {
  it("changes cwd", () => {
    const { state } = runCd(baseState, ["docs/frontend"], ctx);
    expect(state.cwd).toBe("~/docs/frontend");
  });

  it("errors on missing dir", () => {
    const { output } = runCd(baseState, ["nope"], ctx);
    expect(output[0].kind).toBe("error");
    expect(output[0].content).toContain("No such file or directory");
  });
});

describe("runPwd", () => {
  it("prints cwd", () => {
    const { output } = runPwd({ ...baseState, cwd: "~/docs" }, [], ctx);
    expect(output[0].content).toBe("~/docs");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement commands**

```typescript
// src/lib/commands/ll.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { listDir } from "../fs";

export function runLl(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const entries = listDir(ctx.fs, state.cwd);
  if (!entries.length) {
    return { state, output: [{ kind: "text", content: "" }] };
  }
  const lines = entries.map((e) => {
    if (e.type === "dir") return `drwxr-xr-x  ${e.name}/`;
    return `-rw-r--r--  ${e.date}  ${e.name}`;
  });
  return { state, output: [{ kind: "text", content: lines.join("\n") }] };
}
```

```typescript
// src/lib/commands/cd.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getDirNode, resolvePath } from "../fs";

export function runCd(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const target = args[0] ?? "~";
  const next = resolvePath(state.cwd, target);
  const dir = getDirNode(ctx.fs, next);
  if (!dir) {
    return {
      state,
      output: [{ kind: "error", content: `cd: ${target}: No such file or directory` }],
    };
  }
  return { state: { ...state, cwd: next }, output: [] };
}
```

```typescript
// src/lib/commands/pwd.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runPwd(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state, output: [{ kind: "text", content: state.cwd }] };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/ll.ts src/lib/commands/cd.ts src/lib/commands/pwd.ts src/lib/commands/nav.test.ts
git commit -m "feat: add ll, cd, pwd commands"
```

---

### Task 6: Command Handlers — Content

**Files:**
- Create: `src/lib/commands/cat.ts`, `src/lib/commands/about.ts`, `src/lib/commands/timeline.ts`, `src/lib/commands/content.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/commands/content.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "../__fixtures__/fs-tree";
import { runCat } from "./cat";
import { runAbout } from "./about";
import { runTimeline } from "./timeline";
import type { TerminalState, CommandContext } from "../types";

const baseState: TerminalState = { cwd: "~", history: [], output: [] };

function makeCtx(loadArticle = async () => "<p>Hello</p>"): CommandContext {
  return { fs: mockFs, loadArticle, search: async () => [] };
}

describe("runCat", () => {
  it("loads article html", async () => {
    const result = runCat(baseState, ["about.md"], makeCtx());
    expect(result.output[0].content).toContain("Loading");
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("html");
    expect(asyncOut[0].content).toBe("<p>Hello</p>");
  });

  it("errors when file missing", () => {
    const { output } = runCat(baseState, ["nope.md"], makeCtx());
    expect(output[0].kind).toBe("error");
  });
});

describe("runTimeline", () => {
  it("lists files by date desc", () => {
    const { output } = runTimeline(baseState, [], makeCtx());
    expect(output[0].content.indexOf("2024-03-15")).toBeLessThan(
      output[0].content.indexOf("2024-01-20")
    );
  });
});

describe("runAbout", () => {
  it("cats about.md", async () => {
    const result = runAbout(baseState, [], makeCtx(async () => "<p>About me</p>"));
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].content).toBe("<p>About me</p>");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/lib/commands/cat.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { findFile } from "../fs";

export function runCat(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const name = args[0];
  if (!name) {
    return { state, output: [{ kind: "error", content: "cat: missing operand" }] };
  }
  const file = findFile(ctx.fs, state.cwd, name);
  if (!file) {
    return { state, output: [{ kind: "error", content: `cat: ${name}: No such file` }] };
  }
  return {
    state,
    output: [{ kind: "text", content: `Loading ${file.path}...` }],
    asyncOutput: ctx.loadArticle(file.path).then(
      (html) => [{ kind: "html" as const, content: html }],
      () => [{ kind: "error" as const, content: "Error: failed to load article" }]
    ),
  };
}
```

```typescript
// src/lib/commands/about.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { runCat } from "./cat";

export function runAbout(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  return runCat(state, ["about.md"], ctx);
}
```

```typescript
// src/lib/commands/timeline.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getAllFilesSorted } from "../fs";

export function runTimeline(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const files = getAllFilesSorted(ctx.fs);
  const lines = files.map((f) => `${f.date}  ${f.path.padEnd(36)}  ${f.title}`);
  return { state, output: [{ kind: "text", content: lines.join("\n") }] };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/cat.ts src/lib/commands/about.ts src/lib/commands/timeline.ts src/lib/commands/content.test.ts
git commit -m "feat: add cat, about, timeline commands"
```

---

### Task 7: Command Handlers — Utility (help, clear, grep)

**Files:**
- Create: `src/lib/commands/help.ts`, `src/lib/commands/clear.ts`, `src/lib/commands/grep.ts`, `src/lib/commands/util.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/commands/util.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "../__fixtures__/fs-tree";
import { runHelp } from "./help";
import { runClear } from "./clear";
import { runGrep } from "./grep";
import type { TerminalState, CommandContext } from "../types";

const baseState: TerminalState = { cwd: "~", history: [], output: [{ kind: "text", content: "old" }] };
const ctx: CommandContext = {
  fs: mockFs,
  loadArticle: async () => "",
  search: async (q) => q === "react" ? [{ path: "docs/frontend/react-hooks.md", excerpt: "...react...", line: 3 }] : [],
};

describe("runHelp", () => {
  it("lists commands", () => {
    const { output } = runHelp(baseState, [], ctx);
    expect(output[0].content).toContain("ll");
    expect(output[0].content).toContain("grep");
  });
});

describe("runClear", () => {
  it("clears output", () => {
    const { state } = runClear(baseState, [], ctx);
    expect(state.output).toEqual([]);
  });
});

describe("runGrep", () => {
  it("returns search results", async () => {
    const result = runGrep(baseState, ["react"], ctx);
    const out = await result.asyncOutput!;
    expect(out[0].content).toContain("react-hooks.md");
    expect(out[0].content).toContain("1 match");
  });

  it("handles no matches", async () => {
    const result = runGrep(baseState, ["zzzzz"], ctx);
    const out = await result.asyncOutput!;
    expect(out[0].content).toBe("No matches found");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/lib/commands/help.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";

const HELP_TEXT = `Available commands:
  help              Show this help
  ll, ls            List directory contents
  cd <path>         Change directory
  pwd               Print working directory
  cat <file>        Display file contents
  timeline          List all posts by date
  grep <keyword>    Search posts
  clear             Clear terminal
  about             About this site`;

export function runHelp(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state, output: [{ kind: "text", content: HELP_TEXT }] };
}
```

```typescript
// src/lib/commands/clear.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runClear(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state: { ...state, output: [] }, output: [] };
}
```

```typescript
// src/lib/commands/grep.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runGrep(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const query = args.join(" ");
  if (!query) {
    return { state, output: [{ kind: "error", content: "grep: missing keyword" }] };
  }
  return {
    state,
    output: [],
    asyncOutput: ctx.search(query).then((results) => {
      if (!results.length) return [{ kind: "text" as const, content: "No matches found" }];
      const lines = results.map((r) => `${r.path}:${r.line ?? 1}: ${r.excerpt}`);
      const footer = `\n${results.length} match${results.length === 1 ? "" : "es"} found`;
      return [{ kind: "text" as const, content: lines.join("\n") + footer }];
    }),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/help.ts src/lib/commands/clear.ts src/lib/commands/grep.ts src/lib/commands/util.test.ts
git commit -m "feat: add help, clear, grep commands"
```

---

### Task 8: Command Registry & Executor

**Files:**
- Create: `src/lib/commands/index.ts`, `src/lib/executor.ts`, `src/lib/executor.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// src/lib/executor.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "./__fixtures__/fs-tree";
import { executeCommand } from "./executor";
import type { CommandContext, TerminalState } from "./types";

const ctx: CommandContext = {
  fs: mockFs,
  loadArticle: async (p) => `<p>${p}</p>`,
  search: async () => [],
};

describe("executeCommand", () => {
  it("runs cd then ll flow", () => {
    let state: TerminalState = { cwd: "~", history: [], output: [] };
    ({ state } = executeCommand(state, "cd docs", ctx));
    expect(state.cwd).toBe("~/docs");
    const { output } = executeCommand(state, "ll", ctx);
    expect(output.some((o) => o.content.includes("frontend/"))).toBe(true);
  });

  it("handles unknown command", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const { output } = executeCommand(state, "foo", ctx);
    expect(output[0].content).toContain("command not found: foo");
  });

  it("aliases ls to ll", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const { output } = executeCommand(state, "ls", ctx);
    expect(output[0].content).toContain("blog/");
  });

  it("ignores empty input", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const { output, state: next } = executeCommand(state, "", ctx);
    expect(output).toEqual([]);
    expect(next.cwd).toBe("~");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement registry and executor**

```typescript
// src/lib/commands/index.ts
import { runLl } from "./ll";
import { runCd } from "./cd";
import { runPwd } from "./pwd";
import { runCat } from "./cat";
import { runTimeline } from "./timeline";
import { runGrep } from "./grep";
import { runHelp } from "./help";
import { runClear } from "./clear";
import { runAbout } from "./about";
import type { CommandContext, CommandResult, TerminalState } from "../types";

type Handler = (state: TerminalState, args: string[], ctx: CommandContext) => CommandResult;

export const COMMANDS: Record<string, Handler> = {
  help: runHelp,
  ll: runLl,
  ls: runLl,
  cd: runCd,
  pwd: runPwd,
  cat: runCat,
  timeline: runTimeline,
  grep: runGrep,
  clear: runClear,
  about: runAbout,
};

export const COMMAND_NAMES = Object.keys(COMMANDS);
```

```typescript
// src/lib/executor.ts
import { parseInput } from "./parser";
import { COMMANDS } from "./commands";
import type { CommandContext, CommandResult, OutputLine, TerminalState } from "./types";

export function executeCommand(
  state: TerminalState,
  input: string,
  ctx: CommandContext
): CommandResult {
  const parsed = parseInput(input);
  if (!parsed.command) return { state, output: [] };

  const echo: OutputLine = { kind: "command-echo", content: input };
  const handler = COMMANDS[parsed.command];

  if (!handler) {
    return {
      state: { ...state, output: [...state.output, echo] },
      output: [{ kind: "error", content: `command not found: ${parsed.command}` }],
    };
  }

  const result = handler(state, parsed.args, ctx);
  return {
    ...result,
    state: {
      ...result.state,
      output: [...state.output, echo, ...result.output],
    },
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/index.ts src/lib/executor.ts src/lib/executor.test.ts
git commit -m "feat: add command registry and executor"
```

---

### Task 9: Content Build Plugin

**Files:**
- Create: `src/integrations/content-builder.ts`
- Create: sample `content/**/*.md` (minimal stubs for build verification)

- [ ] **Step 1: Create minimal sample content**

`content/about.md`:
```markdown
---
title: "About t2c"
date: 2024-01-01
description: "About this terminal blog"
---

# About t2c

Welcome to my terminal-style blog.
```

`content/blog/hello-world.md`:
```markdown
---
title: "Hello World"
date: 2024-01-20
tags: [blog]
---

# Hello World

My first post on t2c.
```

`content/docs/frontend/react-hooks.md`:
```markdown
---
title: "React Hooks 入门"
date: 2024-03-15
tags: [react, frontend]
description: "React Hooks 简介"
---

# React Hooks

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`
```

- [ ] **Step 2: Implement content builder plugin**

```typescript
// src/integrations/content-builder.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { createHighlighter } from "shiki";
import type { AstroIntegration } from "astro";

interface RawFile {
  relativePath: string;
  title: string;
  date: string;
  description?: string;
  html: string;
}

function walkDir(dir: string, base: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, base, acc);
    else if (entry.name.endsWith(".md")) acc.push(path.relative(base, full));
  }
  return acc;
}

function buildTree(files: RawFile[]) {
  const root = { name: "~", type: "dir" as const, children: [] as any[] };
  const flat: any[] = [];

  for (const file of files) {
    flat.push({
      name: path.basename(file.relativePath),
      type: "file",
      path: file.relativePath.replace(/\\/g, "/"),
      title: file.title,
      date: file.date,
      description: file.description,
    });

    const parts = file.relativePath.split(path.sep);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) continue;
      let child = current.children.find((c: any) => c.name === part && c.type === "dir");
      if (!child) {
        child = { name: part, type: "dir", children: [] };
        current.children.push(child);
      }
      current = child;
    }
  }

  return { root, files: flat };
}

async function processContent(contentDir: string, outDir: string) {
  const files = walkDir(contentDir, contentDir);
  const highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: ["javascript", "jsx", "typescript", "tsx", "bash", "markdown", "json"],
  });

  const processed: RawFile[] = [];
  for (const rel of files) {
    const raw = fs.readFileSync(path.join(contentDir, rel), "utf-8");
    const { data, content } = matter(raw);
    if (data.draft === true) continue;

    const title = String(data.title ?? path.basename(rel, ".md"));
    const date = String(data.date ?? "1970-01-01");
    const htmlBody = marked.parse(content) as string;
    const html = `<article class="terminal-prose">${htmlBody}</article>`;

    processed.push({
      relativePath: rel.replace(/\\/g, "/"),
      title,
      date,
      description: data.description ? String(data.description) : undefined,
      html,
    });
  }

  const tree = buildTree(processed);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "articles"), { recursive: true });

  fs.writeFileSync(path.join(outDir, "fs-tree.json"), JSON.stringify(tree, null, 2));

  for (const file of processed) {
    const outPath = path.join(outDir, "articles", `${file.relativePath}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, file.html);
  }
}

export function contentBuilder(): AstroIntegration {
  return {
    name: "content-builder",
    hooks: {
      "astro:config:done": async ({ config }) => {
        const contentDir = path.join(config.root.pathname, "content");
        const outDir = path.join(config.root.pathname, "public/generated");
        if (fs.existsSync(contentDir)) {
          await processContent(contentDir, outDir);
        }
      },
    },
  };
}
```

- [ ] **Step 3: Run dev server to verify generation**

Run: `npm run dev`
Expected: `public/generated/fs-tree.json` created with 3 files.

- [ ] **Step 4: Commit**

```bash
git add src/integrations/content-builder.ts content/
git commit -m "feat: add content build plugin for fs-tree and article HTML"
```

---

### Task 10: Tab Completion & History

**Files:**
- Create: `src/lib/completion.ts`, `src/lib/history.ts`, `src/lib/completion.test.ts`, `src/lib/history.test.ts`

- [ ] **Step 1: Write failing tests for completion**

```typescript
// src/lib/completion.test.ts
import { describe, it, expect } from "vitest";
import { mockFs } from "./__fixtures__/fs-tree";
import { getCompletions } from "./completion";

describe("getCompletions", () => {
  it("completes command names", () => {
    expect(getCompletions(mockFs, "~", "h", "")).toContain("help");
  });

  it("completes files in cwd", () => {
    expect(getCompletions(mockFs, "~", "cat ab", "ab")).toContain("about.md");
  });

  it("completes directories for cd", () => {
    expect(getCompletions(mockFs, "~", "cd do", "do")).toContain("docs");
  });
});
```

- [ ] **Step 2: Implement completion**

```typescript
// src/lib/completion.ts
import { COMMAND_NAMES } from "./commands";
import { listDir } from "./fs";
import type { FsTree } from "./types";

export function getCompletions(fs: FsTree, cwd: string, line: string, fragment: string): string[] {
  const trimmed = line.trimStart();
  const parts = trimmed.split(/\s+/);
  const command = parts[0] ?? "";

  if (parts.length <= 1 && !line.includes(" ")) {
    return COMMAND_NAMES.filter((c) => c.startsWith(fragment));
  }

  if (command === "cd" || command === "ll" || command === "ls") {
    const entries = listDir(fs, cwd);
    const names = entries.map((e) => (e.type === "dir" ? `${e.name}/` : e.name));
    return names.filter((n) => n.startsWith(fragment));
  }

  if (command === "cat") {
    const entries = listDir(fs, cwd).filter((e) => e.type === "file");
    return entries.map((e) => e.name).filter((n) => n.startsWith(fragment));
  }

  return [];
}
```

- [ ] **Step 3: Write failing tests for history**

```typescript
// src/lib/history.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, saveHistory, navigateHistory } from "./history";

describe("history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists commands", () => {
    saveHistory(["ll", "pwd"]);
    expect(loadHistory()).toEqual(["ll", "pwd"]);
  });

  it("navigates up and down", () => {
    const hist = ["a", "b"];
    expect(navigateHistory(hist, -1, hist.length)).toBe("b");
    expect(navigateHistory(hist, -1, 0)).toBe("a");
  });
});
```

Note: history tests need Vitest `environment: "jsdom"` — update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    environmentMatchGlobs: [
      ["src/lib/history.test.ts", "jsdom"],
    ],
  },
});
```

- [ ] **Step 4: Implement history**

```typescript
// src/lib/history.ts
const KEY = "t2c-command-history";
const MAX = 100;

export function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(history: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX)));
}

export function pushHistory(history: string[], command: string): string[] {
  if (!command.trim()) return history;
  const next = [...history, command];
  saveHistory(next);
  return next;
}

export function navigateHistory(history: string[], direction: -1 | 1, index: number): string | null {
  const next = index + direction;
  if (next < 0 || next >= history.length) return null;
  return history[next];
}
```

- [ ] **Step 5: Run all tests — expect PASS**

Run: `npm test`

- [ ] **Step 6: Commit**

```bash
git add src/lib/completion.ts src/lib/history.ts src/lib/completion.test.ts src/lib/history.test.ts vitest.config.ts
git commit -m "feat: add tab completion and command history"
```

---

### Task 11: URL Hash Routing

**Files:**
- Create: `src/lib/hash.ts`, `src/lib/hash.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/hash.test.ts
import { describe, it, expect } from "vitest";
import { hashToCommand, commandToHash } from "./hash";

describe("hash routing", () => {
  it("parses cat hash", () => {
    expect(hashToCommand("#cat/blog/hello-world.md")).toBe("cat blog/hello-world.md");
  });

  it("parses cd hash", () => {
    expect(hashToCommand("#cd/docs/frontend")).toBe("cd docs/frontend");
  });

  it("generates hash from cat command", () => {
    expect(commandToHash("cat about.md")).toBe("#cat/about.md");
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// src/lib/hash.ts
export function hashToCommand(hash: string): string | null {
  const h = hash.replace(/^#/, "");
  const catMatch = h.match(/^cat\/(.+\.md)$/);
  if (catMatch) return `cat ${catMatch[1]}`;
  const cdMatch = h.match(/^cd\/(.+)$/);
  if (cdMatch) return `cd ${cdMatch[1]}`;
  return null;
}

export function commandToHash(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("cat ")) {
    const path = trimmed.slice(4).trim();
    return `#cat/${path}`;
  }
  if (trimmed.startsWith("cd ")) {
    const path = trimmed.slice(3).trim();
    return `#cd/${path}`;
  }
  return null;
}
```

- [ ] **Step 3: Run tests — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/lib/hash.ts src/lib/hash.test.ts
git commit -m "feat: add URL hash deep linking"
```

---

### Task 12: Terminal React UI

**Files:**
- Create: `src/components/Terminal/Prompt.tsx`, `Output.tsx`, `InputLine.tsx`, `Terminal.tsx`, `index.ts`

- [ ] **Step 1: Create Prompt**

```tsx
// src/components/Terminal/Prompt.tsx
interface Props { cwd: string; }

export function Prompt({ cwd }: Props) {
  return (
    <span className="font-mono text-sm whitespace-pre">
      <span className="text-terminal-green">visitor</span>
      <span className="text-terminal-text">@t2c:</span>
      <span className="text-terminal-blue">{cwd}</span>
      <span className="text-terminal-text">$ </span>
    </span>
  );
}
```

- [ ] **Step 2: Create Output**

```tsx
// src/components/Terminal/Output.tsx
import type { OutputLine } from "../../lib/types";

interface Props { lines: OutputLine[]; }

export function Output({ lines }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-terminal-text">
      {lines.length === 0 && (
        <div className="mb-4">
          <p>Welcome to t2c</p>
          <p className="text-terminal-green/80">Type &apos;help&apos; for available commands.</p>
        </div>
      )}
      {lines.map((line, i) => {
        if (line.kind === "command-echo") {
          return (
            <div key={i} className="flex">
              {/* prompt rendered by InputLine on active row only; echo shows input */}
              <span className="text-terminal-text">{line.content}</span>
            </div>
          );
        }
        if (line.kind === "html") {
          return <div key={i} className="terminal-prose my-2" dangerouslySetInnerHTML={{ __html: line.content }} />;
        }
        const color = line.kind === "error" ? "text-terminal-red" : "text-terminal-text";
        return (
          <pre key={i} className={`whitespace-pre-wrap ${color}`}>{line.content}</pre>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create InputLine**

```tsx
// src/components/Terminal/InputLine.tsx
import { useRef, useEffect, type KeyboardEvent } from "react";
import { Prompt } from "./Prompt";

interface Props {
  cwd: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onHistoryUp: () => void;
  onHistoryDown: () => void;
  onTab: () => void;
}

export function InputLine({ cwd, value, onChange, onSubmit, onHistoryUp, onHistoryDown, onTab }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); onHistoryUp(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); onHistoryDown(); }
    else if (e.key === "Tab") { e.preventDefault(); onTab(); }
  }

  return (
    <div className="flex items-center px-4 py-2 border-t border-terminal-codeBg">
      <Prompt cwd={cwd} />
      <input
        ref={ref}
        className="flex-1 bg-transparent outline-none font-mono text-sm text-terminal-text caret-terminal-green"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        aria-label="Terminal input"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create Terminal root**

```tsx
// src/components/Terminal/Terminal.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { CommandContext, FsTree, OutputLine, TerminalState } from "../../lib/types";
import { executeCommand } from "../../lib/executor";
import { getCompletions } from "../../lib/completion";
import { loadHistory, pushHistory, navigateHistory } from "../../lib/history";
import { hashToCommand, commandToHash } from "../../lib/hash";
import { Output } from "./Output";
import { InputLine } from "./InputLine";

interface Props {
  fs: FsTree;
}

async function loadArticle(path: string): Promise<string> {
  const res = await fetch(`/generated/articles/${path}.html`);
  if (!res.ok) throw new Error("load failed");
  return res.text();
}

async function search(query: string) {
  // Pagefind loaded globally after build; fallback for dev
  const pf = (window as any).pagefind;
  if (!pf) {
    return [];
  }
  const results = await pf.search(query);
  const items = await Promise.all(results.results.slice(0, 10).map((r: any) => r.data()));
  return items.map((d: any) => ({
    path: d.url.replace(/^\//, "").replace(/\.html$/, ""),
    excerpt: d.excerpt,
  }));
}

export function Terminal({ fs }: Props) {
  const [state, setState] = useState<TerminalState>({ cwd: "~", history: loadHistory(), output: [] });
  const [input, setInput] = useState("");
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ctx: CommandContext = { fs, loadArticle, search };

  const runInput = useCallback(async (raw: string) => {
    const result = executeCommand(state, raw, ctx);
    let output: OutputLine[] = result.output;
    let nextState = result.state;

    if (result.asyncOutput) {
      const asyncLines = await result.asyncOutput;
      output = [...output, ...asyncLines];
      nextState = { ...nextState, output: [...nextState.output, ...asyncLines] };
    }

    setState({
      ...nextState,
      history: pushHistory(state.history, raw),
    });
    setInput("");
    setHistIndex(null);

    const hash = commandToHash(raw);
    if (hash) window.location.hash = hash;
  }, [state, ctx]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.output]);

  useEffect(() => {
    const cmd = hashToCommand(window.location.hash);
    if (cmd) runInput(cmd);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind.js";
    script.type = "module";
    script.onload = () => {
      (window as any).pagefind = (window as any).pagefind;
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <Output lines={state.output} />
      <div ref={bottomRef} />
      <InputLine
        cwd={state.cwd}
        value={input}
        onChange={setInput}
        onSubmit={() => runInput(input)}
        onHistoryUp={() => {
          const idx = histIndex ?? state.history.length;
          const cmd = navigateHistory(state.history, -1, idx);
          if (cmd !== null) { setInput(cmd); setHistIndex(idx - 1); }
        }}
        onHistoryDown={() => {
          if (histIndex === null) return;
          const cmd = navigateHistory(state.history, 1, histIndex);
          if (cmd !== null) { setInput(cmd); setHistIndex(histIndex + 1); }
          else { setInput(""); setHistIndex(null); }
        }}
        onTab={() => {
          const fragment = input.split(/\s+/).pop() ?? input;
          const matches = getCompletions(fs, state.cwd, input, fragment);
          if (matches.length === 1) {
            const base = input.slice(0, input.length - fragment.length);
            setInput(base + matches[0]);
          }
        }}
      />
    </div>
  );
}
```

```tsx
// src/components/Terminal/index.ts
export { Terminal } from "./Terminal";
```

- [ ] **Step 5: Wire up page**

```astro
---
// src/pages/index.astro
import "../styles/global.css";
import { Terminal } from "../components/Terminal";
import fsTree from "../../public/generated/fs-tree.json";

const fs = fsTree;
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>t2c — terminal blog</title>
  </head>
  <body class="h-full bg-terminal-bg">
    <div id="terminal-root" class="h-full">
      <Terminal client:load fs={fs} />
    </div>
  </body>
</html>
```

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`
Expected: Terminal renders, `ll` lists blog/docs/about, `cat about.md` loads content.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/pages/index.astro
git commit -m "feat: add terminal React UI and wire to index page"
```

---

### Task 13: Pagefind Integration & Production Build

**Files:**
- Modify: `package.json`, `src/pages/index.astro`

- [ ] **Step 1: Add pagefind meta tags for indexing**

In `index.astro` `<head>`:
```html
<meta name="pagefind:body" content="terminal blog content indexed via articles" />
```

Ensure each generated article HTML is copied into `dist/` (already via `public/generated/`).

Add `data-pagefind-body` to article HTML in content-builder:
```typescript
const html = `<article class="terminal-prose" data-pagefind-body>${htmlBody}</article>`;
```

- [ ] **Step 2: Run production build**

Run:
```bash
npm run build && npx pagefind --site dist --glob "**/*.html"
```
Expected: `dist/pagefind/` directory created.

- [ ] **Step 3: Preview and test grep**

Run: `npm run preview`
Type: `grep react`
Expected: matches `react-hooks.md`

- [ ] **Step 4: Commit**

```bash
git add package.json src/integrations/content-builder.ts src/pages/index.astro
git commit -m "feat: integrate Pagefind for grep search"
```

---

### Task 14: Sample Content & README

**Files:**
- Create: `content/docs/backend/go-concurrency.md`
- Create: `README.md`

- [ ] **Step 1: Add third sample article**

```markdown
---
title: "Go 并发模式"
date: 2024-02-10
tags: [go, backend]
description: "Go 并发编程基础"
---

# Go 并发

使用 goroutine 和 channel 实现并发。
```

- [ ] **Step 2: Write README**

```markdown
# t2c

Terminal-style Markdown blog. Browse with shell commands: `ll`, `cat`, `cd`, `timeline`, `grep`.

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| ll      | List current directory |
| cat     | Read a markdown file |
| cd      | Change directory |
| timeline| All posts by date |
| grep    | Full-text search |

## Content

Add `.md` files to `content/` with frontmatter (title, date required).
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add content/docs/backend/go-concurrency.md README.md
git commit -m "docs: add sample content and README"
```

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|-----------------|------|
| 10 commands (help, ll/ls, cd, pwd, cat, timeline, grep, clear, about) | Tasks 5–8 |
| Tab completion | Task 10 |
| Command history (localStorage) | Task 10 |
| URL hash deep links | Task 11 |
| Terminal UI (GitHub Dark colors) | Tasks 1, 12 |
| Responsive layout | Task 12 (flex layout, input fixed bottom) |
| Hierarchical content + timeline | Tasks 5–6, 9 |
| Pagefind grep | Task 13 |
| Sample articles (2–3) | Tasks 9, 14 |
| Frontmatter (title, date, draft) | Task 9 |
| Error messages | Tasks 5–8 |
| Vitest unit tests | Tasks 3–8, 10–11 |
| Vercel deployment | Task 1 (vercel.json) |
| Accessibility (real input, reduced motion) | Tasks 1, 12 |

---

## Self-Review Notes

- All tasks include exact file paths and runnable commands.
- Types (`FsTree`, `TerminalState`, `CommandResult`) defined in Task 2 and used consistently throughout.
- No TBD placeholders.
- `grep` requires production build + Pagefind; dev mode returns empty (acceptable for v1, document in README).
