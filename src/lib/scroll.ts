import type { OutputLine } from "./types";

export const SCROLL_THRESHOLD = 80;

export function isNearBottom(
  el: { scrollTop: number; scrollHeight: number; clientHeight: number },
  threshold = SCROLL_THRESHOLD,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export function scrollBehaviorForOutput(newLines: OutputLine[]): ScrollBehavior {
  return newLines.some((l) => l.kind === "article") ? "instant" : "smooth";
}
