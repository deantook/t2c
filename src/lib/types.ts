export type FsNodeType = "file" | "dir";

export interface FsFile {
  name: string;
  type: "file";
  path: string;
  title: string;
  date: string;
  description?: string;
}

export interface FsDir {
  name: string;
  type: "dir";
  children: FsNode[];
}

export type FsNode = FsFile | FsDir;

export interface FsTree {
  root: FsDir;
  files: FsFile[];
}

export type OutputKind = OutputLine["kind"];

export interface LlEntry {
  type: "dir" | "file";
  name: string;
  /** Argument for cd/cat relative to listing cwd, e.g. "frontend" or "about.md" */
  arg: string;
  date?: string;
  title?: string;
}

export interface TimelineEntry {
  date: string;
  path: string;
  title: string;
}

export interface GrepMatch {
  path: string;
  line: number;
  excerpt: string;
  highlight: string;
}

export interface WelcomeShortcut {
  label: string;
  command: string;
}

export type OutputLine =
  | { kind: "command-echo"; input: string; cwd: string }
  | { kind: "text"; content: string }
  | { kind: "error"; content: string; hint?: string }
  | { kind: "loading"; message: string; id: string }
  | { kind: "ll"; entries: LlEntry[] }
  | { kind: "timeline"; entries: TimelineEntry[] }
  | { kind: "grep"; query: string; matches: GrepMatch[] }
  | { kind: "article"; path: string; date: string; title: string; html: string };

export interface TerminalState {
  cwd: string;
  history: string[];
  output: OutputLine[];
}

export interface CommandContext {
  fs: FsTree;
  loadArticle: (path: string) => Promise<string>;
  search: (query: string) => Promise<SearchResult[] | null>;
}

export interface SearchResult {
  path: string;
  excerpt: string;
  line?: number;
}

export interface CommandResult {
  state: TerminalState;
  output: OutputLine[];
  asyncOutput?: Promise<OutputLine[]>;
  /** When true, discard prior output instead of appending */
  replaceOutput?: boolean;
  /** Open file in vi read-only viewer */
  openVi?: { path: string };
  /** Enter or exit browser fullscreen */
  fullscreenAction?: "enter" | "exit";
}

export interface ParsedCommand {
  command: string;
  args: string[];
}
