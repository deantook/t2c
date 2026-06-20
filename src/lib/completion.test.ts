import { describe, it, expect } from "vitest";
import { mockFs } from "./__fixtures__/fs-tree";
import {
  applyCompletion,
  getCompletionFragment,
  getCompletions,
  getGhostSuffix,
  longestCommonPrefix,
} from "./completion";

describe("getCompletions", () => {
  it("completes command names", () => {
    expect(getCompletions(mockFs, "~", "h", "")).toContain("help");
  });

  it("completes files in cwd", () => {
    expect(getCompletions(mockFs, "~", "cat ab", "ab")).toContain("about.md");
  });

  it("completes all files when fragment is empty", () => {
    expect(getCompletions(mockFs, "~", "cat ", "")).toContain("about.md");
  });

  it("completes sibling directories for cat", () => {
    expect(getCompletions(mockFs, "~", "cat d", "d")).toContain("docs/");
    expect(getCompletions(mockFs, "~", "cat b", "b")).toContain("blog/");
  });

  it("completes nested paths for cat", () => {
    expect(getCompletions(mockFs, "~", "cat docs/f", "docs/f")).toContain("docs/frontend/");
    expect(getCompletions(mockFs, "~", "cat docs/frontend/r", "docs/frontend/r")).toContain(
      "docs/frontend/react-hooks.md",
    );
  });

  it("completes directories for cd", () => {
    expect(getCompletions(mockFs, "~", "cd do", "do")).toContain("docs/");
  });

  it("completes nested directories for cd", () => {
    expect(getCompletions(mockFs, "~", "cd docs/f", "docs/f")).toContain("docs/frontend/");
  });
});

describe("applyCompletion", () => {
  it("completes a single file match", () => {
    expect(applyCompletion("cat a", "a", ["about.md"])).toBe("cat about.md");
  });

  it("completes a single directory match", () => {
    expect(applyCompletion("cat d", "d", ["docs/"])).toBe("cat docs/");
  });

  it("extends to longest common prefix when multiple match", () => {
    const matches = ["about.md", "abstract.md"];
    expect(applyCompletion("cat a", "a", matches)).toBe("cat ab");
    expect(longestCommonPrefix(matches)).toBe("ab");
  });
});

describe("getCompletionFragment", () => {
  it("returns empty fragment after trailing space", () => {
    expect(getCompletionFragment("cat ")).toBe("");
  });
});

describe("getGhostSuffix", () => {
  it("returns suffix for single command match", () => {
    expect(getGhostSuffix(mockFs, "~", "h")).toBe("elp");
  });

  it("returns suffix for single file match", () => {
    expect(getGhostSuffix(mockFs, "~", "cat ab")).toBe("out.md");
  });

  it("returns suffix for partial command match", () => {
    expect(getGhostSuffix(mockFs, "~", "cat a")).toBe("bout.md");
  });

  it("returns empty when no matches", () => {
    expect(getGhostSuffix(mockFs, "~", "cat zzzzzz")).toBe("");
  });

  it("returns empty after trailing space", () => {
    expect(getGhostSuffix(mockFs, "~", "cat ")).toBe("");
  });
});
