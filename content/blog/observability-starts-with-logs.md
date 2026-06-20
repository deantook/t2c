---
title: "可观测性从结构化日志开始"
date: 2024-08-02
tags: [observability, devops, backend]
description: "在引入链路追踪之前，先把日志写对"
---

# 可观测性从结构化日志开始

团队一喊「线上有问题」，就有人提议上 Jaeger、Tempo、OpenTelemetry 全家桶。Tracing 当然有用，但大多数中小服务的第一痛点是：**出问题时找不到上下文**。结构化日志是投入产出比最高的起点。

## 非结构化日志的问题

```
2024-08-02 14:03:11 ERROR failed to load article
2024-08-02 14:03:11 ERROR connection reset
2024-08-02 14:03:12 INFO request done
```

三行日志无法回答：哪个用户、哪篇文章、第几次重试、上游超时还是本地 bug？

## 结构化日志最小集

每条日志带上**关联 id** 和**稳定字段名**：

```json
{
  "level": "error",
  "msg": "load article failed",
  "request_id": "req_8f3a2b",
  "path": "docs/frontend/react-hooks.md",
  "duration_ms": 1203,
  "err": "context deadline exceeded"
}
```

Go 里用 `slog` 或 `zerolog`；Node 里用 `pino`。原则一样：**键名 snake_case 或 camelCase 全站统一**，值类型稳定（数字就是数字，不要 `"1203"` 字符串）。

## request_id 怎么传

```
浏览器 → CDN → 网关 → 服务 A → 服务 B
         req_abc  req_abc   req_abc
```

1. 入口生成 `request_id`（UUID 或 snowflake）
2. 写入响应头 `X-Request-Id`，方便用户报障时提供
3. 下游 RPC / HTTP 调用带上同一 id
4. 日志、metrics、trace span 共用这一 id

没有分布式追踪时，靠 grep `request_id` 也能串起一次请求的全路径。

## 日志级别纪律

| 级别 | 用途 | 反例 |
|-----|------|------|
| DEBUG | 开发调试，生产可关 | 生产默认 DEBUG 打爆磁盘 |
| INFO | 正常业务里程碑 | 每个循环 iteration 都打 INFO |
| WARN | 可恢复异常 | 把 404 当 WARN（其实是预期行为） |
| ERROR | 需要人介入或告警 | 捕获后吞掉 error 不打日志 |

**规则：** ERROR 必须带 `err` 字段；WARN/ERROR 必须带足够上下文定位问题，而不是只写 `"something went wrong"`。

## 和 Metrics、Tracing 的关系

```
Logs     → 「这一请求发生了什么」— 细节、排障
Metrics  → 「系统整体健不健康」— QPS、延迟分位、错误率
Traces   → 「跨服务调用链」— 瓶颈在哪一段
```

建议顺序：

1. 结构化日志 + request_id
2. 四个黄金信号：延迟、流量、错误、饱和度（RED 或 USE）
3. 有 3 个以上服务互相调用时，再加 tracing

t2c 是纯静态站，运行时几乎没有服务端日志——但 `grep` 搜索失败、文章 HTML 加载 404，在浏览器 console 里同样应该用结构化方式记录（`{ cmd, arg, err }`），方便复现用户报告。

## 采样与成本

全量 DEBUG 在 QPS 上千时不可承受。常见策略：

- 生产默认 INFO，临时对某 `request_id` 或某用户开 DEBUG
- 错误日志 100% 保留，成功请求按 1% 采样
- 大 payload（完整 SQL、响应 body）只在 ERROR 时记录

## 小结

好的日志像好的 commit message：**未来那个凌晨被叫醒的你，会感谢现在的你**。Tracing 和仪表盘是放大器；日志质量不行，放大出来的也只是噪声。
