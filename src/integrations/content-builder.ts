import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { createHighlighter } from "shiki";
import type { AstroIntegration } from "astro";

interface RawFile {
  relativePath: string;
  title: string;
  date: string;
  description?: string;
  html: string;
}

function walkDir(dir: string, base: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, base, acc);
    else if (entry.name.endsWith(".md")) acc.push(path.relative(base, full));
  }
  return acc;
}

function buildTree(files: RawFile[]) {
  const root = { name: "~", type: "dir" as const, children: [] as any[] };
  const flat: any[] = [];

  for (const file of files) {
    flat.push({
      name: path.basename(file.relativePath),
      type: "file",
      path: file.relativePath.replace(/\\/g, "/"),
      title: file.title,
      date: file.date,
      description: file.description,
    });

    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        current.children.push({
          name: part,
          type: "file",
          path: normalizedPath,
          title: file.title,
          date: file.date,
          description: file.description,
        });
      } else {
        let child = current.children.find((c: any) => c.name === part && c.type === "dir");
        if (!child) {
          child = { name: part, type: "dir", children: [] };
          current.children.push(child);
        }
        current = child;
      }
    }
  }

  return { root, files: flat };
}

async function processContent(contentDir: string, outDir: string) {
  const files = walkDir(contentDir, contentDir);
  const highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: ["javascript", "jsx", "typescript", "tsx", "bash", "markdown", "json"],
  });

  const processed: RawFile[] = [];
  for (const rel of files) {
    const raw = fs.readFileSync(path.join(contentDir, rel), "utf-8");
    const { data, content } = matter(raw);
    if (data.draft === true) continue;

    const title = String(data.title ?? path.basename(rel, ".md"));
    const date =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date ?? "1970-01-01");
    const htmlBody = marked.parse(content) as string;
    const article = `<article class="terminal-prose" data-pagefind-body>${htmlBody}</article>`;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${title}</title></head>
<body>${article}</body>
</html>`;

    processed.push({
      relativePath: rel.replace(/\\/g, "/"),
      title,
      date,
      description: data.description ? String(data.description) : undefined,
      html,
    });
  }

  const tree = buildTree(processed);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "articles"), { recursive: true });

  fs.writeFileSync(path.join(outDir, "fs-tree.json"), JSON.stringify(tree, null, 2));

  for (const file of processed) {
    const outPath = path.join(outDir, "articles", `${file.relativePath}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, file.html);
  }
}

export function contentBuilder(): AstroIntegration {
  return {
    name: "content-builder",
    hooks: {
      "astro:config:done": async ({ config }) => {
        const contentDir = path.join(config.root.pathname, "content");
        const outDir = path.join(config.root.pathname, "public/generated");
        if (fs.existsSync(contentDir)) {
          await processContent(contentDir, outDir);
        }
      },
    },
  };
}
