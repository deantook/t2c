import { describe, it, expect } from "vitest";
import { runGrep } from "./grep";
import { mockFs } from "../__fixtures__/fs-tree";
import type { TerminalState } from "../types";

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
