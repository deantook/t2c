import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getAllFilesSorted } from "../fs";

export function runTimeline(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const files = getAllFilesSorted(ctx.fs);
  const entries = files.map((f) => ({ date: f.date, path: f.path, title: f.title }));
  return { state, output: [{ kind: "timeline", entries }] };
}
