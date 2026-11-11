# 07 — Events & Modifiers 🫟

Demonstrates listener declarations (`@click`, `@input`), keydown modifiers (`@keydown.enter`), and synthetic payload propagation across Web and Android native runtime.

```
┌──────────────────────────────────────┐
│ 🫟 07 — Events & Modifiers           │
├──────────────────────────────────────┤
│ [Click Me]   [Action B]   [Action C] │
│                                      │
│ [Type and press Enter...           ] │
├──────────────────────────────────────┤
│ Event Log (Last: Single Click)       │
│ 10:48:12 AM — Single Click           │
└──────────────────────────────────────┘
```

## How It Works
- `@event=handler` attaches native touch/click listeners.
- `@keydown.enter` automatically filters for key code 13 (`Enter`) on both desktop keyboards and mobile soft keyboards.

## Commands
```bash
liquid dev
```
