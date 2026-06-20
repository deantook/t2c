const KEY = "t2c:last-read";

export function getLastRead(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastRead(path: string): void {
  try {
    localStorage.setItem(KEY, path);
  } catch {
    // ignore quota errors
  }
}
