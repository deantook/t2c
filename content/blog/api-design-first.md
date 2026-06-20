---
title: "写 API 之前先回答三个问题"
date: 2024-07-18
tags: [api, backend, design]
description: "资源建模、错误语义与版本策略，比选框架更重要"
---

# 写 API 之前先回答三个问题

新接口往往从「前端需要什么字段」倒推出来，上线后才发现：分页不一致、错误码各说各话、同名资源在不同端点含义不同。下面三个问题，在写第一行 handler 之前就该有答案。

## 1. 这个资源的生命周期是什么？

REST 不是 CRUD 表格，而是**状态机**。以「文章」为例：

```
draft → published → archived
         ↓
      (soft delete)
```

如果 API 只有 `POST /articles` 和 `PUT /articles/:id`，发布和归档会变成「改 status 字段」的隐式操作。更清晰的建模：

```
POST   /articles              创建草稿
PATCH  /articles/:id/publish  发布（校验必填字段）
PATCH  /articles/:id/archive  归档（幂等）
DELETE /articles/:id          软删除
```

**好处：** 每个端点职责单一，权限可以按动作细分（编辑能改草稿，只有管理员能归档）。

## 2. 错误怎么表达？

客户端需要区分「重试可能成功」和「重试无意义」。建议统一 envelope：

```json
{
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "article 42 does not exist",
    "retryable": false
  }
}
```

HTTP 状态码只表达**传输层语义**：

| 状态码 | 含义 | 典型场景 |
|-------|------|---------|
| 400 | 客户端参数错误 | 缺少 title、date 格式不对 |
| 401 | 未认证 | token 缺失或过期 |
| 403 | 无权限 | 不能改别人的草稿 |
| 404 | 资源不存在 | id 无效 |
| 409 | 冲突 | 并发修改、唯一约束 |
| 429 | 限流 | 搜索接口打太猛 |
| 500 | 服务端未知错误 | 数据库连接失败 |

`message` 给人看，`code` 给程序分支，`retryable` 给客户端决定是否自动重试。避免把 SQL 错误原文返回给前端——日志里记 detail，响应里给稳定 code。

## 3. 怎么演进而不破坏旧客户端？

YAGNI 不等于「永远不改」。预留空间的做法：

1. **字段只加不删** — 旧客户端忽略未知字段
2. **破坏性变更走新版本** — `/v2/articles` 或 Accept header
3. **废弃有 sunset 日期** — 响应头 `Deprecation: true` + 文档说明

```http
GET /v1/articles/1 HTTP/1.1
Deprecation: true
Sunset: Sat, 01 Nov 2025 00:00:00 GMT
Link: </v2/articles/1>; rel="successor-version"
```

## 分页：选一个，全站统一

cursor 分页适合时间线（`timeline` 命令那种按日期浏览）；offset 分页适合「第 N 页」的管理后台。混用会让前端缓存和 SEO 都痛苦。

Cursor 示例：

```json
{
  "data": [...],
  "cursor": {
    "next": "eyJpZCI6MTAwfQ==",
    "has_more": true
  }
}
```

`next` 是不透明 token，内部编码 `(sort_key, id)`，避免深分页的 `OFFSET 100000` 性能问题。

## 小结

框架、ORM、网关都可以换；**资源边界、错误契约、分页模型**换起来代价大。花 30 分钟在白板上画状态机和错误表，比赶工写十个 endpoint 更省后面的重构时间。
