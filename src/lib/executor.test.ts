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

  it("aliases tl to timeline", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const { output } = executeCommand(state, "tl", ctx);
    expect(output[0].content).toContain("hello-world.md");
  });

  it("ignores empty input", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const { output, state: next } = executeCommand(state, "", ctx);
    expect(output).toEqual([]);
    expect(next.cwd).toBe("~");
  });

  it("clear wipes all prior output", () => {
    const state: TerminalState = {
      cwd: "~",
      history: [],
      output: [
        { kind: "text", content: "old line" },
        { kind: "command-echo", content: "ll" },
      ],
    };
    const { state: next, output } = executeCommand(state, "clear", ctx);
    expect(next.output).toEqual([]);
    expect(output).toEqual([]);
  });

  it("fullscreen requests enter without output", () => {
    const state: TerminalState = { cwd: "~", history: [], output: [] };
    const result = executeCommand(state, "fs", ctx);
    expect(result.fullscreenAction).toBe("enter");
    expect(result.output).toEqual([]);
    expect(result.state.output).toEqual([{ kind: "command-echo", content: "fs" }]);
  });
});
