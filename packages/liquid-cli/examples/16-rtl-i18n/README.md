# 16 — RTL & Internationalization 🫟

Demonstrates bidirectional layout mirroring, CSS logical properties (`border-inline-start`, `margin-inline`), and real-time `dir="rtl"` toggling.

```
┌──────────────────────────────────────┐
│ 🌙 ليكويد ثنائي الاتجاه              │
├──────────────────────────────────────┤
│ [يمين ← يسار]    دعم العربية والاتجاه │
│ تستخدم هذه البطاقة الخصائص المنطقية.. │
│ [التبديل إلى اليسار (LTR)]           │
└──────────────────────────────────────┘
```

## How It Works
- Layout direction inherits down the view tree (`dir="rtl"`).
- Kotlin `LiquidFlexLayout` flips flex row placement and cross-axis start/end alignments.
- CSS logical properties mirror automatically without media queries or duplicated stylesheets.

## Commands
```bash
liquid dev
```
