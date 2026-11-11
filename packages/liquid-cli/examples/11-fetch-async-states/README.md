# 11 — Async Data & Fetch States 🫟

Demonstrates robust asynchronous state handling: loading transitions, successful data mapping, error banners, and manual retries.

```
┌──────────────────────────────────────┐
│ 🫟 11 — Async Data & Fetch States   │
├──────────────────────────────────────┤
│ [Fetch Data]     [Simulate Error]    │
├──────────────────────────────────────┤
│ Ada Lovelace        Chief Architect  │
│ [online]                             │
│                                      │
│ Alan Turing          Cryptographer   │
│ [online]                             │
└──────────────────────────────────────┘
```

## How It Works
- State transitions (`'loading'` -> `'success'` | `'error'`) drive conditional UI branches.
- Components cleanly clean up in-flight requests or timers on unmount.

## Commands
```bash
liquid dev
```
