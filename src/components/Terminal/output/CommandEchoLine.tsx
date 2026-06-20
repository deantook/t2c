import { Prompt } from "../Prompt";

interface Props {
  input: string;
  cwd: string;
}

export function CommandEchoLine({ input, cwd }: Props) {
  return (
    <div className="flex items-center font-mono text-sm">
      <Prompt cwd={cwd} />
      <span className="text-terminal-text">{input}</span>
    </div>
  );
}
