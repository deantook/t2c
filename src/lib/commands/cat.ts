import { createLoadingLine } from "../loading";
import { setLastRead } from "../last-read";
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
  const loading = createLoadingLine(`Loading ${file.path}...`);
  return {
    state,
    output: [loading],
    asyncOutput: ctx.loadArticle(file.path).then(
      (html) => {
        setLastRead(file.path);
        return [{
          kind: "article" as const,
          path: file.path,
          date: file.date,
          title: file.title,
          html,
        }];
      },
      () => [{ kind: "error" as const, content: "Error: failed to load article" }],
    ),
  };
}
