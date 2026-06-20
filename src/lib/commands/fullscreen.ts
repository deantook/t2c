import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runFullscreen(
  state: TerminalState,
  args: string[],
  _ctx: CommandContext,
): CommandResult {
  const action = args[0];
  if (action === "exit" || action === "off") {
    return { state, output: [], fullscreenAction: "exit" };
  }
  return { state, output: [], fullscreenAction: "enter" };
}

export function runExitFullscreen(
  state: TerminalState,
  _args: string[],
  _ctx: CommandContext,
): CommandResult {
  return { state, output: [], fullscreenAction: "exit" };
}
