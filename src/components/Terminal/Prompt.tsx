interface Props {
  cwd: string;
}

export function Prompt({ cwd }: Props) {
  return (
    <span className="font-mono text-sm whitespace-pre">
      <span className="text-terminal-green">visitor</span>
      <span className="text-terminal-text">@t2c:</span>
      <span className="text-terminal-blue">{cwd}</span>
      <span className="text-terminal-text">$ </span>
    </span>
  );
}
