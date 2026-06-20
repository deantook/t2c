interface Props {
  path: string;
  date: string;
  title: string;
  html: string;
}

export function ArticleLine({ path, date, title, html }: Props) {
  return (
    <div className="article-block border-l-2 border-terminal-green/30 pl-4 my-4 max-w-3xl">
      <div className="article-meta text-xs text-terminal-green/60 mb-2 font-mono">
        {path} · {date} · {title}
      </div>
      <div className="terminal-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
