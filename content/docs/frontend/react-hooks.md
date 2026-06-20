---
title: "React Hooks 入门"
date: 2024-03-15
tags: [react, frontend]
description: "useState、useEffect 与 useCallback 的正确用法"
---

# React Hooks 入门

Hooks 让函数组件拥有状态和副作用，t2c 的终端 UI 完全基于 React 19 + Hooks 构建。

## useState：局部状态

```jsx
const [count, setCount] = useState(0);

// 函数式更新，避免 stale closure
setCount((c) => c + 1);
```

t2c 中 `Terminal` 组件用多个 `useState` 管理 cwd、输出历史、输入框和 vi 会话——每个状态职责单一。

## useEffect：副作用

```jsx
useEffect(() => {
  const cmd = hashToCommand(window.location.hash);
  if (cmd) runInput(cmd);
}, []); // 挂载时执行一次：URL hash 深链接
```

依赖数组 `[deps]` 决定何时重新执行。**空数组 = 仅挂载时**；省略 = 每次渲染后都执行（通常不是你想要的）。

## useRef：可变引用

```jsx
const stateRef = useRef(state);
stateRef.current = state;

// 在 callback 里读最新 state，不触发重渲染
const runInput = useCallback(async (raw) => {
  const current = stateRef.current;
  // ...
}, [ctx]);
```

`useRef` 适合存 DOM 节点（`scrollIntoView`）或跨 render 共享的可变值。

## useMemo / useCallback

```jsx
const ctx = useMemo(
  () => ({ fs, loadArticle, search }),
  [fs],
);

const runInput = useCallback(async (raw) => { /* ... */ }, [ctx]);
```

只在**计算昂贵**或**作为 props 传给 memo 子组件**时使用。过度 memo 反而增加代码量和 bug 面。

## 规则

1. 只在顶层调用 Hooks，不在 if/for 里
2. 只在 React 函数组件或自定义 Hook 里调用
3. 自定义 Hook 以 `use` 开头，封装可复用逻辑

t2c 的 `loadHistory` / `pushHistory` 就是可以进一步抽成 `useTerminalHistory` 的候选——目前体量小，保持简单即可。
