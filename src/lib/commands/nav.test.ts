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
    expect(output[0].kind).toBe("ll");
    if (output[0].kind !== "ll") return;
    const names = output[0].entries.map((e) => e.name);
    expect(names).toContain("blog");
    expect(names).toContain("about.md");
    const blog = output[0].entries.find((e) => e.name === "blog");
    expect(blog?.type).toBe("dir");
    expect(blog?.arg).toBe("blog");
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
    if (output[0].kind === "error") {
      expect(output[0].content).toContain("No such file or directory");
    }
  });
});

describe("runPwd", () => {
  it("prints cwd", () => {
    const { output } = runPwd({ ...baseState, cwd: "~/docs" }, [], ctx);
    expect(output[0].kind).toBe("text");
    if (output[0].kind === "text") expect(output[0].content).toBe("~/docs");
  });
});
