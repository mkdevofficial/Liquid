# Liquid Examples Catalog 🫟

A collection of 20 focused, single-concept examples for the Liquid framework. Each example is under ~150 lines of `.liq` code, fully typed and tested, and runs on both **Web** and **native Android** with zero unsupported CSS diagnostics.

## Index of Examples

| ID | Title | Category | Difficulty | Platforms | Description |
|:---|:------|:---------|:-----------|:----------|:------------|
| [01](01-hello-components) | [Hello Components](01-hello-components) | Foundations | Beginner | Web, Android | Props with defaults, slots, and component composition |
| [02](02-signals-computed) | [Signals & Computed](02-signals-computed) | Foundations | Beginner | Web, Android | Fine-grained signals, computed derived state, and batching |
| [03](03-effects-lifecycle) | [Effects & Lifecycle](03-effects-lifecycle) | Foundations | Beginner | Web, Android | Side-effects, onMount, onCleanup, and interval timers |
| [04](04-conditional-rendering) | [Conditional Rendering](04-conditional-rendering) | Foundations | Beginner | Web, Android | if/else blocks, ternary operators, and view toggling |
| [05](05-lists-each-keys) | [Lists & Keyed Each](05-lists-each-keys) | Foundations | Beginner | Web, Android | Keyed each loops, minimal mutations, sorting & reordering |
| [06](06-forms-binding) | [Forms & Two-Way Binding](06-forms-binding) | Forms & Flow | Intermediate | Web, Android | Two-way $value binding on inputs, textareas, and checkboxes |
| [07](07-events-handlers) | [Events & Modifiers](07-events-handlers) | Forms & Flow | Intermediate | Web, Android | @click, @input, keydown modifiers (.enter), event dispatching |
| [08](08-props-slots-composition) | [Props, Slots & Composition](08-props-slots-composition) | Forms & Flow | Intermediate | Web, Android | Compound components and nested slot projection |
| [09](09-shared-store) | [Shared Store & Selectors](09-shared-store) | Forms & Flow | Intermediate | Web, Android | createStore, centralized mutations, and selector methods |
| [10](10-routing-params-query) | [Routing, Params & Queries](10-routing-params-query) | Forms & Flow | Intermediate | Web, Android | Dynamic route params (:id), query strings, and 404 views |
| [11](11-fetch-async-states) | [Async Data & Fetch States](11-fetch-async-states) | Advanced & Async | Intermediate | Web, Android | Loading, success, error, and retry states for async requests |
| [12](12-persistence-storage) | [Cross-Platform Persistence](12-persistence-storage) | Advanced & Async | Intermediate | Web, Android | localStorage with memory/file fallback on Android runtime |
| [13](13-styling-theming-dark-mode) | [Styling, Theming & Dark Mode](13-styling-theming-dark-mode) | Advanced & Async | Intermediate | Web, Android | Design tokens, light/dark mode, and WCAG AA contrast |
| [14](14-flexbox-layouts) | [Flexbox Layout Patterns](14-flexbox-layouts) | Advanced & Async | Intermediate | Web, Android | space-between, gap, wrap, and margin auto alignments |
| [15](15-timers-animation-signals) | [Timers & Signal Animations](15-timers-animation-signals) | Advanced & Async | Intermediate | Web, Android | Signal-driven animation loops and progress bar filling |
| [16](16-rtl-i18n) | [RTL & Internationalization](16-rtl-i18n) | Cross-Platform | Advanced | Web, Android | Bidirectional layout, dir="rtl", and CSS logical properties |
| [17](17-native-modules) | [Native Modules & APIs](17-native-modules) | Cross-Platform | Advanced | Web, Android | Calling native Android bridge modules with web fallbacks |
| [18](18-large-lists-scroll-performance) | [Large Lists & Scroll Perf](18-large-lists-scroll-performance) | Cross-Platform | Advanced | Web, Android | Rendering 500+ items with incremental chunk loading |
| [19](19-modals-overlays-absolute) | [Modals, Toasts & Overlays](19-modals-overlays-absolute) | Cross-Platform | Advanced | Web, Android | Absolute scrims, modal dialogs, and toast notifications |
| [20](20-error-handling-recovery) | [Error Handling & Recovery](20-error-handling-recovery) | Cross-Platform | Advanced | Web, Android | Isolated error boundaries and graceful user state recovery |

## Running an Example

```bash
# Navigate to any example directory
cd examples/01-hello-components

# Start the dev server
liquid dev

# Run unit tests
npm test
```
