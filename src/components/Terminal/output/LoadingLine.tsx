interface Props {
  message: string;
}

export function LoadingLine({ message }: Props) {
  return (
    <p className="text-terminal-green/80 font-mono text-sm my-1" aria-busy="true">
      {message}
    </p>
  );
}
