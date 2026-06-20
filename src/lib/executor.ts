import { parseInput } from "./parser";
import { COMMANDS } from "./commands";
import type { CommandContext, CommandResult, OutputLine, TerminalState } from "./types";

export function executeCommand(
  state: TerminalState,
  input: string,
  ctx: CommandContext
): CommandResult {
  const parsed = parseInput(input);
  if (!parsed.command) return { state, output: [] };

  const echo: OutputLine = { kind: "command-echo", content: input };
  const handler = COMMANDS[parsed.command];

  if (!handler) {
    return {
      state: { ...state, output: [...state.output, echo] },
      output: [{ kind: "error", content: `command not found: ${parsed.command}` }],
    };
  }

  const result = handler(state, parsed.args, ctx);

  if (result.openVi) {
    return {
      ...result,
      state: {
        ...result.state,
        output: [...state.output, echo],
      },
      output: [],
    };
  }

  if (result.replaceOutput) {
    return {
      ...result,
      state: { ...result.state, output: [] },
      output: [],
    };
  }

  return {
    ...result,
    state: {
      ...result.state,
      output: [...state.output, echo, ...result.output],
    },
  };
}
