# Terminal UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade t2c terminal UI with structured output rendering, semantic colors, smart-click navigation, input enhancements, welcome screen, status bar, ghost tab completion, inline article layout, and smart scrolling.

**Architecture:** Extend `OutputLine` to a discriminated union; command handlers return typed payloads; `Output.tsx` dispatches to per-kind render components with `onRunCommand` callbacks; async commands emit `{ kind: "loading", id }` rows replaced on resolve via `replaceLoadingLine()` in `Terminal.tsx`.

**Tech Stack:** Astro 5, React 19, Tailwind CSS, TypeScript, Vitest, @testing-library/react (jsdom)

**Spec:** `docs/superpowers/specs/2026-06-20-terminal-ui-polish-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/types.ts` | Extended `OutputLine` union + entry interfaces |
| `src/lib/loading.ts` | `createLoadingLine()`, `replaceLoadingLine()` |
| `src/lib/last-read.ts` | localStorage read/write for resume |
| `src/lib/scroll.ts` | `isNearBottom()`, `scrollBehaviorForOutput()` |
| `src/lib/completion.ts` | Add `getGhostSuffix()` |
| `src/lib/executor.ts` | Echo `{ input, cwd }`; error hints |
| `src/lib/commands/ll.ts` | Return `{ kind: "ll", entries }` |
| `src/lib/commands/timeline.ts` | Return `{ kind: "timeline", entries }` |
| `src/lib/commands/grep.ts` | Loading + structured grep output |
| `src/lib/commands/cat.ts` | Loading + article kind + lastRead |
| `src/components/Terminal/Output.tsx` | Kind dispatch + welcome |
| `src/components/Terminal/output/*.tsx` | Per-kind render components |
| `src/components/Terminal/Welcome.tsx` | ASCII logo + shortcuts + resume |
| `src/components/Terminal/StatusBar.tsx` | Fixed footer info bar |
| `src/components/Terminal/InputLine.tsx` | Ghost layer, sticky, block cursor |
| `src/components/Terminal/Terminal.tsx` | Loading replace, scroll, StatusBar, onRunCommand |
| `src/styles/global.css` | Blink keyframes, prose enhancements |
| `src/lib/*.test.ts` | Unit tests per module |

---

### Task 1: Extended OutputLine Types

**Files:**
- Modify: `src/lib/types.ts`
- Test: `src/lib/types.test.ts` (type-level smoke via runtime guards)

- [ ] **Step 1: Replace OutputLine definition in `src/lib/types.ts`**

```typescript
export type OutputKind = OutputLine["kind"];

export interface LlEntry {
  type: "dir" | "file";
  name: string;
  /** Argument for cd/cat relative to listing cwd, e.g. "frontend" or "about.md" */
  arg: string;
  date?: string;
}

export interface TimelineEntry {
  date: string;
  path: string;
  title: string;
}

export interface GrepMatch {
  path: string;
  line: number;
  excerpt: string;
  highlight: string;
}

export interface WelcomeShortcut {
  label: string;
  command: string;
}

export type OutputLine =
  | { kind: "command-echo"; input: string; cwd: string }
  | { kind: "text"; content: string }
  | { kind: "error"; content: string; hint?: string }
  | { kind: "loading"; message: string; id: string }
  | { kind: "ll"; entries: LlEntry[] }
  | { kind: "timeline"; entries: TimelineEntry[] }
  | { kind: "grep"; query: string; matches: GrepMatch[] }
  | { kind: "article"; path: string; date: string; title: string; html: string };

export interface CommandContext {
  fs: FsTree;
  loadArticle: (path: string) => Promise<string>;
  /** Returns null when Pagefind is unavailable (dev without build) */
  search: (query: string) => Promise<SearchResult[] | null>;
}
```

Remove old `{ kind: "html" }` and `{ kind: "command-echo"; content: string }`.

- [ ] **Step 2: Run tests to see compile failures**

Run: `npm test`
Expected: FAIL — multiple tests reference `.content` on command-echo and `html` kind

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: extend OutputLine union for UI polish"
```

---

### Task 2: Loading Line Utilities

**Files:**
- Create: `src/lib/loading.ts`
- Create: `src/lib/loading.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/loading.test.ts
import { describe, it, expect } from "vitest";
import { createLoadingLine, replaceLoadingLine } from "./loading";
import type { OutputLine } from "./types";

