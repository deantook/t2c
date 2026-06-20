import type { CommandContext, CommandResult, TerminalState } from "../types";

const HELP_TEXT = `Available commands:
  help              Show this help
  ll, ls            List directory contents
  cd <path>         Change directory
  pwd               Print working directory
  cat <file>        Display file contents
  vi, vim <file>    View file in read-only vi (:q to quit)
  timeline, tl      List all posts by date
  grep <keyword>    Search posts
  clear             Clear terminal
  about             About this site`;

export function runHelp(state: TerminalState, _args: string[], _ctx: CommandContext): CommandResult {
  return { state, output: [{ kind: "text", content: HELP_TEXT }] };
}
