import type { GrepMatch } from "../../../lib/types";
import { ClickablePath } from "./ClickablePath";

function HighlightExcerpt({ text, highlight }: { text: string; highlight: string }) {
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-terminal-text">{text.slice(idx, idx + highlight.length)}</mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}

interface Props {
  query: string;
  matches: GrepMatch[];
  onRunCommand: (cmd: string) => void;
}

export function GrepLine({ matches, onRunCommand }: Props) {
  if (!matches.length) {
    return <pre className="whitespace-pre-wrap text-terminal-text my-1">No matches found</pre>;
  }

  return (
    <div className="font-mono text-sm space-y-0.5 my-1">
      {matches.map((m, i) => (
        <div key={`${m.path}-${m.line}-${i}`} className="flex gap-1 flex-wrap">
          <ClickablePath
            label={`${m.path}:${m.line}:`}
            command={`cat ${m.path}`}
            className="text-terminal-text shrink-0"
            ariaLabel={`Read ${m.path}`}
            onRunCommand={onRunCommand}
          />
          <span className="text-terminal-text">
            <HighlightExcerpt text={m.excerpt} highlight={m.highlight} />
          </span>
        </div>
      ))}
      <p className="text-terminal-text/60 mt-1">
        {matches.length} match{matches.length === 1 ? "" : "es"} found
      </p>
    </div>
  );
}
