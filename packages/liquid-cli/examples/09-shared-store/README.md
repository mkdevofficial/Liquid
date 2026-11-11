# 09 — Shared Store & Selectors 🫟

Demonstrates global reactive stores using `createStore`, computed selector methods, and cross-component mutation actions.

```
┌──────────────────────────────────────┐
│ 🫟 09 — Shared Store                 │
├──────────────────────────────────────┤
│ Global Store Counter: 10             │
│ Doubled (Selector): 20               │
│ [Decrement (-)]   [Increment (+)]    │
├──────────────────────────────────────┤
│ Logged in as: Liquid Hacker          │
│ Active Theme Mode: dark              │
│ [Toggle Theme Mode]                  │
└──────────────────────────────────────┘
```

## How It Works
- `createStore(initialState)` wraps state properties in transparent signal proxies.
- Any component accessing `appStore.getCounter()` reactively subscribes to updates without boilerplate contexts or reducers.

## Commands
```bash
liquid dev
```
