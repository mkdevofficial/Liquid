# 01 — Hello Components 🫟

Demonstrates component architecture, props definition with defaults, slot projection, and cross-platform native rendering.

```
┌──────────────────────────────────────┐
│ 🫟 01 — Hello Components             │
├──────────────────────────────────────┤
│ Component Composition & Slots        │
│ Liquid components accept props with  │
│ default values and project child...  │
│ [Props + Slots Ready]                │
├──────────────────────────────────────┤
│ Welcome, Developer!                  │
│ Fine-grained reactivity updates...   │
└──────────────────────────────────────┘
```

## How It Works
- `defineProps()` extracts incoming properties and assigns defaults.
- `<slot>` projects nested children into target layout positions.
- Native Android maps the layout directly into `LiquidFlexLayout` and `LiquidTextView`.

## Commands
```bash
# Run on web
liquid dev

# Run on native Android
liquid dev  # Connect Liquid dev app on phone
```
