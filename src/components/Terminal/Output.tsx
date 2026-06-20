import type { RefObject } from "react";
import type { OutputLine } from "../../lib/types";
import { Welcome } from "./Welcome";
import { CommandEchoLine } from "./output/CommandEchoLine";
import { LlLine } from "./output/LlLine";
import { TimelineLine } from "./output/TimelineLine";
import { GrepLine } from "./output/GrepLine";
import { ArticleLine } from "./output/ArticleLine";
import { ErrorLine } from "./output/ErrorLine";
import { LoadingLine } from "./output/LoadingLine";

interface Props {
  lines: OutputLine[];
  onRunCommand: (cmd: string) => void;
  onFocusInput: () => void;
  outputRef?: RefObject<HTMLDivElement | null>;
}

export function Output({ lines, onRunCommand, onFocusInput, outputRef }: Props) {
  return (
    <div
      ref={outputRef}
      role="log"
      aria-live="polite"
      className="flex-1 overflow-y-auto p-4 font-mono text-sm text-terminal-text"
      onClick={onFocusInput}
    >
      {lines.length === 0 && <Welcome onRunCommand={onRunCommand} />}
      {lines.map((line, i) => {
        switch (line.kind) {
          case "command-echo":
            return <CommandEchoLine key={i} input={line.input} cwd={line.cwd} />;
          case "ll":
            return <LlLine key={i} entries={line.entries} onRunCommand={onRunCommand} />;
          case "timeline":
            return <TimelineLine key={i} entries={line.entries} onRunCommand={onRunCommand} />;
          case "grep":
            return (
              <GrepLine
                key={i}
                query={line.query}
                matches={line.matches}
                onRunCommand={onRunCommand}
              />
            );
          case "article":
            return (
              <ArticleLine
                key={i}
                path={line.path}
                date={line.date}
                title={line.title}
                html={line.html}
              />
            );
          case "error":
            return <ErrorLine key={i} content={line.content} hint={line.hint} />;
          case "loading":
            return <LoadingLine key={i} message={line.message} />;
          case "text":
            return (
              <pre key={i} className="whitespace-pre-wrap text-terminal-text my-1">
                {line.content}
              </pre>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
