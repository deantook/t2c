---
title: "TypeScript 泛型实战"
date: 2024-05-28
tags: [typescript, frontend]
description: "从函数泛型到条件类型的常见用法"
---

# TypeScript 泛型实战

泛型让类型随值流动，而不是写死 `any` 或重复定义多个 overload。

## 函数泛型

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([1, 2, 3]);     // number | undefined
const s = first(["a", "b"]);    // string | undefined
```

约束泛型参数：

```typescript
function prop<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

prop({ name: "t2c", version: 1 }, "name"); // OK
// prop({ name: "t2c" }, "missing");       // 编译错误
```

## 泛型接口

API 响应包装是经典场景：

```typescript
interface ApiResponse<T> {
  data: T;
  error: string | null;
}

async function fetchArticle(path: string): Promise<ApiResponse<string>> {
  const res = await fetch(`/generated/articles/${path}.html`);
  const html = await res.text();
  return { data: html, error: res.ok ? null : "load failed" };
}
```

t2c 的 `CommandResult` 也可以用泛型扩展 async 输出类型，但目前 YAGNI——等命令返回值分化再重构。

## 常用工具类型

```typescript
type PartialState = Partial<TerminalState>;  // 所有字段可选
type ReadonlyFs = Readonly<FsTree>;          // 不可变视图
type CmdHandler = (state: TerminalState, args: string[]) => CommandResult;
```

## 条件类型（进阶）

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type ElementType<T> = T extends (infer U)[] ? U : never;
type FileNode = ElementType<FsTree["files"]>; // FsFile
```

## 何时不用泛型

如果函数只处理一种类型，硬写具体类型更清晰。泛型是为了**复用且保持类型安全**，不是为了炫技。

Rule of thumb：出现第二个「结构相同、类型不同」的实现时，再引入泛型。
