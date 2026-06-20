interface Props {
  cwd: string;
  postCount: number;
}

export function StatusBar({ cwd, postCount }: Props) {
  const hints =
    typeof window !== "undefined" && window.innerWidth < 640
      ? "Tab · ↑↓ · fs"
      : "Tab complete · ↑↓ history · fs fullscreen";

  return (
    <div className="shrink-0 text-xs text-terminal-green/60 px-4 py-1 border-t border-terminal-codeBg bg-terminal-bg">
      {cwd} · {postCount} posts · {hints}
    </div>
  );
}
