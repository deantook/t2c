---
title: "Docker Compose 本地依赖环境"
date: 2024-05-08
tags: [docker, devops, local-dev]
description: "Postgres、Redis 一键拉起与数据持久化"
---

# Docker Compose 本地依赖环境

「在我机器上能跑」Often 是因为本地装着 Postgres 14、Redis 7，而同事装的是另一个版本。Compose 把**依赖版本**和**启动方式**写进 repo，新人 `docker compose up -d` 即可。

## 最小 compose 文件

```yaml
# compose.yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app_dev"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

应用连 `localhost:5432`，不要用 container 内 hostname——应用在 host 跑，数据库在 container 跑。

## 环境变量

`.env.example` 提交进 git，`.env` 忽略：

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app_dev?sslmode=disable
REDIS_URL=redis://localhost:6379/0
```

应用启动时读 `DATABASE_URL`，CI 和生产换不同值，代码不变。

## healthcheck 为什么重要

```bash
docker compose up -d
# 容器「started」≠ 数据库能接受连接
```

带 healthcheck 后，可以等就绪再跑 migration：

```bash
docker compose up -d --wait
npm run db:migrate
```

或在 compose 里用 `depends_on` + condition（Compose v2.1+）：

```yaml
app:
  depends_on:
    postgres:
      condition: service_healthy
```

## 数据要不要持久化

| 场景 | 策略 |
|-----|------|
| 日常开发 | named volume，重启数据还在 |
| 集成测试 | tmpfs 或每次 `docker compose down -v` 清空 |
| 种子数据 | `docker-entrypoint-initdb.d/` 放 `01-seed.sql` |

```yaml
postgres:
  volumes:
    - pgdata:/var/lib/postgresql/data
    - ./scripts/dev-seed.sql:/docker-entrypoint-initdb.d/01-seed.sql:ro
```

init 脚本**只在 volume 首次创建时**执行；改 seed 文件要 `down -v` 重建。

## 和纯静态项目的关系

t2c 本身不需要 Postgres。但如果你同时开发「带 API 的博客后台」，Compose 只起依赖，应用仍 `npm run dev` 在 host 跑——热更新快，调试方便。

全塞进 Docker 适合：生产镜像和本地一致、团队没有 Node 版本共识。本地开发常见折中是 **Compose 管数据层，host 管应用层**。

## 端口冲突

机器上已有 Postgres 占 5432：

```yaml
ports:
  - "5433:5432"   # host:container
```

`.env.example` 里注明 `5433`，文档写清楚。

## 常用命令

```bash
docker compose up -d          # 后台启动
docker compose logs -f postgres
docker compose exec postgres psql -U app -d app_dev
docker compose down           # 停容器，保留 volume
docker compose down -v        # 停容器并删 volume（清库）
```

## 小结

Compose 解决的是**依赖 reproducibility**，不是替代生产 orchestrator。一个文件、两个 service、healthcheck、`.env.example`——够大多数全栈项目的本地起步。复杂了再加 profile（`compose --profile full up`）区分最小集和可选组件。
