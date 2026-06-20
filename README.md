# t2c

Terminal-style Markdown blog. Browse with shell commands: `ll`, `cat`, `cd`, `timeline`, `grep`.

## Development

```bash
npm install
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| ll      | List current directory |
| cat     | Read a markdown file |
| cd      | Change directory |
| timeline| All posts by date |
| grep    | Full-text search |

## Content

Add `.md` files to `content/` with frontmatter (title, date required).

Note: `grep` requires a production build with Pagefind (`npm run build && npx pagefind --site dist --glob "**/*.html"`). In dev mode, grep returns no matches.
