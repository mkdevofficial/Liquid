# Liquid 🫟 — Framework Friction, DX Log & Real-World Stress Test Report (Masrouf App)

This log records every developer friction, awkward syntax workaround, missing shorthand, framework bug discovered and resolved, and a deep architectural comparison between Liquid, React, Svelte, and Vue while building **"Masrouf" (مصروف)** — a complete bilingual Arabic (RTL) / English (LTR) mobile expense tracker built strictly with the Liquid framework in this monorepo.

---

## Part 1: Framework Bugs Discovered & Fixed (10 Bugs)

During the construction and browser stress testing of Masrouf, 10 genuine framework bugs were uncovered in `packages/liquid-cli`, `packages/liquid-compiler`, `packages/liquid-router`, and `packages/liquid-runtime`. Every single one was diagnosed to root cause, resolved in framework packages, and covered with automated regression tests.

| Bug # | Package | Symptom | Root Cause | Fix & Location | Regression Test |
|---|---|---|---|---|---|
| **Bug 1** | `liquid-cli` | `liquid create apps/masrouf` failed during npm install with `EINVALIDPACKAGENAME`. | `create.js` used `name: projectName` verbatim without extracting `path.basename()` or stripping path slashes. | Sanitized package name using `path.basename` and regex in [`packages/liquid-cli/src/create.js`](file:///home/kali/Liquid/packages/liquid-cli/src/create.js). | [`packages/liquid-cli/tests/cli.test.js`](file:///home/kali/Liquid/packages/liquid-cli/tests/cli.test.js) |
| **Bug 2** | `liquid-router` | Consecutive routes reusing same component (e.g. `/transaction/new` -> `/transaction/:id`) failed to update parameters. | `RouterView` subscribed only to `currentComponent()`, which remained identical function pointer and didn't re-run. | `RouterView` now tracks `currentRoute()` inside its effect in [`packages/liquid-router/src/index.js`](file:///home/kali/Liquid/packages/liquid-router/src/index.js). | [`packages/liquid-router/tests/router.test.js`](file:///home/kali/Liquid/packages/liquid-router/tests/router.test.js) |
| **Bug 3** | `liquid-compiler` | Multi-line `import { ... } from '...'` broke compilation with `SyntaxError: Unexpected reserved word`. | `codegen.js` checked `line.startsWith('import ')`, extracting only line 1 and dumping trailing lines inside component function body. | Multi-line import state machine buffering imports until terminating specifier in [`packages/liquid-compiler/src/codegen.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/codegen.js). | [`packages/liquid-compiler/tests/compiler.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/compiler.test.js) |
| **Bug 4** | `liquid-compiler` | Syntax error on parenthesized each expressions `each (items as item (key))`. | `parseEachArgs` in `parser.js` failed regex matching because it did not strip balanced outer wrapping parentheses. | Stripped balanced outer parentheses before splitting `as` and key in [`packages/liquid-compiler/src/parser.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/parser.js). | [`packages/liquid-compiler/tests/parser.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/parser.test.js) |
| **Bug 5** | `liquid-compiler` & `runtime` | Standalone modifiers like `@click.stop` generated invalid JS `listen(el, "click", , ["stop"])`. | `codegen.js` emitted empty handler expression without fallback when directive lacked `=handler`. | Emitted `() => {}` fallback handler and added safety guard in `dom.js` in [`packages/liquid-compiler/src/codegen.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/codegen.js). | [`packages/liquid-compiler/tests/compiler.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/compiler.test.js) |
| **Bug 6** | `liquid-compiler` | Nested slotted components (e.g. `Layout` -> `Card` -> `form`) silently dropped inner slotted children. | `generateSubNode` in `codegen.js` ignored `n.children` on `ComponentNode` within nested blocks. | Propagated children into sub-slot functions recursively in [`packages/liquid-compiler/src/codegen.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/codegen.js). | [`packages/liquid-compiler/tests/compiler.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/compiler.test.js) |
| **Bug 7** | `liquid-router` | Entire page unmounted and remounted on the first character typed in any form input. | `RouterView` invoked `Comp(props)` directly inside its reactive `effect(...)`, causing any signal read during setup to subscribe the router effect. | Wrapped component setup in `untrack(() => currentComponent(props))` in [`packages/liquid-router/src/index.js`](file:///home/kali/Liquid/packages/liquid-router/src/index.js). | [`tests/masrouf-browser.test.js`](file:///home/kali/Liquid/tests/masrouf-browser.test.js) |
| **Bug 8** | `liquid-compiler` | Primitive method calls in loops (e.g. `m.split('-')` on primitive strings) threw `TypeError`. | `itemProxySetup` only proxied objects (`typeof val === 'object'`), returning undefined or throwing when accessing methods on boxed primitives. | Checked `prop in Object(val)` and bound method `res.bind(val)` in [`packages/liquid-compiler/src/codegen.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/codegen.js). | [`packages/liquid-compiler/tests/compiler.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/compiler.test.js) |
| **Bug 9** | `liquid-runtime` | Keyed `each` block nodes inside `if` branches were completely lost from the DOM. | Synchronous microtasks ran in FIFO order; `createEachBlock` ran before parent `if` anchor was attached, saw `anchor.parentNode === null`, and aborted permanently. | Reschedule microtask via `queueMicrotask` up to 20 times when `!anchor.parentNode` in [`packages/liquid-runtime/src/dom.js`](file:///home/kali/Liquid/packages/liquid-runtime/src/dom.js). | [`tests/masrouf-browser.test.js`](file:///home/kali/Liquid/tests/masrouf-browser.test.js) |
| **Bug 10** | `liquid-compiler` | Dynamic `class={...}` binding erased all static shorthand classes (e.g. `button.btn-confirm class={...}`). | `bindAttr(el, "class", ...)` called `setAttribute('class', ...)` which completely replaced `el.className`. | Compiler now merges shorthand classes with dynamic class expressions in [`packages/liquid-compiler/src/codegen.js`](file:///home/kali/Liquid/packages/liquid-compiler/src/codegen.js). | [`packages/liquid-compiler/tests/compiler.test.js`](file:///home/kali/Liquid/packages/liquid-compiler/tests/compiler.test.js) |

---

## Part 2: Top 10 Developer Friction Items & Proposed Syntax Improvements

As framework users building a complex, real-world bilingual application from scratch, the following 10 friction points caused the most friction, boilerplate, and mental friction. Each item includes current syntax, why it hurts, and a concrete proposed syntax improvement.

---

### Friction 1: Reactive Prop Passing & Static Component Execution
- **The Pain**: Components in Liquid execute once on initialization (`const Comp = Component(props)`). `defineProps()` returns a plain static object. Passing a dynamic expression like `open={showModal()}` evaluates `showModal()` once at mount time. The child component never observes subsequent changes unless wrapped in an outer `if showModal()` block or passed a raw getter function `open={showModal}`.
- **Current Workaround**:
  ```liq
  // History.liq
  if deleteTxId()
    ConfirmDialog onConfirm={confirmDelete} onCancel={cancelDelete}
      p {t('confirmDeleteMsg')}
  ```
- **Proposed Syntax**:
  Auto-wrap dynamic component props in getter accessors or reactive signals:
  ```liq
  ConfirmDialog open={deleteTxId()}
  ```
  The compiler emits:
  ```js
  ConfirmDialog({ get open() { return deleteTxId(); } })
  ```
  And `defineProps()` wraps returned properties in reactive proxies so `props.open` or destructured `$props()` automatically tracks inside effects.

---

### Friction 2: Strict Curly Braces on Attribute Expressions vs Identifiers
- **The Pain**: Writing `onConfirm=confirmDelete` treated `"confirmDelete"` as a literal string rather than an identifier. Because string attributes without `{}` are valid in HTML (`type="button"` or `title=Delete`), forgetting curly braces passed a string literal silently instead of the function reference.
- **Current Workaround**:
  Carefully wrap every callback or identifier in curly braces:
  ```liq
  ConfirmDialog onConfirm={confirmDelete} onCancel={cancelDelete}
  ```
- **Proposed Syntax**:
  Disambiguate event/callback props (`on[A-Z]*` or `@event`) so unquoted identifiers automatically compile as JavaScript expressions:
  ```liq
  ConfirmDialog onConfirm=confirmDelete onCancel=cancelDelete
  ```
  If unquoted value matches an in-scope variable/function name, treat as `{confirmDelete}`.

---

### Friction 3: Signal Read Parentheses `sig()` Boilerplate in UI Expressions
- **The Pain**: Unlike Svelte where variables are plain values (`count`), Liquid signals require parentheses (`currentLang()`, `filterType() === 'all'`). While proxying solved this for `each` loops (`item.id`), all top-level signals require explicit `()`.
- **Current Workaround**:
  ```liq
  button class={filterType() === 'income' ? 'is-active' : ''}
    span {currentLang() === 'ar' ? 'English' : 'عربي'}
  ```
- **Proposed Syntax**:
  Compiler auto-unwrapping for declared signals in template expressions:
  ```liq
  button class={filterType === 'income' ? 'is-active' : ''}
    span {currentLang === 'ar' ? 'English' : 'عربي'}
  ```
  The compiler's scope analyzer already knows which imported identifiers are signals; it can auto-insert `()` inside UI template bindings.

---

### Friction 4: Text Node Line Wrapping & Multi-Line Text
- **The Pain**: Liquid templates require indentation. Writing mixed inline markup and text (e.g. "Showing 9 transactions") required splitting into `span`, `text`, or `| ` pipes:
  ```liq
  div.list-header
    span.list-count Showing {paginatedTransactions().length} transactions
  ```
  If text spans multiple lines or contains quotes, it often triggers tag parser ambiguities if the line starts with an unknown word.
- **Current Workaround**:
  Prefix plain text lines with `| `:
  ```liq
  p
    | All transactions are stored locally on your device.
    | No server or cloud required.
  ```
- **Proposed Syntax**:
  Multi-line text block syntax with `|` or backticks:
  ```liq
  p """
    All transactions are stored locally on your device.
    No server or cloud required.
  """
  ```

---

### Friction 5: Scoped Dynamic CSS Classes
- **The Pain**: Setting conditional classes required verbose ternary expressions:
  ```liq
  span.tx-amount class={isIncome ? 'is-income' : 'is-expense'}
  ```
  Combining 3 or 4 flags became deeply nested ternaries or array joins.
- **Current Workaround**:
  ```liq
  div.item class={`${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
  ```
- **Proposed Syntax**:
  Object class binding or directive shorthand (similar to Svelte `class:name={cond}`):
  ```liq
  span.tx-amount class:is-income={isIncome} class:is-expense={!isIncome}
  // OR object syntax:
  span.tx-amount class={{ 'is-income': isIncome, 'is-expense': !isIncome }}
  ```

---

### Friction 6: Form Input Two-Way Binding Modifiers (Number, Trim)
- **The Pain**: `$bind=amount` binds the raw input element string value. For numeric inputs (`<input type="number">`), the signal receives a string (`"185.50"`), requiring manual conversion `Number(val)` everywhere before arithmetic.
- **Current Workaround**:
  Manually casting strings to numbers in actions and stores:
  ```js
  const parsed = parseFloat(amount()) || 0;
  ```
- **Proposed Syntax**:
  Type-coercing binding directives:
  ```liq
  input type="number" $bind.number=amount
  input type="text" $bind.trim=searchQuery
  ```

---

### Friction 7: Slot Default Props and Fallback Slotted Scopes
- **The Pain**: Passing data back up to slots (scoped slots / slot props) is currently impossible in Liquid. Components can only render children blindly via `slot` or `slot name="header"`.
- **Current Workaround**:
  Child components must expose dedicated child components (like `TransactionItem`) and have parent pages loop and render them explicitly.
- **Proposed Syntax**:
  Scoped slot arguments:
  ```liq
  // In List.liq:
  slot item={item} index={idx}
  
  // In caller:
  List items={transactions()}
    slot item as tx
      TransactionItem transaction={tx}
  ```

---

### Friction 8: Direct SVG Rendering in Liquid Templates
- **The Pain**: While HTML tags are recognized by the parser, SVG elements (like `<svg>`, `<rect>`, `<path>`) require exact casing and namespace handling. In `BarChart.liq`, building an interactive bar chart with plain SVG elements required calculating percentages as strings:
  ```liq
  div.chart-bar style={`height: ${pct}%; background: ${item.color}`}
  ```
- **Current Workaround**:
  Drew responsive bar charts using CSS Flexbox layout and styled reactive divs rather than raw SVG namespaces.
- **Proposed Syntax**:
  Native SVG namespace tag recognition (`svg`, `path`, `g`, `circle`, `rect`) with `style:prop={val}` directive:
  ```liq
  div.chart-bar style:height={`${pct}%`} style:background={item.color}
  ```

---

### Friction 9: Global CSS Import & Shared Design Tokens
- **The Pain**: Component styles are strictly scoped by appending `[data-l-hash]`. Defining global design variables (`--primary`, `--bg-page`, etc.) required wrapping the root rules in `@global { :root { ... } }` in `App.liq`. Because `@global` rules are unscoped, developers have to be cautious with specificity collisions.
- **Current Workaround**:
  ```css
  @global {
    :root {
      --primary: #0284c7;
      --bg-page: #0f172a;
    }
  }
  ```
- **Proposed Syntax**:
  First-class support for `style global` section or importing plain `.css` stylesheets:
  ```liq
  --- style global
  :root {
    --primary: #0284c7;
  }
  ```

---

### Friction 10: Head Meta Tag & Title Reactivity
- **The Pain**: Setting page titles (`document.title`) or viewport meta tags required either importing `@modules/liquid-runtime/src/head.js` manually or running an effect in `Layout.liq`:
  ```js
  effect(() => {
    document.title = pageTitle || t('appTitle');
  });
  ```
- **Current Workaround**:
  Effect in `Layout.liq` updating `document.title` and `document.documentElement.dir`.
- **Proposed Syntax**:
  Built-in `<head>` or `Title` component in `.liq` templates:
  ```liq
  Head
    title {pageTitle} — Masrouf 🫟
    meta name="description" content="Personal bilingual expense tracker"
  ```

---

## Part 3: Framework Comparison — Liquid vs React vs Svelte vs Vue

| Dimension | **Liquid 🫟** | **React 19** | **Svelte 5** | **Vue 3.5** |
|---|---|---|---|---|
| **Reactivity Model** | **Fine-grained signals** (`signal`, `computed`, `effect`). No VDOM. Direct DOM mutations. | **Coarse VDOM diffing** (`useState`, `useMemo`). Re-renders entire component tree on state changes. | **Runes & Signals** (`$state`, `$derived`, `$effect`). Compiler transforms to direct DOM updates. | **Proxies & Signals** (`ref`, `computed`, `watchEffect`). Hybrid VDOM + compiler optimization. |
| **Component Execution** | **Setup runs ONCE**. Component function returns DOM nodes; effects subscribe to signals. | **Runs on every render**. Must use hooks (`useCallback`, `useMemo`, `useRef`) to avoid recreating closures. | **Setup runs ONCE**. Fine-grained code runs when signals change. | **Setup runs ONCE** (`<script setup>`). Template compiles to render function tracking refs. |
| **Syntax & File Format** | **Indent-based `.liq`** (`--- logic`, `--- style`, `--- ui`). No closing tags. Mobile-keyboard optimized. | **JSX / TSX**. Angle brackets, closing tags, JS inside `{}`. Verbose on mobile keyboards. | **HTML-superset `.svelte`** (`<script>`, `<style>`, HTML + `{#if}`, `{#each}`). | **SFC `.vue`** (`<script setup>`, `<template>`, `<style scoped>`). |
| **CSS Scoping** | **Zero-overhead scoped attributes** (`[data-l-hash]`) + `:global()` & `@global {}` escape hatches. | No built-in scoping (relies on CSS Modules, Tailwind, or CSS-in-JS libraries). | **Built-in scoped `<style>`** using CSS classes. Removes unused selectors. | **Built-in `<style scoped>`** using attribute selectors (`data-v-xxx`). |
| **Two-Way Binding** | **Built-in `$bind=sig`** directive for input/change events. | Manual `value={val} onChange={e => setVal(e.target.value)}`. | **`bind:value={val}`** compiler directive. | **`v-model="val"`** directive. |
| **Bundle Size & Footprint** | **~22 kB gzipped runtime + router + compiler**. 0 external dependencies. | React + ReactDOM is ~45 kB gzipped without router or state library. | Svelte runtime is ~2-4 kB gzipped (compiler-heavy output). | Vue runtime is ~16-20 kB gzipped (includes full VDOM). |
| **Mobile & Constraint Portability** | **100% pure JS ESM**. No native binaries, no Rust, no C++. Installs in seconds on Termux Android / low-spec VPS. | Requires Node + large build pipelines (Webpack, Vite, Rollup, native esbuild). | Requires Vite + native Rollup/esbuild binaries. | Requires Vite + native Rollup/esbuild binaries. |
| **DX Strengths** | Ultra-concise, fast compile (<100ms), no VDOM overhead, instant dev server HMR with pure SSE. | Massive ecosystem, huge hiring pool, rich third-party library availability. | Excellent ergonomic runes, minimal boilerplate, great animations. | Gentle learning curve, great official tooling (Pinia, Vue Router), flexible reactivity. |
| **DX Weaknesses** | Immature ecosystem, custom indent syntax requires muscle memory, manual prop reactivity in current version. | Hook dependency arrays (`useEffect`), stale closures, frequent re-rendering bugs. | Transition between Svelte 4 and Svelte 5 runes caused ecosystem fragmentation. | Options API vs Composition API duality; ref `.value` unwrapping inconsistency. |

---

## Part 4: Verification & Test Results

The Masrouf application and Liquid framework changes have been comprehensively verified across automated unit, CLI, and real browser engine tests:

1. **Full User Flow in Real Headless Chromium**:
   - Driven by character-by-character native typing (`keydown`, `beforeinput`, `input`, `keyup`).
   - Adding transactions with numeric float formatting (`185.50`), category selection, Arabic text notes.
   - Live editing of transaction note (`Updated Family Feast 🍲`).
   - Live searching and multi-attribute filtering.
   - Delete confirmation dialog interaction and verified list reconciliation.
   - Language toggle (`ar` RTL <-> `en` LTR) and theme toggle (`dark` <-> `light`).
   - LocalStorage persistence across page reload (`Page.reload`).
   - JSON export and backup verification.
   - **Result**: `✔ Masrouf E2E - Full User Flow driven by real character typing in headless browser (PASSED)`.

2. **CSS Parity Test (Dev Mode vs Production Preview)**:
   - Scraped all computed CSS styles (display, flex, grid, colors, padding, borders, typography) across 4 states (`ar-dark`, `ar-light`, `en-dark`, `en-light`) in `liquid dev` and compared against `liquid preview` production build.
   - **Result**: `✔ Masrouf CSS Parity - dev mode and preview mode computed styles match across languages and themes (PASSED)`.

3. **Full Monorepo Test Suite**:
   - `npm test`: **68 / 68 tests passing (0 failures, 0 regressions)**.
   - `liquid check apps/masrouf`: **22 / 22 `.liq` files valid**.

---

## Part 5: "Learn Liquid" Documentation Web App — Insights & Ergonomic Enhancements

While developing the **"Learn Liquid" (تعلم ليكويد)** documentation and guide website in `apps/learn-liquid/`, the following key framework ergonomics and compiler patterns were encountered and improved:

### 1. Dual Accessor & `.value` Ergonomics on Signals & Computeds
- **Issue**: Developers coming from Preact Signals or Vue 3 `ref()` frequently write `signal.value` to read and assign values, rather than callable accessor `signal()` / `signal.set()`. This previously threw `TypeError: Cannot read properties of undefined` at runtime.
- **Enhancement**: Added enumerable `value` getter/setter on `signal()` accessors and `value` getter on `computed()` accessors in `packages/liquid-runtime/src/signals.js`. Both `sig()` and `sig.value` work identically and interchangeably with zero performance overhead.

### 2. Code Example Literals Containing Section Boundaries
- **Issue**: When writing documentation that includes `.liq` code snippets inside template strings in `--- logic`, writing raw `--- logic` or `--- style` or `--- ui` on a new line matched `rawLine.match(/^---\s*(logic|style|ui)/)` in `tokenizer.js`, prematurely truncating the logic section.
- **Solution / Best Practice**: Use constant concatenation `${'---' + ' logic'}` or `${SEC_LOGIC}` in code example strings to prevent the section tokenizer from misinterpreting code snippets as section headers.

### 3. Pug-Style Control Flow vs Angle Brackets
- **Insight**: In `.liq` templates, conditionals and loops follow Pug-style syntax (`if condition`, `else if condition`, `else`, `each items as item (item.id)`). Writing `<if>` or `<each>` causes the compiler to treat them as custom HTML tag elements and emit `document.createElement('<if')`, throwing `DOMException: InvalidCharacterError`. Clear documentation was added in Chapter 5 explaining the Pug-style syntax clearly.

### 4. Unquoted Leading Symbols in Text
- **Insight**: Words starting with `$` or `@` at the start of a child text token are parsed as `$bind` or `@event` directives. Literal currency signs or directive names in text should be quoted (`span "$bind"` or `span {'$' + amount}`) to avoid being parsed as empty directives.

### 5. Verification:
- `node --test tests/learn-liquid-browser.test.js`: **100% Passed in Real Headless Chromium** (10 assertions verifying mount, hero, live counter increment, routing across 4 pages, RTL/LTR language switcher, and Dark/Light theme switcher).
- `node --test apps/learn-liquid/tests/learn-liquid.test.js`: **4/4 Unit tests passing**.
- `liquid check apps/learn-liquid`: **39/39 `.liq` files valid**.
