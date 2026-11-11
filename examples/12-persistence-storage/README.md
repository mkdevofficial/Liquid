# 12 — Cross-Platform Persistence 🫟

Demonstrates unified persistent storage across Web (`localStorage`) and native Android (QuickJS memory/file buffer).

```
┌──────────────────────────────────────┐
│ 🫟 12 — Cross-Platform Persistence  │
├──────────────────────────────────────┤
│ Offline Storage Buffer               │
│ [ Persistent notes saved across... ] │
│ [Save to Storage]    [Clear Storage] │
├──────────────────────────────────────┤
│ Persisted Data Value                 │
│ Persistent notes saved across...     │
└──────────────────────────────────────┘
```

## How It Works
- Helper checks for browser `localStorage`. When running inside QuickJS on Android, it falls back to a memory map or sandbox file.

## Commands
```bash
liquid dev
```
