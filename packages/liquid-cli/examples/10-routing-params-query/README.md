# 10 — Routing, Params & Queries 🫟

Demonstrates path pattern matching (`/users/:id`), query string parameter extraction (`?tab=activity`), and fallback not-found routing across web and native mobile runtime.

```
┌──────────────────────────────────────┐
│ 🫟 10 — Routing, Params & Queries    │
├──────────────────────────────────────┤
│ [User #42]  [User #99]  [Explore]    │
├──────────────────────────────────────┤
│ User Profile Route                   │
│ Matched User ID: 42                  │
│ Active Query Tab: activity           │
│ Full URL: /users/42?tab=activity     │
└──────────────────────────────────────┘
```

## How It Works
- Path segments matching `:param` are parsed into dynamic object maps.
- Query parameters following `?` are automatically normalized into reactive key-value dictionaries.

## Commands
```bash
liquid dev
```
