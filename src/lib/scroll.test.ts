import { describe, it, expect } from "vitest";
import { isNearBottom, scrollBehaviorForOutput } from "./scroll";
import type { OutputLine } from "./types";

describe("scroll utilities", () => {
  it("detects near bottom within threshold", () => {
    expect(isNearBottom({ scrollTop: 920, scrollHeight: 1000, clientHeight: 100 }, 80)).toBe(true);
    expect(isNearBottom({ scrollTop: 800, scrollHeight: 1000, clientHeight: 100 }, 80)).toBe(false);
  });

  it("uses instant for new article lines", () => {
    const lines: OutputLine[] = [{ kind: "article", path: "x", date: "d", title: "t", html: "<p/>" }];
    expect(scrollBehaviorForOutput(lines)).toBe("instant");
  });

  it("uses smooth for text output", () => {
    const lines: OutputLine[] = [{ kind: "text", content: "hi" }];
    expect(scrollBehaviorForOutput(lines)).toBe("smooth");
  });
});
