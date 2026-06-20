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
