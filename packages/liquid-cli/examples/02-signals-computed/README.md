# 02 — Signals & Computed 🫟

Demonstrates fine-grained reactive primitives: `signal()` for read/write state, `computed()` for automatic dependency tracking, and `batch()` for coalescing multi-signal updates into a single notification cycle.

```
┌──────────────────────────────────────┐
│ 🫟 02 — Signals & Computed           │
├──────────────────────────────────────┤
│ Reactive Signals                     │
│ [-]  Base Count: 5  [+]  [Reset]     │
├──────────────────────────────────────┤
│ Computed Derived State               │
│ Result: 5 × 3 = 15 (Odd)             │
└──────────────────────────────────────┘
```

## How It Works
- Reading a signal inside `computed(() => ...)` automatically registers the dependency.
- `batch(() => { ... })` ensures intermediate states don't cause redundant evaluations or DOM operations.

## Commands
```bash
liquid dev
```
