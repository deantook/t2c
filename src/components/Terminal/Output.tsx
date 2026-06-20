import type { OutputLine } from "../../lib/types";

interface Props {
  lines: OutputLine[];
}

export function Output({ lines }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-terminal-text">
      {lines.length === 0 && (
        <div className="mb-4">
          <p>Welcome to t2c</p>
          <p className="text-terminal-green/80">Type &apos;help&apos; for available commands.</p>
        </div>
      )}
      {lines.map((line, i) => {
        if (line.kind === "command-echo") {
          return (
            <div key={i} className="flex">
              <span className="text-terminal-text">{line.content}</span>
            </div>
          );
        }
        if (line.kind === "html") {
          return (
            <div
              key={i}
              className="terminal-prose my-2"
              dangerouslySetInnerHTML={{ __html: line.content }}
            />
          );
        }
        const color = line.kind === "error" ? "text-terminal-red" : "text-terminal-text";
        return (
          <pre key={i} className={`whitespace-pre-wrap ${color}`}>
            {line.content}
          </pre>
        );
      })}
    </div>
  );
}
