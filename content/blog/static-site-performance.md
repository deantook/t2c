---
title: "静态站点性能优化清单"
date: 2024-09-10
tags: [performance, static-site, astro]
description: "构建时优化、传输体积与运行时交互的平衡"
---

# 静态站点性能优化清单

静态站不等于「天然快」。HTML 可以预生成，但如果首屏塞了 500KB JavaScript、字体阻塞渲染、搜索索引在冷启动时全量下载，体验照样拉胯。t2c 这类「薄客户端 + 重内容」站点，优化重点和传统 SPA 不太一样。

## 构建时分工

| 工作 | 构建时 | 运行时 |
|-----|--------|--------|
| Markdown → HTML | ✅ | |
| 代码高亮 | ✅ Shiki | |
| 全文索引 | ✅ Pagefind | 客户端查询 |
| 目录树 JSON | ✅ fs-tree.json | fetch 一次 |
| 终端 UI 交互 | | ✅ React hydration |

原则：**能 build 时算完的，不要留给浏览器**。`cat` 加载的是预渲染 HTML 片段，不是运行时 markdown-it。

## 体积预算

给自己设硬上限，超了再砍功能：

```
首屏 JS (gzip)     ≤ 80 KB
单篇文章 HTML      ≤ 100 KB（不含图片）
fs-tree.json       ≤ 50 KB（文章多了考虑分片）
Pagefind 索引      按需加载，不阻塞首屏
```

检查方式：

```bash
npm run build
npx vite-bundle-visualizer   # 或 rollup-plugin-visualizer
ls -lh dist/_astro/*.js
```

## 字体策略

等宽字体是终端 UI 的灵魂，也是 LCP 的敌人：

```css
/* 先用系统 monospace 占位，webfont 加载后 swap */
font-family: "JetBrains Mono", ui-monospace, monospace;
```

- 只 subset 用到的字符（拉丁 + 常用标点），中文正文若不用 mono 则不必打进 mono 字体
- `font-display: swap`
- 预加载仅当字体确实是 LCP 元素时

## 懒加载与 prefetch

t2c 的模式：

1. 首屏：终端 shell + fs-tree
2. 用户 `cat article.md` 时才 fetch 该文 HTML
3. Tab 补全命中过的路径可以 `prefetch`（可选，注意移动端流量）

```typescript
async function loadArticle(path: string): Promise<string> {
  const res = await fetch(`/generated/articles/${path}.html`);
  if (!res.ok) throw new Error(`missing: ${path}`);
  return res.text();
}
```

切忌在 mount 时预拉全部文章——文章一多，初始流量线性爆炸。

## Pagefind 与 grep

Pagefind 索引在 `build` 后生成，体积随内容增长。优化点：

- 只对需要搜索的 HTML 建索引（排除 404、redirect 页）
- 生产环境才启用；dev 模式 grep 无结果是预期行为
- 搜索结果展示 title + excerpt，不要一次拉全文

## Core Web Vitals 对照

| 指标 | 静态站常见瓶颈 | 对策 |
|-----|---------------|------|
| LCP | 大字体、hero 图 | swap、responsive image、CDN |
| INP | 终端输入、长列表渲染 | 虚拟列表、debounce、Web Worker（极端场景） |
| CLS | 字体 swap、动态插入内容 | 固定输入区高度、预留 scroll 区域 |

## 缓存头

静态资源带 hash 文件名 → `Cache-Control: immutable, max-age=31536000`  
`index.html` → `max-age=0, must-revalidate` 或短 TTL，保证部署后用户拿到新入口。

## 小结

静态站的性能优势来自**没有服务器往返**，不是来自「少写代码」。构建时预渲染、运行时按需加载、体积预算三件事做到位，比盲目上 SSR 或边缘函数更有效。
