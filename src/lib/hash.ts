export function hashToCommand(hash: string): string | null {
  const h = hash.replace(/^#/, "");
  const catMatch = h.match(/^cat\/(.+\.md)$/);
  if (catMatch) return `cat ${catMatch[1]}`;
  const cdMatch = h.match(/^cd\/(.+)$/);
  if (cdMatch) return `cd ${cdMatch[1]}`;
  return null;
}

export function commandToHash(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("cat ")) {
    const path = trimmed.slice(4).trim();
    return `#cat/${path}`;
  }
  if (trimmed.startsWith("cd ")) {
    const path = trimmed.slice(3).trim();
    return `#cd/${path}`;
  }
  return null;
}
