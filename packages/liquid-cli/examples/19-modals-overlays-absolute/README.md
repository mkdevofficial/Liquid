# 19 — Modals, Toasts & Absolute Overlays 🫟

Demonstrates full-screen overlay dialogs, backdrop scrims, and floating toast notifications using `position: absolute` with responsive offsets.

```
┌──────────────────────────────────────┐
│ 🫟 19 — Modals & Absolute Overlays   │
├──────────────────────────────────────┤
│ Trigger Dialogs & Notifications      │
│ [Open Modal Dialog]  [Trigger Toast] │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Important Notice                 │ │
│ │ Liquid supports full screen      │ │
│ │ scrim overlays...                │ │
│ │ [Cancel]       [Confirm]         │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## How It Works
- Overlays use `position: absolute` with `top: 0`, `bottom: 0`, `left: 0`, `right: 0`.
- On Android, `LiquidFlexLayout.LayoutParams.isAbsolute` positions the child directly across the parent container without interfering with flex sibling layouts.

## Commands
```bash
liquid dev
```
