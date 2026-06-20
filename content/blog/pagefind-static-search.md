---
title: "静态站全文搜索：Pagefind 实践"
date: 2024-07-18
tags: [search, pagefind]
description: "在无后端的静态站点里实现 grep 级全文搜索"
---

# 静态站全文搜索：Pagefind 实践

传统博客的搜索要么依赖服务端（Elasticsearch、数据库 LIKE），要么退化为客户端按标题过滤。Pagefind 提供了第三条路：**构建时索引，运行时纯静态查询**。

## 工作流程

```
astro build
    ↓
生成静态 HTML（含文章内容）
    ↓
pagefind --site dist
    ↓
输出索引到 dist/pagefind/
    ↓
部署；浏览器加载 pagefind.js 搜索
```

索引和站点一起部署，不增加运行时成本。

## t2c 中的集成

终端里的 `grep` 命令是对 Pagefind 的薄封装：

```typescript
async function search(query: string) {
  const pf = window.pagefind;
  if (!pf) return [];
  const results = await pf.search(query);
  // 取前 10 条，映射为 path + excerpt
}
```

用户输入 `grep concurrency`，看到的是匹配片段和文件路径——和 `grep -r` 的输出风格 intentionally 接近。

## 局限

- **仅索引构建产物**：本地 `npm run dev` 时若没有跑过 build + pagefind，搜索不可用
- **中文分词**：Pagefind 对 CJK 的支持取决于配置和版本，长句搜索效果可能不如专门的中文引擎
- **无排名定制**：默认 TF-IDF 式相关性，不能像 Algolia 那样调权重

## 何时够用

个人博客、技术文档站、内部知识库——内容量在几千篇以内、更新频率不高、预算为零。这正是 t2c 的场景。

如果未来需要更好的中文搜索，可以换索引后端，但 `grep` 命令的接口可以保持不变：用户只关心「输入关键词，得到文件列表」。
