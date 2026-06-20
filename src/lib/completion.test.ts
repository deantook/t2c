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
