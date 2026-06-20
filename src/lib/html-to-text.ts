/** Convert pre-rendered article HTML into plain text lines for vi display. */
export function htmlToLines(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const article = doc.querySelector("article") ?? doc.body;
  const text = article.innerText || walkBlockText(article);
  return text.split("\n").map((line) => line.trimEnd());
}

function walkBlockText(root: Element): string {
  const blockTags = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "PRE", "BLOCKQUOTE"]);
  const lines: string[] = [];

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (blockTags.has(el.tagName)) {
      const text = el.textContent?.trim();
      if (text) lines.push(text);
      return;
    }
    el.childNodes.forEach(visit);
  }

  visit(root);
  return lines.join("\n");
}
