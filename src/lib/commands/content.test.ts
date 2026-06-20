import { describe, it, expect } from "vitest";
import { mockFs } from "../__fixtures__/fs-tree";
import { runCat } from "./cat";
import { runAbout } from "./about";
import { runTimeline } from "./timeline";
import type { TerminalState, CommandContext } from "../types";

const baseState: TerminalState = { cwd: "~", history: [], output: [] };

function makeCtx(loadArticle = async () => "<p>Hello</p>"): CommandContext {
  return { fs: mockFs, loadArticle, search: async () => [] };
}

describe("runCat", () => {
  it("returns loading then article", async () => {
    const result = runCat(baseState, ["about.md"], makeCtx());
    expect(result.output[0].kind).toBe("loading");
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("article");
    if (asyncOut[0].kind === "article") {
      expect(asyncOut[0].path).toBe("about.md");
      expect(asyncOut[0].title).toBe("About");
      expect(asyncOut[0].html).toBe("<p>Hello</p>");
    }
  });

  it("errors when file missing", () => {
    const { output } = runCat(baseState, ["nope.md"], makeCtx());
    expect(output[0].kind).toBe("error");
  });

  it("returns error on load failure", async () => {
    const result = runCat(baseState, ["about.md"], makeCtx(async () => { throw new Error("fail"); }));
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("error");
  });
});

describe("runTimeline", () => {
  it("lists files by date desc", () => {
    const { output } = runTimeline(baseState, [], makeCtx());
    expect(output[0].kind).toBe("timeline");
    if (output[0].kind !== "timeline") return;
    expect(output[0].entries[0].date).toBe("2024-03-15");
    expect(output[0].entries.at(-1)?.date).toBe("2024-01-01");
  });
});

describe("runAbout", () => {
  it("cats about.md", async () => {
    const result = runAbout(baseState, [], makeCtx(async () => "<p>About me</p>"));
    const asyncOut = await result.asyncOutput!;
    expect(asyncOut[0].kind).toBe("article");
    if (asyncOut[0].kind === "article") expect(asyncOut[0].html).toBe("<p>About me</p>");
  });
});
