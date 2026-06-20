import type { CommandContext, CommandResult, TerminalState } from "../types";

export function runGrep(state: TerminalState, args: string[], ctx: CommandContext): CommandResult {
  const query = args.join(" ");
  if (!query) {
    return { state, output: [{ kind: "error", content: "grep: missing keyword" }] };
  }
  return {
    state,
    output: [],
    asyncOutput: ctx.search(query).then((results) => {
      if (!results.length) return [{ kind: "text" as const, content: "No matches found" }];
      const lines = results.map((r) => `${r.path}:${r.line ?? 1}: ${r.excerpt}`);
      const footer = `\n${results.length} match${results.length === 1 ? "" : "es"} found`;
      return [{ kind: "text" as const, content: lines.join("\n") + footer }];
    }),
  };
}
