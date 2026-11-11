# 06 — Forms & Two-Way Binding 🫟

Demonstrates two-way data binding with `$value={signal}` across inputs, textareas, selection groups, and boolean checkboxes.

```
┌──────────────────────────────────────┐
│ 🫟 06 — Forms & Two-Way Binding      │
├──────────────────────────────────────┤
│ Full Name                            │
│ [ Alex Morgan                      ] │
│ Bio                                  │
│ [ Passionate mobile and web...     ] │
│ Plan: [Free] [Pro] [Enterprise]      │
│ [✓] Receive developer updates        │
├──────────────────────────────────────┤
│ Live State Preview                   │
│ Name: Alex Morgan | Plan: pro        │
└──────────────────────────────────────┘
```

## How It Works
- `$value={signal}` establishes bidirectional synchronization between input DOM/native event dispatchers and signal values.
- Updates happen automatically on `@input` without writing manual event listeners.

## Commands
```bash
liquid dev
```
