import type { TimelineEntry } from "../../../lib/types";
import { ClickablePath } from "./ClickablePath";

interface Props {
  entries: TimelineEntry[];
  onRunCommand: (cmd: string) => void;
}

export function TimelineLine({ entries, onRunCommand }: Props) {
  return (
    <div className="font-mono text-sm space-y-0.5 my-1">
      {entries.map((e) => (
        <div key={e.path} className="flex gap-2 min-w-0">
          <span className="text-terminal-text/60 shrink-0">{e.date}</span>
          <ClickablePath
            label={e.path}
            command={`cat ${e.path}`}
            className="text-terminal-text shrink-0"
            ariaLabel={`Read ${e.path}`}
            onRunCommand={onRunCommand}
          />
          <span className="text-terminal-text/80 ml-auto shrink-0 pl-4">{e.title}</span>
        </div>
      ))}
    </div>
  );
}
