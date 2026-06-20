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
