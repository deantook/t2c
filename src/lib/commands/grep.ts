import { createLoadingLine } from "../loading";
import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runGrep(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const query = args.join(" ");
  if (!query) {
    return { state, output: [{ kind: "error", content: "grep: missing keyword" }] };
  }
  const loading = createLoadingLine("Searching...");
  return {
    state,
    output: [loading],
    asyncOutput: ctx.search(query).then((results) => {
      if (results === null) {
        return [{ kind: "error" as const, content: "Search unavailable (build required)" }];
      }
      const matches = results.map((r) => ({
        path: r.path,
        line: r.line ?? 1,
        excerpt: r.excerpt,
        highlight: query,
      }));
      return [{ kind: "grep" as const, query, matches }];
    }),
  };
}
