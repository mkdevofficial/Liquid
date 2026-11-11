# Liquid Focused Examples 🫟

Liquid includes a rich library of 20 concise, self-contained example applications (under ~150 lines of `.liq` each). Every example targets both **Web** and **native Android** with zero dependencies.

You can explore and run examples directly with the `liquid examples` command:
```bash
# List all 20 examples
liquid examples

# Run an example immediately in the dev server
liquid examples 01-hello-components

# Copy an example to your current directory to inspect and modify
liquid examples 01-hello-components --copy
```

---

## Example Catalog

| # | ID | Category | Difficulty | Highlights |
|:---:|---|---|:---:|---|
| 01 | `01-hello-components` | Foundations | Beginner | Component composition, `defineProps` with defaults, slot projection |
| 02 | `02-signals-computed` | Foundations | Beginner | Fine-grained reactivity, signals, computed derived values, batched updates |
| 03 | `03-effects-lifecycle` | Foundations | Beginner | Lifecycle management, `effect`, `onMount`, `onCleanup`, timers |
| 04 | `04-conditional-rendering` | Foundations | Beginner | Branching UI with `if` / `else` blocks, boolean signals, and toggles |
| 05 | `05-lists-each-keys` | Foundations | Beginner | Keyed list rendering with `each` loops, dynamic additions and removals |
| 06 | `06-forms-binding` | Forms & Flow | Intermediate | Two-way signal binding with `$value`, text inputs, checkboxes, radios |
| 07 | `07-events-handlers` | Forms & Flow | Intermediate | Event listeners, event modifiers (`.enter`, `.prevent`), and synthetic payloads |
| 08 | `08-props-slots-composition` | Forms & Flow | Intermediate | Compound components, layout projection, fallback slot content |
| 09 | `09-shared-store` | Forms & Flow | Intermediate | Centralized state management with `createStore`, actions, and selectors |
| 10 | `10-routing-params-query` | Forms & Flow | Intermediate | Client-side routing, URL route parameters (`:id`), and query strings |
| 11 | `11-fetch-async-states` | Advanced & Async | Intermediate | Asynchronous HTTP requests, loading spinners, error alerts, retries |
| 12 | `12-persistence-storage` | Advanced & Async | Intermediate | Cross-platform persistence (`localStorage` with Android memory fallback) |
| 13 | `13-styling-theming-dark-mode` | Advanced & Async | Intermediate | Design tokens, dynamic theme switching (Light / Dark mode) |
| 14 | `14-flexbox-layouts` | Advanced & Async | Intermediate | Cross-platform flexbox: `space-between`, `align-items`, `gap`, auto margins |
| 15 | `15-timers-animation-signals` | Advanced & Async | Intermediate | Signal-driven animations, progress bars, countdown intervals |
| 16 | `16-rtl-i18n` | Cross-Platform & Edge Cases | Advanced | RTL layout mirroring, CSS logical properties, multilingual text |
| 17 | `17-native-modules` | Cross-Platform & Edge Cases | Advanced | Android platform bridge invocation with graceful Web fallback |
| 18 | `18-large-lists-scroll-performance` | Cross-Platform & Edge Cases | Advanced | 500+ list elements rendered smoothly with optimal memory profile |
| 19 | `19-modals-overlays-absolute` | Cross-Platform & Edge Cases | Advanced | Absolute positioning, scrim backdrops, modal dialogs, and toast banners |
| 20 | `20-error-handling-recovery` | Cross-Platform & Edge Cases | Advanced | Error boundary patterns, computation error handling, recovery UI |

---

## Running and Testing Examples

All 20 examples have dedicated unit tests and can be verified individually or in bulk:

```bash
# Run tests for a specific example
node --test examples/01-hello-components/test.js

# Run full unified verification across all templates and examples
npm run verify:all-templates
```
