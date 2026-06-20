import type { CommandContext, CommandResult, TerminalState } from "../types";
import { findFile } from "../fs";

export function runCat(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const name = args[0];
  if (!name) {
    return { state, output: [{ kind: "error", content: "cat: missing operand" }] };
  }
  const file = findFile(ctx.fs, state.cwd, name);
  if (!file) {
    return { state, output: [{ kind: "error", content: `cat: ${name}: No such file` }] };
  }
  return {
    state,
    output: [{ kind: "text", content: `Loading ${file.path}...` }],
    asyncOutput: ctx.loadArticle(file.path).then(
      (html) => [{ kind: "html" as const, content: html }],
      () => [{ kind: "error" as const, content: "Error: failed to load article" }]
    ),
  };
}
