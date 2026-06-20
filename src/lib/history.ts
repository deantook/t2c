const KEY = "t2c-command-history";
const MAX = 100;

export function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(history: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX)));
}

export function pushHistory(history: string[], command: string): string[] {
  if (!command.trim()) return history;
  const next = [...history, command];
  saveHistory(next);
  return next;
}

export function navigateHistory(history: string[], direction: -1 | 1, index: number): string | null {
  const next = index + direction;
  if (next < 0 || next >= history.length) return null;
  return history[next];
}
