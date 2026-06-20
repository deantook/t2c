import { describe, it, expect } from "vitest";
import { createLoadingLine, replaceLoadingLine } from "./loading";
import type { OutputLine } from "./types";

describe("loading utilities", () => {
  it("creates loading line with unique id", () => {
    const a = createLoadingLine("Searching...");
    const b = createLoadingLine("Searching...");
    expect(a.kind).toBe("loading");
    expect(a.id).not.toBe(b.id);
    expect(a.message).toBe("Searching...");
  });

  it("replaces loading line by id", () => {
    const loading = createLoadingLine("Loading...");
    const output: OutputLine[] = [{ kind: "text", content: "before" }, loading];
    const replacement: OutputLine[] = [{ kind: "text", content: "done" }];
    const next = replaceLoadingLine(output, loading.id, replacement);
    expect(next).toEqual([
      { kind: "text", content: "before" },
      { kind: "text", content: "done" },
    ]);
  });

  it("appends replacement when loading id not found", () => {
    const output: OutputLine[] = [{ kind: "text", content: "x" }];
    const replacement: OutputLine[] = [{ kind: "error", content: "fail" }];
    const next = replaceLoadingLine(output, "missing", replacement);
    expect(next).toEqual([...output, ...replacement]);
  });
});
