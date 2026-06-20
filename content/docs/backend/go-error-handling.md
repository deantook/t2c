---
title: "错误处理：从 panic 到可恢复失败"
date: 2024-08-20
tags: [go, backend, errors]
description: "errors.Is、包装错误与 API 边界的映射"
---

# 错误处理：从 panic 到可恢复失败

Go 没有 exception，`if err != nil` 写多了像噪音。但 panic/recover 也不是偷懒的替代品——**可预期失败用 error，不可预期 bug 用 panic**。

## 错误是值，不是控制流

```go
func LoadArticle(path string) (string, error) {
    data, err := os.ReadFile(filepath.Join("content", path))
    if err != nil {
        if os.IsNotExist(err) {
            return "", fmt.Errorf("article %q: %w", path, ErrNotFound)
        }
        return "", fmt.Errorf("read %q: %w", path, err)
    }
    return string(data), nil
}
```

调用方用 `errors.Is` 判断语义，而不是字符串匹配：

```go
html, err := LoadArticle("blog/missing.md")
if errors.Is(err, ErrNotFound) {
    return write404(w)
}
if err != nil {
    return write500(w, err)
}
```

## 包装与 unwrap

Go 1.13+ `%w` 保留错误链：

```go
var ErrNotFound = errors.New("not found")

// 下层
return fmt.Errorf("fetch user %d: %w", id, ErrNotFound)

// 上层
if errors.Is(err, ErrNotFound) { /* ... */ }
```

**不要** export 所有内部错误类型给 API 层——在 service 边界映射成稳定 sentinel 或 domain error。

## 哨兵 vs 自定义类型

```go
// 哨兵：简单、可 Is
var ErrUnauthorized = errors.New("unauthorized")

// 自定义：带字段
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return e.Field + ": " + e.Message
}
```

需要 HTTP 422 + 字段明细时用 `ValidationError`；认证失败用 `ErrUnauthorized` 足够。

## panic 何时合理

| 可以 panic | 应该 return error |
|-----------|------------------|
| init 时配置缺失 | 用户输入非法 |
| 编程错误（impossible state） | 网络超时 |
| `MustCompile` 正则（包 init） | 文件不存在 |

HTTP handler 最外层 recover，打日志 + 500，不要把 stack trace 返回给用户：

```go
func recoverMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if v := recover(); v != nil {
                slog.Error("panic", "err", v, "stack", debug.Stack())
                http.Error(w, "internal error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

## 跨层映射

```
Repository  →  sql.ErrNoRows 包装成 ErrNotFound
Service     →  业务规则 → ErrConflict / ValidationError
Handler     →  ErrNotFound → 404, ValidationError → 422
```

同一 `ErrNotFound` 在 CLI 打印友好消息，在 HTTP 写 JSON——映射发生在**最外层适配器**，不在 deep inside DB 层。

## multierror 与 errgroup

并发任务用 `errgroup`，第一个 error 取消 siblings：

```go
g, ctx := errgroup.WithContext(ctx)
for _, path := range paths {
    path := path
    g.Go(func() error {
        _, err := process(ctx, path)
        return err
    })
}
return g.Wait()
```

不要收集所有 error 再返回 `[]error`，除非 UX 明确要求「批量校验全部字段」。

## 小结

`%w` + `errors.Is` + 边界映射，构成 Go 错误处理的主线。panic 留给 truly broken；用户和网络的问题，老老实实 `return err`，在 handler 里翻译成他们看得懂的响应。
