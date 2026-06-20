import type { CommandContext, CommandResult, TerminalState } from "../types";
import { getDirNode, resolvePath } from "../fs";

export function runCd(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const target = args[0] ?? "~";
  const next = resolvePath(state.cwd, target);
  const dir = getDirNode(ctx.fs, next);
  if (!dir) {
    return {
      state,
      output: [{ kind: "error", content: `cd: ${target}: No such file or directory` }],
    };
  }
  return { state: { ...state, cwd: next }, output: [] };
}
