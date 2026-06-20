import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getAllFilesSorted } from "../fs";

export function runTimeline(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const files = getAllFilesSorted(ctx.fs);
  const lines = files.map((f) => `${f.date}  ${f.path.padEnd(36)}  ${f.title}`);
  return { state, output: [{ kind: "text", content: lines.join("\n") }] };
}