describe("loading utilities", () => {
  it("creates loading line with unique id", () => {
    const a = createLoadingLine("Searching...");
    const b = createLoadingLine("Searching...");
    expect(a.kind).toBe("loading");
    expect(a.id).not.toBe(b.id);
    expect(a.message).toBe("Searching...");
  });

  it("replaces loading line by id", () => {
    const loading = createLoadingLine("Loading...");
    const output: OutputLine[] = [
      { kind: "text", content: "before" },
      loading,
    ];
    const replacement: OutputLine[] = [{ kind: "text", content: "done" }];
    const next = replaceLoadingLine(output, loading.id, replacement);
    expect(next).toEqual([
      { kind: "text", content: "before" },
      { kind: "text", content: "done" },
    ]);
  });

  it("appends replacement when loading id not found", () => {
    const output: OutputLine[] = [{ kind: "text", content: "x" }];
    const replacement: OutputLine[] = [{ kind: "error", content: "fail" }];
    const next = replaceLoadingLine(output, "missing", replacement);
    expect(next).toEqual([...output, ...replacement]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/loading.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/loading.ts`**

```typescript
import type { OutputLine } from "./types";

let counter = 0;

export function createLoadingLine(message: string): OutputLine & { kind: "loading" } {
  counter += 1;
  return { kind: "loading", message, id: `loading-${counter}-${Date.now()}` };
}

export function replaceLoadingLine(
  output: OutputLine[],
  loadingId: string,
  replacement: OutputLine[],
): OutputLine[] {
  const idx = output.findIndex((l) => l.kind === "loading" && l.id === loadingId);
  if (idx === -1) return [...output, ...replacement];
  return [...output.slice(0, idx), ...replacement, ...output.slice(idx + 1)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/loading.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/loading.ts src/lib/loading.test.ts
git commit -m "feat: add loading line create/replace utilities"
```

---

### Task 3: last-read + scroll Utilities

**Files:**
- Create: `src/lib/last-read.ts`
- Create: `src/lib/last-read.test.ts`
- Create: `src/lib/scroll.ts`
- Create: `src/lib/scroll.test.ts`

- [ ] **Step 1: Write failing tests for last-read**

```typescript
// src/lib/last-read.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getLastRead, setLastRead } from "./last-read";

describe("last-read", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when unset", () => {
    expect(getLastRead()).toBeNull();
  });

  it("stores and retrieves path", () => {
    setLastRead("blog/hello-world.md");
    expect(getLastRead()).toBe("blog/hello-world.md");
  });
});
```

- [ ] **Step 2: Write failing tests for scroll**

```typescript
// src/lib/scroll.test.ts
import { describe, it, expect } from "vitest";
import { isNearBottom, scrollBehaviorForOutput } from "./scroll";
import type { OutputLine } from "./types";

describe("scroll utilities", () => {
  it("detects near bottom within threshold", () => {
    expect(isNearBottom({ scrollTop: 920, scrollHeight: 1000, clientHeight: 100 }, 80)).toBe(true);
    expect(isNearBottom({ scrollTop: 800, scrollHeight: 1000, clientHeight: 100 }, 80)).toBe(false);
  });

  it("uses instant for new article lines", () => {
    const lines: OutputLine[] = [{ kind: "article", path: "x", date: "d", title: "t", html: "<p/>" }];
    expect(scrollBehaviorForOutput(lines)).toBe("instant");
  });

  it("uses smooth for text output", () => {
    const lines: OutputLine[] = [{ kind: "text", content: "hi" }];
    expect(scrollBehaviorForOutput(lines)).toBe("smooth");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/last-read.test.ts src/lib/scroll.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement**

```typescript
// src/lib/last-read.ts
const KEY = "t2c:last-read";

export function getLastRead(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastRead(path: string): void {
  try {
    localStorage.setItem(KEY, path);
  } catch {
    // ignore quota errors
  }
}
```

```typescript
// src/lib/scroll.ts
import type { OutputLine } from "./types";

export const SCROLL_THRESHOLD = 80;

export function isNearBottom(
  el: { scrollTop: number; scrollHeight: number; clientHeight: number },
  threshold = SCROLL_THRESHOLD,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export function scrollBehaviorForOutput(newLines: OutputLine[]): ScrollBehavior {
  return newLines.some((l) => l.kind === "article") ? "instant" : "smooth";
}
```

- [ ] **Step 5: Add last-read to jsdom vitest project in `vitest.config.ts`**

Add `"src/lib/last-read.test.ts"` to jsdom project `include` array (uses localStorage).

- [ ] **Step 6: Run tests**

Run: `npm test -- src/lib/last-read.test.ts src/lib/scroll.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/last-read.ts src/lib/last-read.test.ts src/lib/scroll.ts src/lib/scroll.test.ts vitest.config.ts
git commit -m "feat: add last-read and scroll helper utilities"
```

---

### Task 4: Executor — cwd Echo + Error Hints

**Files:**
- Modify: `src/lib/executor.ts`
- Modify: `src/lib/executor.test.ts`

- [ ] **Step 1: Update failing tests in `executor.test.ts`**

Replace command-echo assertions:

```typescript
// Change fullscreen test:
expect(result.state.output).toEqual([{ kind: "command-echo", input: "fs", cwd: "~" }]);

// Change ll flow test — output is now structured:
const { output } = executeCommand(state, "ll", ctx);
expect(output.some((o) => o.kind === "ll")).toBe(true);

// Change unknown command test:
expect(output[0].kind).toBe("error");
if (output[0].kind === "error") {
  expect(output[0].content).toContain("command not found: foo");
  expect(output[0].hint).toBe("Try 'help'");
}

// Change ls alias test similarly for kind === "ll"
// Change tl alias test for kind === "timeline"

// Update clear test echo line:
{ kind: "command-echo", input: "ll", cwd: "~" },
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npm test -- src/lib/executor.test.ts`
Expected: FAIL on echo shape and ll kind

- [ ] **Step 3: Update `src/lib/executor.ts`**

```typescript
const echo: OutputLine = { kind: "command-echo", input, cwd: state.cwd };

if (!handler) {
  return {
    state: { ...state, output: [...state.output, echo] },
    output: [{ kind: "error", content: `command not found: ${parsed.command}`, hint: "Try 'help'" }],
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/executor.test.ts`
Expected: PASS (ll/timeline tests pass after Task 5-6; may still fail until then — run full suite after Task 6)

- [ ] **Step 5: Commit**

```bash
git add src/lib/executor.ts src/lib/executor.test.ts
git commit -m "feat: command echo includes cwd and error hints"
```

---

### Task 5: Structured `ll` Command

**Files:**
- Modify: `src/lib/commands/ll.ts`
- Modify: `src/lib/commands/nav.test.ts`

- [ ] **Step 1: Update failing test**

```typescript
// nav.test.ts runLl
it("lists root directory", () => {
  const { output } = runLl(baseState, [], ctx);
  expect(output[0].kind).toBe("ll");
  if (output[0].kind !== "ll") return;
  const names = output[0].entries.map((e) => e.name);
  expect(names).toContain("blog");
  expect(names).toContain("about.md");
  const blog = output[0].entries.find((e) => e.name === "blog");
  expect(blog?.type).toBe("dir");
  expect(blog?.arg).toBe("blog");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/commands/nav.test.ts`
Expected: FAIL — kind is "text"

- [ ] **Step 3: Implement `src/lib/commands/ll.ts`**

```typescript
import type { CommandContext, CommandResult, TerminalState, LlEntry } from "../types";
import { listDir } from "../fs";

export function runLl(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const entries = listDir(ctx.fs, state.cwd);
  if (!entries.length) {
    return { state, output: [{ kind: "text", content: "" }] };
  }
  const mapped: LlEntry[] = entries.map((e) => {
    if (e.type === "dir") {
      return { type: "dir", name: e.name, arg: e.name };
    }
    return { type: "file", name: e.name, arg: e.name, date: e.date };
  });
  return { state, output: [{ kind: "ll", entries: mapped }] };
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- src/lib/commands/nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/ll.ts src/lib/commands/nav.test.ts
git commit -m "feat: ll returns structured entries"
```

---

### Task 6: Structured `timeline` + `grep` Commands

**Files:**
- Modify: `src/lib/commands/timeline.ts`
- Modify: `src/lib/commands/grep.ts`
- Modify: `src/lib/commands/content.test.ts`
- Create: `src/lib/commands/grep.test.ts`

- [ ] **Step 1: Update timeline test**

```typescript
// content.test.ts runTimeline
it("lists files by date desc", () => {
  const { output } = runTimeline(baseState, [], makeCtx());
  expect(output[0].kind).toBe("timeline");
  if (output[0].kind !== "timeline") return;
  expect(output[0].entries[0].date).toBe("2024-03-15");
  expect(output[0].entries.at(-1)?.date).toBe("2024-01-20");
});
```

- [ ] **Step 2: Write grep tests**

```typescript
// src/lib/commands/grep.test.ts
import { describe, it, expect } from "vitest";
import { runGrep } from "./grep";
import { mockFs } from "../__fixtures__/fs-tree";
import type { TerminalState, CommandContext } from "../types";

const state: TerminalState = { cwd: "~", history: [], output: [] };

describe("runGrep", () => {
  it("returns loading line synchronously", () => {
    const result = runGrep(state, ["react"], {
      fs: mockFs,
      loadArticle: async () => "",
      search: async () => [{ path: "docs/frontend/react-hooks.md", excerpt: "react hooks", line: 1 }],
    });
    expect(result.output[0].kind).toBe("loading");
  });

  it("returns structured matches async", async () => {
    const result = runGrep(state, ["react"], {
      fs: mockFs,
      loadArticle: async () => "",
      search: async () => [{ path: "docs/frontend/react-hooks.md", excerpt: "react hooks guide", line: 3 }],
    });
    const loading = result.output[0];
    expect(loading.kind).toBe("loading");
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("grep");
    if (asyncOut[0].kind === "grep") {
      expect(asyncOut[0].matches[0].highlight).toBe("react");
      expect(asyncOut[0].matches[0].line).toBe(3);
    }
  });

  it("returns empty grep kind when no matches", async () => {
    const result = runGrep(state, ["zzzzz"], {
      fs: mockFs,
      loadArticle: async () => "",
      search: async () => [],
    });
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("grep");
    if (asyncOut[0].kind === "grep") expect(asyncOut[0].matches).toEqual([]);
  });

  it("returns error when search unavailable", async () => {
    const result = runGrep(state, ["react"], {
      fs: mockFs,
      loadArticle: async () => "",
      search: async () => null,
    });
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("error");
    if (asyncOut[0].kind === "error") {
      expect(asyncOut[0].content).toContain("Search unavailable");
    }
  });
});
```

- [ ] **Step 3: Run tests to verify failures**

Run: `npm test -- src/lib/commands/content.test.ts src/lib/commands/grep.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement timeline**

```typescript
// src/lib/commands/timeline.ts
import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getAllFilesSorted } from "../fs";

export function runTimeline(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const files = getAllFilesSorted(ctx.fs);
  const entries = files.map((f) => ({ date: f.date, path: f.path, title: f.title }));
  return { state, output: [{ kind: "timeline", entries }] };
}
```

- [ ] **Step 5: Implement grep**

```typescript
// src/lib/commands/grep.ts
import { createLoadingLine } from "../loading";
import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runGrep(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const query = args.join(" ");
  if (!query) {
    return { state, output: [{ kind: "error", content: "grep: missing keyword" }] };
  }
  const loading = createLoadingLine("Searching...");
  return {
    state,
    output: [loading],
    asyncOutput: ctx.search(query).then((results) => {
      if (results === null) {
        return [{ kind: "error" as const, content: "Search unavailable (build required)" }];
      }
      const matches = results.map((r) => ({
        path: r.path,
        line: r.line ?? 1,
        excerpt: r.excerpt,
        highlight: query,
      }));
      return [{ kind: "grep" as const, query, matches }];
    }),
  };
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- src/lib/commands/content.test.ts src/lib/commands/grep.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/commands/timeline.ts src/lib/commands/grep.ts src/lib/commands/content.test.ts src/lib/commands/grep.test.ts
git commit -m "feat: structured timeline and grep with loading"
```

---

### Task 7: Structured `cat` + lastRead

**Files:**
- Modify: `src/lib/commands/cat.ts`
- Modify: `src/lib/commands/content.test.ts`

- [ ] **Step 1: Update cat tests**

```typescript
it("returns loading then article", async () => {
  const result = runCat(baseState, ["about.md"], makeCtx());
  expect(result.output[0].kind).toBe("loading");
  const asyncOut = await result.asyncOutput!;
  expect(asyncOut[0].kind).toBe("article");
  if (asyncOut[0].kind === "article") {
    expect(asyncOut[0].path).toBe("about.md");
    expect(asyncOut[0].title).toBe("About");
    expect(asyncOut[0].html).toBe("<p>Hello</p>");
  }
});

it("returns error on load failure", async () => {
  const result = runCat(baseState, ["about.md"], makeCtx(async () => { throw new Error("fail"); }));
  const asyncOut = await result.asyncOutput!;
  expect(asyncOut[0].kind).toBe("error");
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/commands/content.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement cat**

```typescript
import { createLoadingLine } from "../loading";
import { setLastRead } from "../last-read";
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
  const loading = createLoadingLine(`Loading ${file.path}...`);
  return {
    state,
    output: [loading],
    asyncOutput: ctx.loadArticle(file.path).then(
      (html) => {
        setLastRead(file.path);
        return [{
          kind: "article" as const,
          path: file.path,
          date: file.date,
          title: file.title,
          html,
        }];
      },
      () => [{ kind: "error" as const, content: "Error: failed to load article" }],
    ),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/commands/content.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/cat.ts src/lib/commands/content.test.ts
git commit -m "feat: cat returns article kind with loading and lastRead"
```

---

### Task 8: Ghost Tab Suffix

**Files:**
- Modify: `src/lib/completion.ts`
- Modify: `src/lib/completion.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe("getGhostSuffix", () => {
  it("returns suffix for single command match", () => {
    expect(getGhostSuffix(mockFs, "~", "h")).toBe("elp");
  });

  it("returns suffix for single file match", () => {
    expect(getGhostSuffix(mockFs, "~", "cat ab")).toBe("out.md");
  });

  it("returns common prefix extension for multiple matches", () => {
    // If we had about.md and abstract.md, "cat a" → ghost "b"
    expect(getGhostSuffix(mockFs, "~", "cat a")).toBe("b");
  });

  it("returns empty when no matches", () => {
    expect(getGhostSuffix(mockFs, "~", "cat zzzzzz")).toBe("");
  });

  it("returns empty after trailing space", () => {
    expect(getGhostSuffix(mockFs, "~", "cat ")).toBe("");
  });
});
```

Add import for `getGhostSuffix`.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/completion.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement getGhostSuffix**

```typescript
export function getGhostSuffix(fs: FsTree, cwd: string, line: string): string {
  const fragment = getCompletionFragment(line);
  if (!fragment || /\s$/.test(line)) return "";
  const matches = getCompletions(fs, cwd, line, fragment);
  if (!matches.length) return "";
  if (matches.length === 1) {
    const m = matches[0];
    return m.startsWith(fragment) ? m.slice(fragment.length) : "";
  }
  const prefix = longestCommonPrefix(matches);
  return prefix.length > fragment.length ? prefix.slice(fragment.length) : "";
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/completion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/completion.ts src/lib/completion.test.ts
git commit -m "feat: ghost tab completion suffix helper"
```

---

### Task 9: Output Render Components

**Files:**
- Create: `src/components/Terminal/output/CommandEchoLine.tsx`
- Create: `src/components/Terminal/output/LlLine.tsx`
- Create: `src/components/Terminal/output/TimelineLine.tsx`
- Create: `src/components/Terminal/output/GrepLine.tsx`
- Create: `src/components/Terminal/output/ArticleLine.tsx`
- Create: `src/components/Terminal/output/ErrorLine.tsx`
- Create: `src/components/Terminal/output/LoadingLine.tsx`
- Create: `src/components/Terminal/output/ClickablePath.tsx`
- Create: `src/components/Terminal/Welcome.tsx`
- Modify: `src/components/Terminal/Output.tsx`

- [ ] **Step 1: Create shared ClickablePath**

```tsx
// src/components/Terminal/output/ClickablePath.tsx
interface Props {
  label: string;
  command: string;
  className?: string;
  ariaLabel: string;
  onRunCommand: (cmd: string) => void;
}

export function ClickablePath({ label, command, className = "", ariaLabel, onRunCommand }: Props) {
  return (
    <button
      type="button"
      className={`font-mono hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green ${className}`}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onRunCommand(command);
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Create LlLine**

```tsx
// src/components/Terminal/output/LlLine.tsx
import type { LlEntry } from "../../../lib/types";
import { ClickablePath } from "./ClickablePath";

interface Props {
  entries: LlEntry[];
  onRunCommand: (cmd: string) => void;
}

export function LlLine({ entries, onRunCommand }: Props) {
  return (
    <div className="font-mono text-sm space-y-0.5">
      {entries.map((e) => (
        <div key={e.name} className="flex gap-2">
          <span className="text-terminal-text/40 shrink-0">{e.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--"}</span>
          {e.type === "file" && e.date && <span className="text-terminal-text/60 shrink-0">{e.date}</span>}
          <ClickablePath
            label={e.type === "dir" ? `${e.name}/` : e.name}
            command={e.type === "dir" ? `cd ${e.arg}` : `cat ${e.arg}`}
            className={e.type === "dir" ? "text-terminal-blue" : "text-terminal-text"}
            ariaLabel={e.type === "dir" ? `Open directory ${e.name}` : `Read file ${e.name}`}
            onRunCommand={onRunCommand}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TimelineLine, GrepLine, ArticleLine, ErrorLine, LoadingLine, CommandEchoLine**

`TimelineLine`: date (dim) + clickable path (`cat ${path}`) + title

`GrepLine`: if matches empty → `<pre>No matches found</pre>`; else map matches with highlighted excerpt using:

```tsx
function HighlightExcerpt({ text, highlight }: { text: string; highlight: string }) {
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-terminal-text">{text.slice(idx, idx + highlight.length)}</mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}
```

Each match row is a button executing `cat ${path}`.

`ArticleLine`: spec §10.1 structure with meta header + `dangerouslySetInnerHTML`.

`ErrorLine`: red content + optional hint in `text-terminal-text/50 text-xs`.

`LoadingLine`: green dim text + `aria-busy="true"`.

`CommandEchoLine`: `<Prompt cwd={cwd} /><span>{input}</span>`.

- [ ] **Step 4: Create Welcome.tsx**

```tsx
// src/components/Terminal/Welcome.tsx
import { getLastRead } from "../../lib/last-read";
import { ClickablePath } from "./output/ClickablePath";

const ASCII_LOGO = `  ████████╗ ██████╗ ██████╗
  ╚══██╔══╝╚═██╔═╝╚════██╗
     ██║     ██║    █████╔╝
     ██║     ██║   ██╔═══╝
     ██║     ██║   ███████╗
     ╚═╝     ╚═╝   ╚══════╝`;

const SHORTCUTS = [
  { label: "timeline", command: "timeline" },
  { label: "ll blog", command: "ll blog" },
  { label: "grep astro", command: "grep astro" },
  { label: "about", command: "about" },
];

interface Props {
  onRunCommand: (cmd: string) => void;
}

export function Welcome({ onRunCommand }: Props) {
  const lastRead = getLastRead();
  return (
    <div className="mb-4 font-mono text-sm">
      <pre className="text-terminal-green whitespace-pre leading-tight">{ASCII_LOGO}</pre>
      <p className="mt-3 text-terminal-text/80">terminal-to-content · type &apos;help&apos; for commands</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SHORTCUTS.map((s) => (
          <ClickablePath
            key={s.command}
            label={`[ ${s.label} ]`}
            command={s.command}
            className="text-terminal-green"
            ariaLabel={`Run ${s.command}`}
            onRunCommand={onRunCommand}
          />
        ))}
      </div>
      {lastRead && (
        <p className="mt-3 text-terminal-text/60">
          Continue reading:{" "}
          <ClickablePath
            label={lastRead}
            command={`cat ${lastRead}`}
            className="text-terminal-link"
            ariaLabel={`Continue reading ${lastRead}`}
            onRunCommand={onRunCommand}
          />
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Rewrite Output.tsx**

```tsx
import type { OutputLine } from "../../lib/types";
import { Welcome } from "./Welcome";
import { CommandEchoLine } from "./output/CommandEchoLine";
import { LlLine } from "./output/LlLine";
import { TimelineLine } from "./output/TimelineLine";
import { GrepLine } from "./output/GrepLine";
import { ArticleLine } from "./output/ArticleLine";
import { ErrorLine } from "./output/ErrorLine";
import { LoadingLine } from "./output/LoadingLine";

interface Props {
  lines: OutputLine[];
  onRunCommand: (cmd: string) => void;
  onFocusInput: () => void;
  outputRef?: React.RefObject<HTMLDivElement | null>;
}

export function Output({ lines, onRunCommand, onFocusInput, outputRef }: Props) {
  return (
    <div
      ref={outputRef}
      role="log"
      aria-live="polite"
      className="flex-1 overflow-y-auto p-4 font-mono text-sm text-terminal-text"
      onClick={onFocusInput}
    >
      {lines.length === 0 && <Welcome onRunCommand={onRunCommand} />}
      {lines.map((line, i) => {
        switch (line.kind) {
          case "command-echo":
            return <CommandEchoLine key={i} input={line.input} cwd={line.cwd} />;
          case "ll":
            return <LlLine key={i} entries={line.entries} onRunCommand={onRunCommand} />;
          case "timeline":
            return <TimelineLine key={i} entries={line.entries} onRunCommand={onRunCommand} />;
          case "grep":
            return <GrepLine key={i} query={line.query} matches={line.matches} onRunCommand={onRunCommand} />;
          case "article":
            return <ArticleLine key={i} path={line.path} date={line.date} title={line.title} html={line.html} />;
          case "error":
            return <ErrorLine key={i} content={line.content} hint={line.hint} />;
          case "loading":
            return <LoadingLine key={i} message={line.message} />;
          case "text":
            return (
              <pre key={i} className="whitespace-pre-wrap text-terminal-text">
                {line.content}
              </pre>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/
git commit -m "feat: structured output render components and welcome screen"
```

---

### Task 10: StatusBar + InputLine Enhancements

**Files:**
- Create: `src/components/Terminal/StatusBar.tsx`
- Modify: `src/components/Terminal/InputLine.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Create StatusBar**

```tsx
// src/components/Terminal/StatusBar.tsx
interface Props {
  cwd: string;
  postCount: number;
}

export function StatusBar({ cwd, postCount }: Props) {
  const hints =
    typeof window !== "undefined" && window.innerWidth < 640
      ? "Tab · ↑↓ · fs"
      : "Tab complete · ↑↓ history · fs fullscreen";

  return (
    <div className="shrink-0 text-xs text-terminal-green/60 px-4 py-1 border-t border-terminal-codeBg bg-terminal-bg">
      {cwd} · {postCount} posts · {hints}
    </div>
  );
}
```

- [ ] **Step 2: Update InputLine with ghost, sticky, block cursor, inputRef export**

Key changes to `InputLine.tsx`:
- Add props: `ghostSuffix: string`, `inputRef?: RefObject<HTMLInputElement | null>`
- Wrapper: `sticky bottom-0 bg-terminal-bg z-10 pb-[env(safe-area-inset-bottom)]`
- Inner relative container for ghost overlay:

```tsx
<div className="relative flex-1 min-w-0">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center font-mono text-sm">
    <span className="invisible whitespace-pre">{value}</span>
    <span className="text-terminal-text/30 whitespace-pre">{ghostSuffix}</span>
  </div>
  <input ... className="relative w-full ..." />
</div>
{!value && (
  <span aria-hidden="true" className="cursor-blink w-0.5 h-4 bg-terminal-green shrink-0" />
)}
```

- [ ] **Step 3: Add CSS to global.css**

```css
@keyframes terminal-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.cursor-blink {
  animation: terminal-blink 1s step-end infinite;
}
@media (prefers-reduced-motion: reduce) {
  .cursor-blink { animation: none; opacity: 1; }
}

.terminal-prose :not(pre) > code {
  @apply bg-terminal-codeBg px-1 rounded text-sm;
}
.terminal-prose blockquote {
  @apply border-l-2 border-terminal-green/40 pl-3 italic text-terminal-text/80 my-2;
}
.terminal-prose h2 {
  @apply border-b border-terminal-codeBg pb-1;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/StatusBar.tsx src/components/Terminal/InputLine.tsx src/styles/global.css
git commit -m "feat: status bar, ghost input, block cursor, prose styles"
```

---

### Task 11: Terminal Integration

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Update search to return null when unavailable**

```typescript
async function search(query: string): Promise<SearchResult[] | null> {
  const pf = (window as Window & { pagefind?: { search: (q: string) => Promise<{ results: { data: () => Promise<{ url: string; excerpt: string }> }[] }> } }).pagefind;
  if (!pf) return null;
  const results = await pf.search(query);
  const items = await Promise.all(results.results.slice(0, 10).map((r) => r.data()));
  return items.map((d) => ({
    path: d.url.replace(/^\//, "").replace(/\.html$/, ""),
    excerpt: d.excerpt,
  }));
}
```

- [ ] **Step 2: Rewrite runInput async loading replace logic**

```typescript
if (result.asyncOutput) {
  const loadingLine = result.output.find((l) => l.kind === "loading");
  const loadingId = loadingLine?.kind === "loading" ? loadingLine.id : null;

  // Append echo + sync output (includes loading)
  const syncOutput = [...result.output];
  nextState = {
    ...nextState,
    output: [...currentState.output, ...(executeCommand already appended — use result.state.output)],
  };

  // Simpler approach: set state with sync portion first, then replace loading
  setState({
    ...nextState,
    history: pushHistory(currentState.history, raw),
  });

  const asyncLines = await result.asyncOutput;
  setState((prev) => ({
    ...prev,
    output: loadingId
      ? replaceLoadingLine(prev.output, loadingId, asyncLines)
      : [...prev.output, ...asyncLines],
  }));
} else {
  setState({ ...nextState, history: pushHistory(currentState.history, raw) });
}
```

**Important:** Refactor `runInput` so sync `setState` happens once with echo+loading, then async `setState` replaces loading. Track `loadingId` from `result.output`.

- [ ] **Step 3: Add smart scroll**

Replace `bottomRef` + `scrollIntoView` with:

```typescript
const outputRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const el = outputRef.current;
  if (!el) return;
  const newLines = state.output.slice(-3); // recent lines for behavior check
  if (isNearBottom(el)) {
    el.scrollTo({ top: el.scrollHeight, behavior: scrollBehaviorForOutput(newLines) });
  }
}, [state.output]);
```

- [ ] **Step 4: Wire Output, StatusBar, InputLine**

```tsx
<Output
  lines={state.output}
  onRunCommand={(cmd) => void runInput(cmd)}
  onFocusInput={() => inputRef.current?.focus()}
  outputRef={outputRef}
/>
<StatusBar cwd={state.cwd} postCount={fs.files.length} />
<InputLine
  ref={inputRef}
  cwd={state.cwd}
  value={input}
  ghostSuffix={getGhostSuffix(fs, state.cwd, input)}
  ...
/>
```

- [ ] **Step 5: Update executor.test.ts ctx.search to return `[]` not breaking null**

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`
Verify:
- Welcome shows on load
- `ll` colored + clickable dirs/files
- `cat` shows article block with meta
- `grep` shows loading then results
- Tab shows ghost suffix
- Status bar visible
- Scroll doesn't jump when scrolled up

- [ ] **Step 8: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/lib/executor.test.ts
git commit -m "feat: wire loading replace, smart scroll, status bar, ghost input"
```

---

### Task 12: ViViewer A11y + Final Test Fixup

**Files:**
- Modify: `src/components/Terminal/ViViewer.tsx`
- Modify: any remaining failing tests

- [ ] **Step 1: Bump gutter opacity**

Change `text-terminal-green/40` → `text-terminal-green/55` on line number gutter.

- [ ] **Step 2: Fix all test files referencing old output shapes**

Files to check:
- `src/lib/executor.test.ts`
- `src/lib/commands/nav.test.ts`
- `src/lib/commands/content.test.ts`
- `src/lib/commands/util.test.ts` (if any)

- [ ] **Step 3: Run full suite + build**

Run: `npm test && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: vi gutter contrast and test fixups for UI polish"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| §3 OutputLine types | Task 1 |
| §3.3 Loading replace | Task 2, 11 |
| §4 Coloring + clicks | Task 9 |
| §4.3 Command echo | Task 4, 9 |
| §5 Command changes | Tasks 5–7 |
| §6 Input layer | Task 10 |
| §7 Ghost Tab | Task 8, 10 |
| §8 Status bar | Task 10 |
| §9 Welcome | Task 9 |
| §10 Article layout | Task 9 |
| §11 Smart scroll | Task 3, 11 |
| §12 A11y | Tasks 9, 10, 12 |
| §13 Error handling | Tasks 4, 6, 7 |

## Out of Scope (confirmed)

Theme switch, CRT texture, Shift+click copy, Tab dropdown, reading mode collapse, code copy button, visualViewport API.
