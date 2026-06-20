---
title: "Go 并发模式"
date: 2024-02-10
tags: [go, backend]
description: "goroutine、channel 与 errgroup 实践"
---

# Go 并发模式

Go 的并发模型基于 CSP：**通过通信共享内存，而非通过共享内存通信**。

## goroutine 与 channel

```go
func worker(jobs <-chan int, results chan<- int) {
    for j := range jobs {
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    go worker(jobs, results)

    for i := 1; i <= 5; i++ {
        jobs <- i
    }
    close(jobs)

    for i := 1; i <= 5; i++ {
        fmt.Println(<-results)
    }
}
```

带缓冲的 channel 可以解耦生产者和消费者，避免一方阻塞另一方。

## select 多路复用

```go
select {
case msg := <-ch1:
    handle(msg)
case msg := <-ch2:
    handle(msg)
case <-time.After(3 * time.Second):
    return fmt.Errorf("timeout")
}
```

`select` 是 Go 处理超时和取消的基础——配合 `context.Context` 使用。

## errgroup：并发 + 错误传播

```go
g, ctx := errgroup.WithContext(ctx)

g.Go(func() error {
    return fetchUser(ctx, id)
})
g.Go(func() error {
    return fetchOrders(ctx, id)
})

if err := g.Wait(); err != nil {
    return err
}
```

任一 goroutine 返回 error，`ctx` 会被 cancel，其他任务应尽快退出。

## 常见陷阱

1. **闭包捕获循环变量** — Go 1.22+ 已修复 per-iteration 语义；旧版本需 `i := i`
2. **无缓冲 channel 死锁** — 发送和接收必须配对
3. **goroutine 泄漏** — 确保 consumer 退出，或用 context 取消

## 何时不用 goroutine

CPU  bound 任务用 `GOMAXPROCS` 和 worker pool；简单顺序逻辑不必强行并发。并发增加的是**复杂度**，不是免费性能。
