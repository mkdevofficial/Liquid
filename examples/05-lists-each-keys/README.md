# 05 — Lists & Keyed Each 🫟

Demonstrates keyed collection rendering using `each items as item (key)`, minimal DOM mutations, item additions, deletions, and list sorting.

```
┌──────────────────────────────────────┐
│ 🫟 05 — Lists & Keyed Each           │
├──────────────────────────────────────┤
│ [+ Add Item] [Sort Score] [Reverse]  │
├──────────────────────────────────────┤
│ Item Alpha            Score: 85   [✕]│
│ Item Beta             Score: 92   [✕]│
│ Item Gamma            Score: 78   [✕]│
└──────────────────────────────────────┘
```

## How It Works
- The key expression `(item.id)` gives each item a permanent identity.
- When reordering or sorting, Liquid moves existing DOM / native nodes instead of destroying and recreating them.

## Commands
```bash
liquid dev
```
