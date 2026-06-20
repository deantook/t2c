import { useRef, useEffect, type KeyboardEvent } from "react";
import { Prompt } from "./Prompt";

interface Props {
  cwd: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onHistoryUp: () => void;
  onHistoryDown: () => void;
  onTab: () => void;
}

export function InputLine({
  cwd,
  value,
  onChange,
  onSubmit,
  onHistoryUp,
  onHistoryDown,
  onTab,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onHistoryUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onHistoryDown();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onTab();
    }
  }

  return (
    <div className="flex items-center px-4 py-2 border-t border-terminal-codeBg">
      <Prompt cwd={cwd} />
      <input
        ref={ref}
        className="flex-1 bg-transparent outline-none font-mono text-sm text-terminal-text caret-terminal-green"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        aria-label="Terminal input"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
