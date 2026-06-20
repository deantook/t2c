import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { parseExCommand } from "../../lib/vi-ex";

export interface ViSession {
  path: string;
  lines: string[];
  status: "loading" | "ready" | "error";
  error?: string;
}

interface Props {
  session: ViSession;
  onQuit: () => void;
}

export function ViViewer({ session, onQuit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cmdLine, setCmdLine] = useState("");
  const [cmdMode, setCmdMode] = useState(false);
  const [cmdError, setCmdError] = useState<string | null>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!cmdError) return;
    const id = window.setTimeout(() => setCmdError(null), 2500);
    return () => window.clearTimeout(id);
  }, [cmdError]);

  function submitCommand() {
    const result = parseExCommand(cmdLine);
    if (result.action === "quit") {
      onQuit();
      return;
    }
    setCmdError(result.message);
    setCmdLine("");
    setCmdMode(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (session.status !== "ready") return;

    if (cmdMode) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitCommand();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCmdLine("");
        setCmdMode(false);
        setCmdError(null);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (cmdLine.length <= 1) {
          setCmdLine("");
          setCmdMode(false);
        } else {
          setCmdLine((line) => line.slice(0, -1));
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setCmdLine((line) => line + e.key);
      }
      return;
    }

    if (e.key === ":") {
      e.preventDefault();
      setCmdMode(true);
      setCmdLine(":");
      setCmdError(null);
    }
  }

  const lineCount = session.lines.length;
  const gutterWidth = Math.max(4, String(lineCount).length + 1);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full flex flex-col bg-terminal-bg outline-none font-mono text-sm text-terminal-text"
      aria-label={`vi viewing ${session.path}`}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {session.status === "loading" && (
          <p className="text-terminal-green/80">Reading {session.path}...</p>
        )}
        {session.status === "error" && (
          <p className="text-terminal-red">{session.error ?? "Error: failed to load file"}</p>
        )}
        {session.status === "ready" &&
          session.lines.map((line, i) => (
            <div key={i} className="flex leading-relaxed">
              <span
                className="select-none text-terminal-green/55 pr-3 text-right shrink-0"
                style={{ minWidth: `${gutterWidth}ch` }}
              >
                {i + 1}
              </span>
              <span className="whitespace-pre-wrap break-all">{line || " "}</span>
            </div>
          ))}
      </div>

      <div className="border-t border-terminal-codeBg px-4 py-1 text-terminal-green/60 text-xs">
        {session.path} [readonly] {lineCount}L
        {cmdError && <span className="text-terminal-red ml-4">{cmdError}</span>}
      </div>

      {cmdMode && (
        <div className="border-t border-terminal-codeBg px-4 py-2 flex items-center">
          <span className="text-terminal-text">{cmdLine}</span>
          <span className="cursor-blink ml-px inline-block w-2 h-4 bg-terminal-green align-middle" />
        </div>
      )}

      {!cmdMode && session.status === "ready" && (
        <div className="border-t border-terminal-codeBg px-4 py-1 text-terminal-green/40 text-xs">
          -- READONLY -- press : then q to quit
        </div>
      )}
    </div>
  );
}
