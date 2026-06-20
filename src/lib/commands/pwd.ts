import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runPwd(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state, output: [{ kind: "text", content: state.cwd }] };
}
