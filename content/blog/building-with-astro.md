---
title: "用 Astro 构建静态终端博客"
date: 2024-05-12
tags: [astro, static-site]
description: "t2c 的技术选型与构建流程"
---

# 用 Astro 构建静态终端博客

t2c 是一个纯静态站点：没有 API、没有数据库、没有服务器运行时。所有「智能」都在构建时完成，浏览器里只剩下 fetch 和 React 状态。

## 为什么选 Astro

Astro 的内容优先模型和 Markdown 博客天然契合：

1. **构建时处理 Markdown** — frontmatter 解析、HTML 预渲染、代码高亮一次完成
2. **按需 hydration** — 只有终端 UI 需要 React，其余页面几乎是纯 HTML
3. **集成简单** — 自定义 integration 扫描 `content/` 生成虚拟文件系统

```typescript
// 构建时生成 fs-tree.json 和预渲染文章 HTML
export function contentBuilder(): AstroIntegration {
  return {
    name: "content-builder",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        await processContent("content", dir);
      },
    },
  };
}
```

## 内容即数据

`content/` 目录就是整个站点的数据源：

```
content/
├── blog/           # 按时间线的文章
├── docs/           # 按目录组织的文档
└── about.md        # 关于页
```

构建插件 `walkDir` 递归扫描，为每篇 `.md` 生成：

- 加入 `fs-tree.json` 的节点（供 `ll`、`cd` 使用）
- 独立 HTML 片段（供 `cat` / `vi` 懒加载）

## 搜索：Pagefind

全文搜索不能靠运行时数据库。Pagefind 在 `astro build` 之后索引静态 HTML，输出到 `public/pagefind/`，`grep` 命令在客户端调用其 JS API。

零后端、零配置服务器，部署到 Vercel 或 GitHub Pages 即可。

## 本地开发

```bash
npm run dev    # Astro dev server
npm test       # Vitest 测命令逻辑
npm run build  # 生产构建 + Pagefind 索引
```

命令系统的单元测试和 UI 分离：parser、executor、completion 都可以在无浏览器环境下跑通。这是静态站点 + 薄客户端架构的好处——**可测的业务逻辑留在 lib/ 里**，React 只负责渲染。
