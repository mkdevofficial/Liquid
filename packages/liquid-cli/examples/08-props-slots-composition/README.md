# 08 — Props, Slots & Composition 🫟

Demonstrates component decomposition, slot content injection, and compound layout patterns.

```
┌──────────────────────────────────────┐
│ 🫟 08 — Props, Slots & Composition   │
├──────────────────────────────────────┤
│ Card With Slot Projection   [Active] │
│ This card projects arbitrary nested  │
│ content inside its slot boundary...  │
├──────────────────────────────────────┤
│ [Section 1]       [Section 2]        │
│ Section 1: Liquid slots support...   │
└──────────────────────────────────────┘
```

## How It Works
- Outer container components declare `slot` where arbitrary caller UI is mounted.
- Slots work identically on web (HTML elements) and native Android (`LiquidFlexLayout` child containers).

## Commands
```bash
liquid dev
```
