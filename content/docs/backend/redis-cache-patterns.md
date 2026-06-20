---
title: "Redis 缓存常见模式"
date: 2024-04-22
tags: [redis, backend, cache]
description: "Cache-Aside、TTL 与缓存穿透的处理"
---

# Redis 缓存常见模式

缓存不是「把数据库结果丢进 Redis」这么简单。选错模式会导致一致性问题、缓存雪崩，或者比不用缓存更慢。

## Cache-Aside（旁路缓存）

应用自己管缓存，是最常见的模式：

```
读：先查 Redis → miss 则查 DB → 写入 Redis → 返回
写：先更新 DB → 删除 Redis 中的 key（而非更新）
```

**为什么写时删除而不是更新？** 并发写时，先删后写可以避免脏读；下次读会回填最新值。

```go
func GetUser(ctx context.Context, id int64) (*User, error) {
    key := fmt.Sprintf("user:%d", id)
    if val, err := rdb.Get(ctx, key).Result(); err == nil {
        var u User
        json.Unmarshal([]byte(val), &u)
        return &u, nil
    }
    u, err := db.QueryUser(ctx, id)
    if err != nil {
        return nil, err
    }
    data, _ := json.Marshal(u)
    rdb.Set(ctx, key, data, 30*time.Minute)
    return u, nil
}
```

## TTL 策略

| 数据类型 | 建议 TTL | 原因 |
|---------|---------|------|
| 用户信息 | 5–30 分钟 | 变更不频繁，可接受短暂 stale |
| 热点列表 | 1–5 分钟 | 更新较勤，不宜太长 |
| 配置项 | 1 小时 + 主动失效 | 读多写少 |

避免所有 key 同一 TTL 同时过期——加随机 jitter：`TTL + rand(0, 300)` 秒。

## 缓存穿透

查询不存在的数据，每次都打到 DB。对策：

1. **布隆过滤器** — 快速判断 id 是否可能存在
2. **空值缓存** — 对不存在的 key 缓存短 TTL 的 null 标记
3. **参数校验** — 拒绝明显非法的 id 范围

## 缓存击穿

单个热点 key 过期瞬间，大量请求涌向 DB。对策：**互斥锁**或**逻辑过期**（值带过期时间，异步刷新，读旧值不阻塞）。

## 小结

Redis 解决的是**读放大**问题。写路径上的复杂度（失效策略、一致性）才是设计重点。先 Cache-Aside + 合理 TTL，遇到具体问题再加布隆过滤器或 singleflight。
