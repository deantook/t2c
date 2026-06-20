import { getLastRead } from "../../lib/last-read";
import { ClickablePath } from "./output/ClickablePath";

const ASCII_LOGO = `  ████████╗ ██████╗ ██████╗
  ╚══██╔══╝╚═██╔═╝╚════██╗
     ██║     ██║    █████╔╝
     ██║     ██║   ██╔═══╝
     ██║     ██║   ███████╗
     ╚═╝     ╚═╝   ╚══════╝`;

const SHORTCUTS = [
  { label: "timeline", command: "timeline" },
  { label: "ll blog", command: "ll blog" },
  { label: "grep astro", command: "grep astro" },
  { label: "about", command: "about" },
];

interface Props {
  onRunCommand: (cmd: string) => void;
}

export function Welcome({ onRunCommand }: Props) {
  const lastRead = getLastRead();
  return (
    <div className="mb-4 font-mono text-sm">
      <pre className="text-terminal-green whitespace-pre leading-tight">{ASCII_LOGO}</pre>
      <p className="mt-3 text-terminal-text/80">terminal-to-content · type &apos;help&apos; for commands</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SHORTCUTS.map((s) => (
          <ClickablePath
            key={s.command}
            label={`[ ${s.label} ]`}
            command={s.command}
            className="text-terminal-green"
            ariaLabel={`Run ${s.command}`}
            onRunCommand={onRunCommand}
          />
        ))}
      </div>
      {lastRead && (
        <p className="mt-3 text-terminal-text/60">
          Continue reading:{" "}
          <ClickablePath
            label={lastRead}
            command={`cat ${lastRead}`}
            className="text-terminal-link"
            ariaLabel={`Continue reading ${lastRead}`}
            onRunCommand={onRunCommand}
          />
        </p>
      )}
    </div>
  );
}
