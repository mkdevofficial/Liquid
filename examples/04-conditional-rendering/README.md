# 04 — Conditional Rendering 🫟

Demonstrates branching UI using indented `if / else` syntax, ternary expressions in attributes, and dynamic view toggling.

```
┌──────────────────────────────────────┐
│ 🫟 04 — Conditional Rendering        │
├──────────────────────────────────────┤
│ [Please authenticate to view...]     │
│ [Sign In]                            │
├──────────────────────────────────────┤
│ [Summary]   [Details]   [Raw JSON]   │
│ High-level executive overview...     │
└──────────────────────────────────────┘
```

## How It Works
- Liquid's compiler parses indented `if` and `else` blocks into conditional branch nodes.
- When signals change, fine-grained DOM operations toggle the active subtree without unmounting unaffected sibling nodes.

## Commands
```bash
liquid dev
```
