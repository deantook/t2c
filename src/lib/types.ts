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

export type OutputKind = "text" | "error" | "html" | "command-echo";

export interface OutputLine {
  kind: OutputKind;
  content: string;
}

export interface TerminalState {
  cwd: string;
  history: string[];
  output: OutputLine[];
}

export interface CommandContext {
  fs: FsTree;
  loadArticle: (path: string) => Promise<string>;
  search: (query: string) => Promise<SearchResult[]>;
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
