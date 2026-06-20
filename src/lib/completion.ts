import { COMMAND_NAMES } from "./commands";
import { getDirNode, listDir, resolvePath } from "./fs";
import type { FsTree } from "./types";

export function longestCommonPrefix(strings: string[]): string {
  if (!strings.length) return "";
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    while (!s.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

/** Returns updated input after Tab, or null when nothing to apply. */
export function applyCompletion(input: string, fragment: string, matches: string[]): string | null {
  if (!matches.length) return null;
  const base = input.slice(0, input.length - fragment.length);
  if (matches.length === 1) return base + matches[0];
  const prefix = longestCommonPrefix(matches);
  return prefix.length > fragment.length ? base + prefix : null;
}

export function getCompletionFragment(input: string): string {
  if (/\s$/.test(input)) return "";
  const parts = input.split(/\s+/);
  return parts.pop() ?? input;
}

function splitPathFragment(fragment: string): { prefix: string; segment: string } {
  const lastSlash = fragment.lastIndexOf("/");
  if (lastSlash === -1) return { prefix: "", segment: fragment };
  return { prefix: fragment.slice(0, lastSlash + 1), segment: fragment.slice(lastSlash + 1) };
}

type PathCompletionOptions = {
  includeFiles: boolean;
  includeDirs: boolean;
  dirTrailingSlash: boolean;
};

function completePath(
  fs: FsTree,
  cwd: string,
  fragment: string,
  options: PathCompletionOptions,
): string[] {
  const { prefix, segment } = splitPathFragment(fragment);
  const dirPart = prefix.replace(/\/$/, "");
  const targetCwd = dirPart ? resolvePath(cwd, dirPart) : cwd;

  if (dirPart && !getDirNode(fs, targetCwd)) {
    return [];
  }

  const entries = listDir(fs, targetCwd);
  const matches: string[] = [];

  for (const entry of entries) {
    if (entry.type === "dir" && options.includeDirs && entry.name.startsWith(segment)) {
      const suffix = options.dirTrailingSlash ? "/" : "";
      matches.push(`${prefix}${entry.name}${suffix}`);
    } else if (entry.type === "file" && options.includeFiles && entry.name.startsWith(segment)) {
      matches.push(`${prefix}${entry.name}`);
    }
  }

  return matches;
}

export function getCompletions(fs: FsTree, cwd: string, line: string, fragment: string): string[] {
  const trimmed = line.trimStart();
  const parts = trimmed.split(/\s+/);
  const command = parts[0] ?? "";

  if (parts.length <= 1 && !line.includes(" ")) {
    return COMMAND_NAMES.filter((c) => c.startsWith(fragment));
  }

  if (command === "cd") {
    return completePath(fs, cwd, fragment, {
      includeFiles: false,
      includeDirs: true,
      dirTrailingSlash: true,
    });
  }

  if (command === "ll" || command === "ls") {
    const entries = listDir(fs, cwd);
    const names = entries.map((e) => (e.type === "dir" ? `${e.name}/` : e.name));
    return names.filter((n) => n.startsWith(fragment));
  }

  if (command === "cat" || command === "vi" || command === "vim") {
    return completePath(fs, cwd, fragment, {
      includeFiles: true,
      includeDirs: true,
      dirTrailingSlash: true,
    });
  }

  return [];
}

export function getGhostSuffix(fs: FsTree, cwd: string, line: string): string {
  const fragment = getCompletionFragment(line);
  if (!fragment || /\s$/.test(line)) return "";
  const matches = getCompletions(fs, cwd, line, fragment);
  if (!matches.length) return "";
  if (matches.length === 1) {
    const m = matches[0];
    return m.startsWith(fragment) ? m.slice(fragment.length) : "";
  }
  const prefix = longestCommonPrefix(matches);
  return prefix.length > fragment.length ? prefix.slice(fragment.length) : "";
}
