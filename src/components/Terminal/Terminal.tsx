import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CommandContext, FsTree, TerminalState } from "../../lib/types";
import { executeCommand } from "../../lib/executor";
import { applyCompletion, getCompletionFragment, getCompletions, getGhostSuffix } from "../../lib/completion";
import { htmlToLines } from "../../lib/html-to-text";
import { loadHistory, pushHistory, navigateHistory } from "../../lib/history";
import { hashToCommand, commandToHash } from "../../lib/hash";
import { replaceLoadingLine } from "../../lib/loading";
import { isNearBottom, scrollBehaviorForOutput } from "../../lib/scroll";
import { pagefindSearch } from "../../lib/pagefind";
import { Output } from "./Output";
import { InputLine } from "./InputLine";
import { StatusBar } from "./StatusBar";
import { ViViewer, type ViSession } from "./ViViewer";

interface Props {
  fs: FsTree;
}

async function loadArticle(path: string): Promise<string> {
  const res = await fetch(`/generated/articles/${path}.html`);
  if (!res.ok) throw new Error("load failed");
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  const article = doc.querySelector("article");
  return article?.outerHTML ?? text;
}

export function Terminal({ fs }: Props) {
  const [state, setState] = useState<TerminalState>({
    cwd: "~",
    history: loadHistory(),
    output: [],
  });
  const [input, setInput] = useState("");
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const [viSession, setViSession] = useState<ViSession | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const ctx = useMemo<CommandContext>(
    () => ({ fs, loadArticle, search: pagefindSearch }),
    [fs],
  );

  const runInput = useCallback(
    async (raw: string) => {
      const currentState = stateRef.current;
      const result = executeCommand(currentState, raw, ctx);

      if (result.fullscreenAction) {
        const el = rootRef.current;
        if (el) {
          void (result.fullscreenAction === "enter"
            ? el.requestFullscreen?.()
            : document.exitFullscreen?.());
        }
      }

      if (result.openVi) {
        const path = result.openVi.path;
        setViSession({ path, lines: [], status: "loading" });
        setState({
          ...result.state,
          history: pushHistory(currentState.history, raw),
        });
        setInput("");
        setHistIndex(null);

        try {
          const html = await ctx.loadArticle(path);
          setViSession({ path, lines: htmlToLines(html), status: "ready" });
        } catch {
          setViSession({
            path,
            lines: [],
            status: "error",
            error: "Error: failed to load file",
          });
        }
        return;
      }

      const loadingLine = result.output.find((l) => l.kind === "loading");
      const loadingId = loadingLine?.kind === "loading" ? loadingLine.id : null;

      setState({
        ...result.state,
        history: pushHistory(currentState.history, raw),
      });
      setInput("");
      setHistIndex(null);

      const hash = commandToHash(raw);
      if (hash) window.location.hash = hash;

      if (result.asyncOutput) {
        const asyncLines = await result.asyncOutput;
        setState((prev) => ({
          ...prev,
          output: loadingId
            ? replaceLoadingLine(prev.output, loadingId, asyncLines)
            : [...prev.output, ...asyncLines],
        }));
      }
    },
    [ctx],
  );

  const runInputRef = useRef(runInput);
  runInputRef.current = runInput;

  useEffect(() => {
    const el = outputRef.current;
    if (!el || state.output.length === 0) return;
    const newLines = state.output.slice(-3);
    if (isNearBottom(el)) {
      el.scrollTo({ top: el.scrollHeight, behavior: scrollBehaviorForOutput(newLines) });
    }
  }, [state.output]);

  useEffect(() => {
    const cmd = hashToCommand(window.location.hash);
    if (cmd) void runInputRef.current(cmd);
  }, []);

  return (
    <div ref={rootRef} className="h-full flex flex-col bg-terminal-bg">
      {viSession ? (
        <ViViewer session={viSession} onQuit={() => setViSession(null)} />
      ) : (
        <>
          <Output
            lines={state.output}
            onRunCommand={(cmd) => void runInput(cmd)}
            onFocusInput={() => inputRef.current?.focus()}
            outputRef={outputRef}
          />
          <StatusBar cwd={state.cwd} postCount={fs.files.length} />
          <InputLine
            inputRef={inputRef}
            cwd={state.cwd}
            value={input}
            ghostSuffix={getGhostSuffix(fs, state.cwd, input)}
            onChange={setInput}
            onSubmit={() => void runInput(input)}
            onHistoryUp={() => {
              const idx = histIndex ?? state.history.length;
              const cmd = navigateHistory(state.history, -1, idx);
              if (cmd !== null) {
                setInput(cmd);
                setHistIndex(idx - 1);
              }
            }}
            onHistoryDown={() => {
              if (histIndex === null) return;
              const cmd = navigateHistory(state.history, 1, histIndex);
              if (cmd !== null) {
                setInput(cmd);
                setHistIndex(histIndex + 1);
              } else {
                setInput("");
                setHistIndex(null);
              }
            }}
            onTab={() => {
              const fragment = getCompletionFragment(input);
              const matches = getCompletions(fs, state.cwd, input, fragment);
              const next = applyCompletion(input, fragment, matches);
              if (next !== null) setInput(next);
            }}
          />
        </>
      )}
    </div>
  );
}
