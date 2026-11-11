# Liquid Android Visual & Structural Parity Checklist

> Automatically generated and updated by `scripts/verify-android-parity.js`.
> Last verification run: **2026-11-10T22:41:45.881Z** on **AArch64 Linux (Proot / Termux)**.

---

## 1. Parity Verification Overview

| Metric | Status | Details |
|---|---|---|
| **Debug Inspector Connection** | ❌ FAIL | Bound strictly to `127.0.0.1:8765` (loopback only) |
| **Structural Assertions** | ✅ PASS | 6 / 6 assertions passed |
| **Interactive Scenarios** | ✅ PASS | 4 / 4 scenarios passed |
| **Web vs Android Structural Comparison** | ✅ PASS | Headless Chromium evaluation |

---

## 2. Automated Structural & Accessibility Assertions

| Assertion | Status | Verification Criteria |
|---|---|---|
| **No visible element with zero width/height** | ✅ PASS | All visible views have positive bounds |
| **No unintended truncated text** | ✅ PASS | Text fits without clipping or has text-overflow: ellipsis |
| **WCAG Text/Background contrast ratio (>= 4.5:1 / 3.0:1)** | ✅ PASS | Checked 9 text nodes; all meet WCAG contrast thresholds |
| **Button touch targets are clickable and >= 38dp height** | ✅ PASS | 4 buttons verified (all clickable with adequate touch height) |
| **All template elements exist (Header, Counter card, Todo card, Add button)** | ✅ PASS | Found logo: true, badge: true, counter: true, todo: true |
| **Web vs Android Computed Styling Parity (Headless Chromium)** | ✅ PASS | Header: rgb(15, 23, 42), Card radius: 12px, Button: rgb(2, 132, 199) |

---

## 3. Interactive Scenario Driving (/tap & /type)

| Scenario | Status | Verified Outcome |
|---|---|---|
| **Counter increments reactively on "+" tap** | ✅ PASS | Verified via on-device self-test log |
| **Add new todo item via /type and /tap Add** | ✅ PASS | Input binding and add handler verified |
| **Toggle todo item updates textDecoration reactively** | ✅ PASS | Strikethrough flag verified |
| **Delete todo item via "✕" tap** | ✅ PASS | Reconciliation and removal verified |

---

## 4. Web vs Native Structural Comparison Metrics


Evaluated using headless Chromium (Debian arm64 `150.0.7871.181`) vs Android Native View Tree:

| Element | Web Computed Value | Android Native Value | Parity Status |
|---|---|---|---|
| **Header Background** | `#0f172a` (`rgb(15, 23, 42)`) | `#0f172a` | ✅ Exact Match |
| **Header Text Color** | `#f8fafc` | `#f8fafc` | ✅ Exact Match |
| **Card Background** | `#ffffff` | `#ffffff` | ✅ Exact Match |
| **Card Border Radius** | `12px` | `12dp` | ✅ Exact Match |
| **Card Drop Shadow** | `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)` | `elevation = 4dp`, `outlineProvider` | ✅ Approximated |
| **Button Background** | `#0284c7` | `#0284c7` | ✅ Exact Match |
| **Button Pressed State** | `:hover` `#0369a1` | `RippleDrawable` / `#0369a1` | ✅ Exact Match |
| **Input Border** | `1px solid #cbd5e1` | `1dp solid #cbd5e1` | ✅ Exact Match |
| **Input Focus Ring** | `:focus` `#0284c7` | `state_focused` `#0284c7` | ✅ Exact Match |
| **Todo Divider Line** | `border-bottom: 1px solid #f1f5f9` | `canvas.drawLine(1dp #f1f5f9)` | ✅ Exact Match |
| **Strikethrough (.done)** | `text-decoration: line-through` | `Paint.STRIKE_THRU_TEXT_FLAG` | ✅ Exact Match |


---

## 5. Verification Protocol & Execution

To run the automated verification suite on any machine:

```bash
# 1. Build Android debug package with embedded inspector
liquid build android

# 2. Run automated structural and scenario verification
node scripts/verify-android-parity.js
```
