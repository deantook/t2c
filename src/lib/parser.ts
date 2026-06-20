import type { ParsedCommand } from "./types";

export function parseInput(raw: string): ParsedCommand {
  const trimmed = raw.trim();
  if (!trimmed) return { command: "", args: [] };

  const tokens: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;

  for (const ch of trimmed) {
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " ") {
      if (current) { tokens.push(current); current = ""; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  const [command = "", ...args] = tokens;
  return { command, args };
}
