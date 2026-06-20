import type { CommandContext, CommandResult, TerminalState } from "../types";
import { listDir } from "../fs";

export function runLl(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const entries = listDir(ctx.fs, state.cwd);
  if (!entries.length) {
    return { state, output: [{ kind: "text", content: "" }] };
  }
  const lines = entries.map((e) => {
    if (e.type === "dir") return `drwxr-xr-x  ${e.name}/`;
    return `-rw-r--r--  ${e.date}  ${e.name}`;
  });
  return { state, output: [{ kind: "text", content: lines.join("\n") }] };
}
