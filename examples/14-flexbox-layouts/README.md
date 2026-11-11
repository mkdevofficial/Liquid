# 14 — Flexbox Layout Patterns 🫟

Demonstrates flex alignments, row wrapping, gap spacing, and `margin-left: auto` pushing elements to the trailing edge.

```
┌──────────────────────────────────────┐
│ 🫟 14 — Flexbox Layout Patterns      │
├──────────────────────────────────────┤
│ 1. justify-content: space-between    │
│ [Left]      [Center]         [Right] │
├──────────────────────────────────────┤
│ 2. gap & margin-left: auto           │
│ [Box 1] [Box 2]   [margin-left:auto] │
├──────────────────────────────────────┤
│ 3. flex-wrap: wrap                   │
│ [Tag One] [Tag Two] [Tag Three] ...  │
└──────────────────────────────────────┘
```

## How It Works
- On Android, `LiquidFlexLayout` measures children across main and cross axes according to standard CSS flexbox specification.
- `margin-left: auto` dynamically absorbs leftover space and pushes following elements to the right boundary.

## Commands
```bash
liquid dev
```
