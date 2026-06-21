import type { CommandContext, CommandResult, TerminalState, LlEntry } from "../types";
import { listDir } from "../fs";

export function runLl(state: TerminalState, _args: string[], ctx: CommandContext): CommandResult {
  const entries = listDir(ctx.fs, state.cwd);
  if (!entries.length) {
    return { state, output: [{ kind: "text", content: "" }] };
  }
  const mapped: LlEntry[] = entries.map((e) => {
    if (e.type === "dir") {
      return { type: "dir", name: e.name, arg: e.name };
    }
    return { type: "file", name: e.name, arg: e.name, date: e.date, title: e.title };
  });
  return { state, output: [{ kind: "ll", entries: mapped }] };
}
