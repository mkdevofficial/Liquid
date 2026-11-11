# 15 — Timers & Signal Animations 🫟

Demonstrates timer-driven fine-grained UI updates, dynamic style percentage binding (`style="width: {progress()}%"`), and interval lifecycles.

```
┌──────────────────────────────────────┐
│ 🫟 15 — Timers & Signal Animations   │
├──────────────────────────────────────┤
│ Animation Progress               45% │
│ [██████████████░░░░░░░░░░░░░░░░░░░░] │
│                                      │
│ [Pause Animation]  [Reset to 0%]     │
└──────────────────────────────────────┘
```

## How It Works
- Timer triggers signal updates.
- Fine-grained reactivity updates only the inline style string on the filling bar without diffing or layout recalculation overhead.

## Commands
```bash
liquid dev
```
