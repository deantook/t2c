---
title: "Git 分支与工作流"
date: 2024-06-15
tags: [git, devops]
description: "feature 分支、worktree 与合并策略"
---

# Git 分支与工作流

单人项目可以只在 `main` 上开发；功能变复杂后，隔离分支和 worktree 能避免半成品污染主分支。

## 基础分支模型

```
main          ← 可部署的稳定线
  └── feat/x  ← 单个功能或实验
```

规则尽量简单：

- `main` 始终能 build、能 deploy
- feature 分支生命周期短，合并后删除
- 不在 `main` 上直接做大规模重构

## Git Worktree

需要在两个分支上同时工作时，worktree 比 stash 来回切换更干净：

```bash
git worktree add .worktrees/feat-vi -b feat/vi
cd .worktrees/feat-vi
npm install && npm test
# 开发完成后合并回 main
git checkout main
git merge feat/vi
git worktree remove .worktrees/feat-vi
git branch -d feat/vi
```

`.worktrees/` 应加入 `.gitignore`，避免误提交 worktree 目录内容。

## 提交信息

遵循 Conventional Commits 便于日后生成 changelog：

```
feat: add vi command with read-only viewer
fix: tab completion for nested paths
docs: add redis cache patterns article
```

动词用祈使语气（add / fix / docs），第一行 ≤ 72 字符。

## 合并 vs Rebase

| 场景 | 建议 |
|-----|------|
| 自己的 feature → main | merge 或 squash merge 均可 |
| 同步 main 到 feature | `rebase main` 保持线性历史 |
| 已 push 的公共分支 | 避免 rebase，用 merge |

## 发布

静态站（如 t2c）的「发布」就是 push 触发 CI build。确保 `npm test` 和 `npm run build` 在本地通过再 push——比修复失败的 deploy 快得多。
