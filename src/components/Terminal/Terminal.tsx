import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CommandContext, FsTree, OutputLine, TerminalState } from "../../lib/types";
import { executeCommand } from "../../lib/executor";
import { getCompletions } from "../../lib/completion";
import { loadHistory, pushHistory, navigateHistory } from "../../lib/history";
import { hashToCommand, commandToHash } from "../../lib/hash";
import { Output } from "./Output";
import { InputLine } from "./InputLine";

interface Props {
  fs: FsTree;
}

async function loadArticle(path: string): Promise<string> {
  const res = await fetch(`/generated/articles/${path}.html`);
  if (!res.ok) throw new Error("load failed");
  return res.text();
}

async function search(query: string) {
  const pf = (window as Window & { pagefind?: { search: (q: string) => Promise<{ results: { data: () => Promise<{ url: string; excerpt: string }> }[] }> } }).pagefind;
  if (!pf) {
    return [];
  }
  const results = await pf.search(query);
  const items = await Promise.all(results.results.slice(0, 10).map((r) => r.data()));
  return items.map((d) => ({
    path: d.url.replace(/^\//, "").replace(/\.html$/, ""),
    excerpt: d.excerpt,
  }));
}

export function Terminal({ fs }: Props) {
  const [state, setState] = useState<TerminalState>({
    cwd: "~",
    history: loadHistory(),
    output: [],
  });
  const [input, setInput] = useState("");
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const ctx = useMemo<CommandContext>(
    () => ({ fs, loadArticle, search }),
    [fs],
  );

  const runInput = useCallback(
    async (raw: string) => {
      const currentState = stateRef.current;
      const result = executeCommand(currentState, raw, ctx);
      let output: OutputLine[] = result.output;
      let nextState = result.state;

      if (result.asyncOutput) {
        const asyncLines = await result.asyncOutput;
        output = [...output, ...asyncLines];
        nextState = { ...nextState, output: [...nextState.output, ...asyncLines] };
      }

      setState({
        ...nextState,
        history: pushHistory(currentState.history, raw),
      });
      setInput("");
      setHistIndex(null);

      const hash = commandToHash(raw);
      if (hash) window.location.hash = hash;
    },
    [ctx],
  );

  const runInputRef = useRef(runInput);
  runInputRef.current = runInput;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.output]);

  useEffect(() => {
    const cmd = hashToCommand(window.location.hash);
    if (cmd) void runInputRef.current(cmd);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind.js";
    script.type = "module";
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <Output lines={state.output} />
      <div ref={bottomRef} />
      <InputLine
        cwd={state.cwd}
        value={input}
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
          const fragment = input.split(/\s+/).pop() ?? input;
          const matches = getCompletions(fs, state.cwd, input, fragment);
          if (matches.length === 1) {
            const base = input.slice(0, input.length - fragment.length);
            setInput(base + matches[0]);
          }
        }}
      />
    </div>
  );
}
