import type { LlEntry } from "../../../lib/types";
import { ClickablePath } from "./ClickablePath";

interface Props {
  entries: LlEntry[];
  onRunCommand: (cmd: string) => void;
}

export function LlLine({ entries, onRunCommand }: Props) {
  return (
    <div className="font-mono text-sm space-y-0.5 my-1">
      {entries.map((e) => (
        <div key={e.name} className="flex gap-2 flex-wrap">
          <span className="text-terminal-text/40 shrink-0">
            {e.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--"}
          </span>
          {e.type === "file" && e.date && (
            <span className="text-terminal-text/60 shrink-0">{e.date}</span>
          )}
          <ClickablePath
            label={e.type === "dir" ? `${e.name}/` : e.name}
            command={e.type === "dir" ? `cd ${e.arg}` : `cat ${e.arg}`}
            className={e.type === "dir" ? "text-terminal-blue" : "text-terminal-text"}
            ariaLabel={e.type === "dir" ? `Open directory ${e.name}` : `Read file ${e.name}`}
            onRunCommand={onRunCommand}
          />
        </div>
      ))}
    </div>
  );
}
