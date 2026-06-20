import { describe, it, expect } from "vitest";
import { mockFs } from "../__fixtures__/fs-tree";
import { runVi } from "./vi";
import type { TerminalState, CommandContext } from "../types";

const baseState: TerminalState = { cwd: "~", history: [], output: [] };
const ctx = { fs: mockFs } as CommandContext;

describe("runVi", () => {
  it("opens existing file in vi mode", () => {
    const result = runVi(baseState, ["about.md"], ctx);
    expect(result.openVi?.path).toBe("about.md");
    expect(result.output).toEqual([]);
  });

  it("errors when file missing", () => {
    const { output, openVi } = runVi(baseState, ["nope.md"], ctx);
    expect(openVi).toBeUndefined();
    expect(output[0].kind).toBe("error");
  });

  it("errors when operand missing", () => {
    const { output } = runVi(baseState, [], ctx);
    expect(output[0].content).toContain("missing operand");
  });
});
