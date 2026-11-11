# 18 — Large Lists & Scroll Performance 🫟

Demonstrates rendering 500+ records with incremental batch loading, minimal memory footprint, and smooth 60fps scrolling on both browser and native Android views.

```
┌──────────────────────────────────────┐
│ 🫟 18 — Large Lists & Scroll Perf    │
├──────────────────────────────────────┤
│ Displaying 30 of 500 items           │
│ [+30 More]   [Render 500]   [Reset]  │
├──────────────────────────────────────┤
│ Telemetry Node #1      14ms [healthy]│
│ Telemetry Node #2      28ms [healthy]│
│ Telemetry Node #7      45ms [warning]│
└──────────────────────────────────────┘
```

## How It Works
- Keyed `each` elements avoid re-renders of untouched nodes.
- Android translates items into efficient native Android `View` nodes inside a scrollable layout.

## Commands
```bash
liquid dev
```
