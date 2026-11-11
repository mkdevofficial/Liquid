# 03 — Effects & Lifecycle 🫟

Demonstrates side-effect execution and lifecycle cleanup using `onMount`, `onCleanup`, and reactive signal dependencies.

```
┌──────────────────────────────────────┐
│ 🫟 03 — Effects & Lifecycle          │
├──────────────────────────────────────┤
│               ⏱ 12s                  │
│                                      │
│        [Pause]      [Reset]          │
│                                      │
│         State: Active Timer          │
└──────────────────────────────────────┘
```

## How It Works
- `onMount(fn)` executes when the component mounts on Web or Native Android.
- `onCleanup(fn)` ensures intervals, observers, and event listeners are torn down to prevent memory leaks.

## Commands
```bash
liquid dev
```
