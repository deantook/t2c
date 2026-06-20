---
title: "HTTP 中间件设计模式"
date: 2024-04-05
tags: [go, backend, http]
description: "洋葱模型、上下文传递与可测试的中间件"
---

# HTTP 中间件设计模式

中间件是横切关注点（日志、认证、限流、recover）的挂载点。写乱了的中间件链，调试顺序和依赖比写业务逻辑还痛苦。

## 洋葱模型

```
Request  →  [Recover] → [Log] → [Auth] → Handler → Response
           ←          ←       ←        ←
```

外层先执行「进」，内层返回后外层再执行「出」。Recover 必须最外层，才能 catch 内层 panic。

Go 标准库风格：

```go
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

mux.Handle("/api/", Chain(apiHandler,
    recoverMiddleware,
    requestLogMiddleware,
    authMiddleware,
))
```

## Context 传递约定

不要把 `*User` 塞全局变量。用 `context.Context`：

```go
type ctxKey int
const userKey ctxKey = 1

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        user, err := validateToken(token)
        if err != nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), userKey, user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func UserFromContext(ctx context.Context) (*User, bool) {
    u, ok := ctx.Value(userKey).(*User)
    return u, ok
}
```

**注意：** context key 用未导出类型，避免第三方包冲突。Go 1.21+ 可考虑 `context.WithValue` 的 typed 封装库，但私有 key 通常够用。

## 中间件应该做什么、不做什么

| 适合 | 不适合 |
|-----|--------|
| 认证 / 鉴权 | 复杂业务规则 |
| request_id 注入 | 跨多个 repo 的长事务 |
| 限流、超时 | 直接查库做权限以外的逻辑 |
| panic recover + 统一错误 JSON | 在 middleware 里改 response body 结构（除非全站统一） |

业务 handler 保持：`解析输入 → 调 service → 写响应`。middleware 只处理**与具体 route 无关**的横切逻辑。

## 可测试性

把 middleware 当成 `http.Handler` 测，不要启动真 server：

```go
func TestAuthMiddleware(t *testing.T) {
    var called bool
    inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        called = true
        u, ok := UserFromContext(r.Context())
        if !ok || u.ID != 42 {
            t.Fatal("user not in context")
        }
    })

    req := httptest.NewRequest("GET", "/", nil)
    req.Header.Set("Authorization", "Bearer valid-token")
    rec := httptest.NewRecorder()

    AuthMiddleware(inner).ServeHTTP(rec, req)

    if rec.Code != http.StatusOK || !called {
        t.Fatalf("status=%d called=%v", rec.Code, called)
    }
}
```

## 常见坑

1. **ResponseWriter 包装** — 想抓 status code 和 bytes written，要 wrap `http.ResponseWriter`，并实现 `http.Flusher` 等 optional interface
2. **middleware 顺序** — CORS 要在最外或紧挨 handler；body size limit 要在读 body 之前
3. **重复 middleware** — 子 router 又挂一遍 log，一条请求打两行
4. **在 middleware 里 short-circuit 后忘记调用 next** —  intentional，但要文档化

```go
type responseWriter struct {
    http.ResponseWriter
    status int
    bytes  int
}

func (w *responseWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}

func (w *responseWriter) Write(b []byte) (int, error) {
    n, err := w.ResponseWriter.Write(b)
    w.bytes += n
    return n, err
}
```

## 小结

中间件链是**有序、可组合、可单测**的 pipeline。Recover 在外、Auth 在 business 之前、Log 包住能测到 status 的 Writer——这三件做对，大部分 HTTP 服务的运维体验会稳很多。
