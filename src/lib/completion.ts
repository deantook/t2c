import { COMMAND_NAMES } from "./commands";
import { listDir } from "./fs";
import type { FsTree } from "./types";

export function getCompletions(fs: FsTree, cwd: string, line: string, fragment: string): string[] {
  const trimmed = line.trimStart();
  const parts = trimmed.split(/\s+/);
  const command = parts[0] ?? "";

  if (parts.length <= 1 && !line.includes(" ")) {
    return COMMAND_NAMES.filter((c) => c.startsWith(fragment));
  }

  if (command === "cd") {
    const entries = listDir(fs, cwd);
    return entries
      .filter((e) => e.type === "dir")
      .map((e) => e.name)
      .filter((n) => n.startsWith(fragment));
  }

  if (command === "ll" || command === "ls") {
    const entries = listDir(fs, cwd);
    const names = entries.map((e) => (e.type === "dir" ? `${e.name}/` : e.name));
    return names.filter((n) => n.startsWith(fragment));
  }

  if (command === "cat") {
    const entries = listDir(fs, cwd).filter((e) => e.type === "file");
    return entries.map((e) => e.name).filter((n) => n.startsWith(fragment));
  }

  return [];
}
