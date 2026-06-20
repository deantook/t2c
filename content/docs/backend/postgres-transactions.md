---
title: "PostgreSQL 事务与隔离级别"
date: 2024-03-28
tags: [postgres, backend, database]
description: "ACID、隔离级别与常见并发 bug 的应对"
---

# PostgreSQL 事务与隔离级别

ORM 帮你 `Begin()` / `Commit()`，但不帮你理解「为什么余额扣了两次」。事务语义是后端正确性的地基。

## ACID 在 Postgres 里指什么

| 属性 | 含义 | Postgres 注意点 |
|-----|------|----------------|
| Atomicity | 全成或全不成 | 单语句也是隐式事务 |
| Consistency | 约束始终成立 | CHECK、FK、UNIQUE 在 commit 时校验 |
| Isolation | 并发事务互不干扰 | 由隔离级别决定「多不干扰」 |
| Durability | commit 后不因 crash 丢失 | WAL 持久化 |

## 隔离级别与异常

SQL 标准定义了并发下可能出现的读现象：

| 级别 | 脏读 | 不可重复读 | 幻读 |
|-----|------|-----------|------|
| Read Uncommitted | — | — | — |
| Read Committed | ✅ 避免 | ❌ 可能 | ❌ 可能 |
| Repeatable Read | ✅ | ✅ | ✅* |
| Serializable | ✅ | ✅ | ✅ |

\* Postgres 的 Repeatable Read 通过 MVCC + 谓词锁，对很多幻读场景也已避免。

**Postgres 默认是 Read Committed** — 每条语句看到语句开始时已提交的 snapshot。同一事务里两次 `SELECT` 可能看到不同行（别的事务 commit 了）。

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 100
-- 另一事务 commit：balance = 80
SELECT balance FROM accounts WHERE id = 1;  -- 80，不可重复读
COMMIT;
```

需要报表级一致性时用 Repeatable Read 或 Serializable：

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
-- 整个事务看到同一 snapshot
COMMIT;
```

## 典型 bug：丢失更新

```sql
-- 事务 A                          事务 B
SELECT stock FROM items WHERE id=1;  -- 10
                                   SELECT stock ...;  -- 10
UPDATE items SET stock=9 WHERE id=1;
                                   UPDATE items SET stock=9 WHERE id=1;
COMMIT;                            COMMIT;
-- 卖了两次货，stock 只减 1
```

对策（按推荐顺序）：

1. **原子 UPDATE** — `UPDATE items SET stock = stock - 1 WHERE id = 1 AND stock > 0`
2. **乐观锁** — `version` 字段，`UPDATE ... WHERE id=1 AND version=5`
3. **`SELECT ... FOR UPDATE`** — 悲观锁，读时锁住行

```sql
BEGIN;
SELECT stock FROM items WHERE id = 1 FOR UPDATE;
-- 其他事务的 FOR UPDATE / 写同一行会阻塞
UPDATE items SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

## 长事务的代价

Postgres MVCC 下，长事务会阻止 dead tuple 回收，导致表膨胀：

```sql
SELECT pid, now() - xact_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND xact_start IS NOT NULL
ORDER BY duration DESC;
```

规则：

- 事务里不要做 HTTP 调用、发消息队列
- 能拆成「短事务 + 幂等补偿」就不要一个大事务包天下
- 批处理用 `COPY` + 单事务，但注意 lock 范围

## 应用层模式

```go
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    Isolation: sql.LevelRepeatableRead,
})
defer tx.Rollback()

if err := transfer(ctx, tx, from, to, amount); err != nil {
    return err
}
return tx.Commit()
```

`ctx` 超时应该 cancel 事务——别让 hung 连接占着连接池。

## 何时用 Serializable

金融扣款、库存强一致、防重复下单。代价是 serialization failure，应用必须重试：

```go
for i := 0; i < 3; i++ {
    err := runSerializableTx(ctx)
    if !isSerializationFailure(err) {
        return err
    }
}
return ErrConflict
```

## 小结

默认 Read Committed 对大多数 CRUD 够用；遇到「读-改-写」竞态，先想原子 SQL 和乐观锁，再上升隔离级别。隔离级别越高，冲突重试越多——正确性和吞吐要一起权衡。
