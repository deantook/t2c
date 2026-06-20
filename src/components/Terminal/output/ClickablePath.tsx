interface Props {
  label: string;
  command: string;
  className?: string;
  ariaLabel: string;
  onRunCommand: (cmd: string) => void;
}

export function ClickablePath({ label, command, className = "", ariaLabel, onRunCommand }: Props) {
  return (
    <button
      type="button"
      className={`font-mono hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green ${className}`}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onRunCommand(command);
      }}
    >
      {label}
    </button>
  );
}
