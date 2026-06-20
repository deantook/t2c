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
