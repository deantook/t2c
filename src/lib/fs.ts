import type { FsDir, FsFile, FsNode, FsTree } from "./types";

export function normalizeCwd(cwd: string): string {
  if (cwd === "~") return "";
  return cwd.startsWith("~/") ? cwd.slice(2) : cwd;
}

export function toDisplayPath(internal: string): string {
  return internal === "" ? "~" : `~/${internal}`;
}

export function resolvePath(cwd: string, target: string): string {
  if (target === "" || target === "~") return "~";
  const base = normalizeCwd(cwd);
  const parts = target.startsWith("~/")
    ? target.slice(2).split("/")
    : [...(base ? base.split("/") : []), ...target.split("/")];

  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return toDisplayPath(stack.join("/"));
}

function getNodeAtPath(root: FsDir, path: string): FsNode | null {
  const segments = path ? path.split("/") : [];
  let current: FsNode = root;
  for (const seg of segments) {
    if (current.type !== "dir") return null;
    const next = current.children.find((c) => c.name === seg);
    if (!next) return null;
    current = next;
  }
  return current;
}

export function getDirNode(fs: FsTree, cwd: string): FsDir | null {
  const node = getNodeAtPath(fs.root, normalizeCwd(cwd));
  return node?.type === "dir" ? node : null;
}

export function listDir(fs: FsTree, cwd: string): FsNode[] {
  const dir = getDirNode(fs, cwd);
  if (!dir) return [];
  return [...dir.children].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function findFile(fs: FsTree, cwd: string, name: string): FsFile | null {
  const byPath = fs.files.find((f) => f.path === name || f.path === `${normalizeCwd(cwd)}/${name}`.replace(/^\//, ""));
  if (byPath) return byPath;
  const dir = normalizeCwd(cwd);
  const local = dir ? `${dir}/${name}` : name;
  return fs.files.find((f) => f.path === local || f.name === name) ?? null;
}

export function getAllFilesSorted(fs: FsTree): FsFile[] {
  return [...fs.files].sort((a, b) => b.date.localeCompare(a.date));
}
