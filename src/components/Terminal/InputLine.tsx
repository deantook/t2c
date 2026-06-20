import { useRef, useEffect, type KeyboardEvent, type RefObject } from "react";
import { Prompt } from "./Prompt";

interface Props {
  cwd: string;
  value: string;
  ghostSuffix: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onHistoryUp: () => void;
  onHistoryDown: () => void;
  onTab: () => void;
}

export function InputLine({
  cwd,
  value,
  ghostSuffix,
  inputRef: externalRef,
  onChange,
  onSubmit,
  onHistoryUp,
  onHistoryDown,
  onTab,
}: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

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
    <div className="sticky bottom-0 z-10 flex items-center px-4 py-2 border-t border-terminal-codeBg bg-terminal-bg pb-[env(safe-area-inset-bottom)]">
      <Prompt cwd={cwd} />
      <div className="relative flex-1 min-w-0 flex items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center font-mono text-sm overflow-hidden"
        >
          <span className="invisible whitespace-pre">{value}</span>
          <span className="text-terminal-text/30 whitespace-pre">{ghostSuffix}</span>
        </div>
        <input
          ref={ref}
          className="relative w-full bg-transparent outline-none font-mono text-sm text-terminal-text caret-terminal-green"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          aria-label="Terminal input"
          autoComplete="off"
          spellCheck={false}
        />
        {!value && (
          <span
            aria-hidden="true"
            className="cursor-blink ml-px inline-block w-0.5 h-4 bg-terminal-green shrink-0"
          />
        )}
      </div>
    </div>
  );
}
