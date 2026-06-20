import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runClear(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state: { ...state, output: [] }, output: [], replaceOutput: true };
}
