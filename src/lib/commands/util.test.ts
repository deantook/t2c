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
    expect(output[0].kind).toBe("text");
    if (output[0].kind === "text") {
      expect(output[0].content).toContain("ll");
      expect(output[0].content).toContain("grep");
    }
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
    expect(result.output[0].kind).toBe("loading");
    const out = await result.asyncOutput!;
    expect(out[0].kind).toBe("grep");
    if (out[0].kind === "grep") {
      expect(out[0].matches[0].path).toContain("react-hooks.md");
      expect(out[0].matches).toHaveLength(1);
    }
  });

  it("handles no matches", async () => {
    const result = runGrep(baseState, ["zzzzz"], ctx);
    const out = await result.asyncOutput!;
    expect(out[0].kind).toBe("grep");
    if (out[0].kind === "grep") expect(out[0].matches).toEqual([]);
  });
});
