interface Props {
  content: string;
  hint?: string;
}

export function ErrorLine({ content, hint }: Props) {
  return (
    <div className="my-1 font-mono text-sm">
      <pre className="whitespace-pre-wrap text-terminal-red">{content}</pre>
      {hint && <p className="text-terminal-text/50 text-xs mt-0.5">{hint}</p>}
    </div>
  );
}
