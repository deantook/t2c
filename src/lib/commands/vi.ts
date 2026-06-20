import type { CommandContext, CommandResult, TerminalState } from "../types";
import { findFile } from "../fs";

export function runVi(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const name = args[0];
  if (!name) {
    return { state, output: [{ kind: "error", content: "vi: missing operand" }] };
  }
  const file = findFile(ctx.fs, state.cwd, name);
  if (!file) {
    return { state, output: [{ kind: "error", content: `vi: ${name}: No such file` }] };
  }
  return {
    state,
    output: [],
    openVi: { path: file.path },
  };
}
