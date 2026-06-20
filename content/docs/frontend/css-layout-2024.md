---
title: "现代 CSS 布局：Flex 与 Grid 的分工"
date: 2024-06-22
tags: [css, frontend, layout]
description: "一维排布用 Flex，二维网格用 Grid，别再用 float 硬撑"
---

# 现代 CSS 布局：Flex 与 Grid 的分工

「这个居中怎么写」在 2024 年仍然高频出现，多半是因为 Flex 和 Grid 的职责没分清。两者不是替代关系，是**一维 vs 二维**的分工。

## 快速决策

```
只需要一行或一列对齐？     → Flexbox
需要行和列同时控制？       → Grid
文本绕图、报纸栏？         → 多数情况 Grid；简单绕排仍可用 float（少见）
终端 UI 全屏 + 底部输入栏？ → Flex column（t2c 同款）
```

## Flex：一维分布

经典「头尾固定、中间滚动」：

```css
.terminal-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh; /* 移动端地址栏友好 */
}

.terminal-output {
  flex: 1;
  min-height: 0; /* 关键：允许子元素在 flex 里收缩并 scroll */
  overflow-y: auto;
}

.terminal-input-row {
  flex-shrink: 0;
}
```

没有 `min-height: 0` 时，flex 子项默认 `min-height: auto`，内容会把容器撑破，滚动条出现在错误的位置——这是 flex 布局最常见的 bug。

常用对齐：

```css
.prompt-line {
  display: flex;
  align-items: baseline;
  gap: 0.5ch;
}

.prompt-input {
  flex: 1;
  min-width: 0;
}
```

## Grid：二维页面骨架

文档站、仪表盘：

```css
.page {
  display: grid;
  grid-template-columns: 16rem 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}

.sidebar { grid-row: 1 / -1; }
.header  { grid-column: 2; }
.main    { grid-column: 2; overflow: auto; }
.footer  { grid-column: 2; }
```

响应式用 `auto-fit` + `minmax`：

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}
```

## 居中 cheat sheet

```css
/* 单元素水平垂直居中 — Grid 最简 */
.center {
  display: grid;
  place-items: center;
}

/* 或 Flex */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 未知宽高的 modal */
.dialog {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
}
.dialog-panel {
  max-height: min(90dvh, 600px);
  overflow: auto;
}
```

## 间距：gap 优先于 margin hack

Flex 和 Grid 都支持 `gap`。列表、按钮组、表单行优先 `gap`，少写 `:last-child { margin: 0 }`。

## 容器查询（Container Queries）

组件级响应式，比纯 viewport 断点更准：

```css
.article-card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .article-card-inner {
    display: grid;
    grid-template-columns: 120px 1fr;
  }
}
```

侧边栏宽度变化时，卡片布局跟着变，而不是只看 `768px` 媒体查询。

## 和 Tailwind 的关系

t2c 用 Tailwind  utility 表达上述模式：

```
flex flex-col h-dvh
flex-1 min-h-0 overflow-y-auto
grid grid-cols-[16rem_1fr] gap-4
```

理解原生 CSS 语义后，Tailwind 只是 shorthand；调试时在 DevTools 里临时改 `flex`/`grid` 属性更快。

## 小结

Flex 管「一条线上的分配与对齐」；Grid 管「整张页面的区域划分」。终端 UI、表单、toolbar 用 Flex；页面骨架、卡片矩阵用 Grid。记住 `min-height: 0` 和 `min-width: 0`，能少踩一半 scroll 相关的坑。
