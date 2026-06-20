import type { CommandContext, CommandResult, TerminalState } from "../types";
import { runCat } from "./cat";

export function runAbout(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  return runCat(state, ["about.md"], ctx);
}
