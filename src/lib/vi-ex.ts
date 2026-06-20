export type ExCommandResult = { action: "quit" } | { action: "error"; message: string };

export function parseExCommand(input: string): ExCommandResult {
  const cmd = input.trim();
  if (cmd === ":q" || cmd === ":quit" || cmd === ":x") {
    return { action: "quit" };
  }
  const name = cmd.startsWith(":") ? cmd.slice(1) : cmd;
  return { action: "error", message: `Not an editor command: ${name}` };
}
