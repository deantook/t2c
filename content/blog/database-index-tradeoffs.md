---
title: "数据库索引：什么时候加、什么时候忍"
date: 2024-10-15
tags: [database, backend, performance]
description: "B-tree、复合索引与写放大之间的权衡"
---

# 数据库索引：什么时候加、什么时候忍

慢查询的第一反应往往是「加个索引」。索引确实快读，但也占空间、拖慢写入、让优化器选错计划。索引是设计决策，不是默认答案。

## 索引如何工作（B-tree 直觉）

Postgres 默认 B-tree：按 key 有序，查找 O(log n)。

```sql
CREATE INDEX idx_articles_date ON articles (published_at DESC);
```

`WHERE published_at > '2024-01-01' ORDER BY published_at DESC LIMIT 20` 可以走索引，避免全表扫描 + 排序。

**覆盖不了的情况：** 对 `LOWER(title)` 查 equality，普通索引无效，需要 expression index：

```sql
CREATE INDEX idx_articles_title_lower ON articles (lower(title));
```

或 generated column + 索引（Postgres 12+）。

## 复合索引与最左前缀

```sql
CREATE INDEX idx_posts_user_date ON posts (user_id, created_at DESC);
```

有效：

```sql
WHERE user_id = 42
WHERE user_id = 42 AND created_at > '2024-06-01'
ORDER BY user_id, created_at DESC
```

无效（用不上索引第二列排序）：

```sql
WHERE created_at > '2024-06-01'   -- 没有 user_id 条件
```

列顺序：**等值过滤在前，范围 / 排序在后**。

## 该加索引的信号

1. `EXPLAIN (ANALYZE, BUFFERS)` 出现 `Seq Scan` 且 `rows` 很大
2. 慢查询日志里重复出现同一模式
3. FK 列经常 join，且没有索引（Postgres 不会自动给 FK 建索引）

```sql
EXPLAIN ANALYZE
SELECT * FROM articles WHERE slug = 'hello-world';
```

## 不该乱加的情况

| 情况 | 原因 |
|-----|------|
| 小表（几百行） | 全表扫描更快 |
| 写多读少的表 | 每次 INSERT/UPDATE 维护索引 |
| 低选择性列（如 boolean） | 索引几乎筛不掉行 |
| 已有冗余索引 | `(a,b)` 和 `(a)` 重复时只留复合 |

查冗余：

```sql
SELECT indexrelid::regclass AS index, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

`idx_scan = 0` 且存在超过一个月，候选删除。

## 部分索引

只索引热点子集，更小更快：

```sql
CREATE INDEX idx_articles_published
ON articles (published_at DESC)
WHERE status = 'published';
```

适合「绝大多数行是 draft，查询只扫 published」的 CMS。

## 写放大

每多一个索引，INSERT 就多一次 B-tree 更新。高吞吐写入（日志、事件流）要克制索引数量；读多写少的报表、内容库可以激进一些。

## 和 ORM 的协作

GORM / Prisma migration 自动生成索引容易**过度**（每个 FK 字段、每个 `filter` 字段都来一个）。Review migration 文件，对照实际 query pattern。

## 小结

先 `EXPLAIN ANALYZE` 看证据，再建索引；复合索引对齐 WHERE + ORDER BY；用部分索引和 expression index 处理子集和函数条件。索引不是越多越好——**每个索引都要能说出它加速哪条生产查询**。
