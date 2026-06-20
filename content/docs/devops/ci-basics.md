---
title: "CI 流水线最小可用配置"
date: 2024-07-05
tags: [ci, devops, github-actions]
description: "lint、test、build 三件套与缓存策略"
---

# CI 流水线最小可用配置

CI 的目标不是「步骤越多越好」，而是 **main 分支上的每次 merge 都证明：能 lint、能测、能构建**。t2c 这类静态站，三件套足够；复杂系统再往上加 deploy、e2e、安全扫描。

## 最小流水线

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

顺序理由：lint 最快，先失败早反馈；test 次之；build 最慢放最后。任何一步红，PR 不可 merge。

## 和本地命令对齐

CI 里跑的必须是开发者本地也会跑的命令。反模式：

```yaml
# 坏：CI 独有脚本，本地从不跑
- run: node scripts/ci-only-check.js
```

`package.json` 里统一入口：

```json
{
  "scripts": {
    "lint": "eslint src && astro check",
    "test": "vitest run",
    "build": "astro build && pagefind --site dist"
  }
}
```

PR 描述里写「本地 `npm test` 通过」应该是真话，不是祈祷。

## 缓存

Node 项目用 `cache: npm` 缓存 `~/.npm`。monorepo 或 pnpm 要换对应 action 和 lockfile 路径。

不要缓存 `node_modules` 本身——跨 OS 原生模块会出问题。始终 `npm ci` 从 lockfile 装干净依赖。

## PR vs main

| 事件 | 跑什么 |
|-----|--------|
| pull_request | lint + test + build |
| push to main | 同上 + deploy（可选） |

PR 上不 deploy 到生产；merge 后由 main 流水线 deploy，避免「PR 预览占满配额」。

## 静态站 deploy 示例

```yaml
deploy:
  needs: verify
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
    - run: npm ci && npm run build
    - uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

Secrets 只放 token，不要把 `.env` 提交进 repo。

## 常见失败与修复

1. **时区 / locale** — 测试假设本地时区，CI 用 UTC。用固定 `TZ=Asia/Shanghai` 或 mock `Date`
2. **并发测试污染** — 共享临时目录、端口。Vitest 用 `pool: forks` 或 isolate fixtures
3. **缺少 devDependency** — 本地全局装了 eslint，CI 没有。全部写进 `package.json`
4. **Pagefind 路径** — build 产物目录和本地不一致，CI 里显式 `--site dist`

## 何时加步骤

| 信号 | 加什么 |
|-----|--------|
| 多人协作样式乱 | Prettier check |
| 依赖有 CVE | npm audit / Dependabot |
| 发布前怕回归 | Playwright  smoke（少量） |
| 合规要求 | SBOM、license scan |

每一步都有维护成本。先保证三件套稳定跑一个月，再加新 job。

## 小结

好的 CI 像好的测试：**快、可靠、和本地一致**。开发者应该能在 push 之前预知 CI 结果；如果 CI 经常「本地过、线上挂」，先查环境差异和脚本分叉，而不是加更多步骤掩盖问题。
