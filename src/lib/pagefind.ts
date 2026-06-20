type PagefindModule = {
  init: () => Promise<void>;
  search: (query: string) => Promise<{
    results: { data: () => Promise<{ url: string; excerpt: string }> }[];
  }>;
};

let pagefindPromise: Promise<PagefindModule | null> | null = null;

export function pagefindUrlToContentPath(url: string): string {
  let path = url.replace(/^\//, "").replace(/\.html$/, "");
  const prefix = "generated/articles/";
  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length);
  }
  return path;
}

export function loadPagefind(): Promise<PagefindModule | null> {
  if (pagefindPromise) return pagefindPromise;

  pagefindPromise = (async () => {
    if (typeof window === "undefined") return null;
    try {
      const url = `${window.location.origin}/pagefind/pagefind.js`;
      const pf = (await import(/* @vite-ignore */ url)) as PagefindModule;
      await pf.init();
      return pf;
    } catch {
      return null;
    }
  })();

  return pagefindPromise;
}

export async function pagefindSearch(
  query: string,
): Promise<{ path: string; excerpt: string }[] | null> {
  const pf = await loadPagefind();
  if (!pf) return null;

  const results = await pf.search(query);
  const items = await Promise.all(results.results.slice(0, 10).map((r) => r.data()));
  return items.map((d) => ({
    path: pagefindUrlToContentPath(d.url),
    excerpt: d.excerpt,
  }));
}
