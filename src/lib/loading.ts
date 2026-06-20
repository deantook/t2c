import type { OutputLine } from "./types";

let counter = 0;

export function createLoadingLine(message: string): OutputLine & { kind: "loading" } {
  counter += 1;
  return { kind: "loading", message, id: `loading-${counter}-${Date.now()}` };
}

export function replaceLoadingLine(
  output: OutputLine[],
  loadingId: string,
  replacement: OutputLine[],
): OutputLine[] {
  const idx = output.findIndex((l) => l.kind === "loading" && l.id === loadingId);
  if (idx === -1) return [...output, ...replacement];
  return [...output.slice(0, idx), ...replacement, ...output.slice(idx + 1)];
}
