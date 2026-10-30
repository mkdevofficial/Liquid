# Liquid 🫟

> **The ultra-concise frontend framework for the web.**
> Less ceremony, shortest possible UI syntax, fine-grained reactivity, tiny runtime (< 5 KB gzipped), 100% pure JavaScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Pure JS](https://img.shields.io/badge/Dependencies-Pure_JavaScript-brightgreen.svg)](#environment-constraints)
[![Runtime Size](https://img.shields.io/badge/Runtime-<5KB_gzipped-success.svg)](#runtime)

---

## ⚡ 5-Minute Quick Start

### 1. Create a Project
```bash
# Create a standard app with examples
npx liquid create my-app

# Or create a minimal starter app
npx liquid create my-app --minimal
```

### 2. Run the Development Server
```bash
cd my-app
npm run dev
```
Liquid starts the local development server with instant rebuilds and Hot Module Reloading (HMR):
```
  🫟 Liquid dev v1.0.0
  The ultra-concise frontend framework for the web

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.50:3000/
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 💡 What Makes Liquid Different?

1. **Shortest Possible UI Syntax**: Structure is defined purely by **2-space indentation**. No angle brackets (`<>`), no closing tags (`</div>`), and no braces.
2. **Fine-Grained Reactivity**: No Virtual DOM and no component re-rendering. When a signal updates, only the exact DOM text node or attribute changes.
3. **Tiny Core Runtime (< 5 KB gzipped)**: Full reactivity engine, DOM helpers, and keyed list reconciliation in under 5 KB gzipped.
4. **100% Pure JavaScript**: Zero native C/C++ addons, Rust binaries, or platform-specific downloads. Runs seamlessly on **Termux (Android AArch64)**, **GitHub Codespaces**, **Raspberry Pi**, and standard **Linux/macOS/Windows**.
5. **Compile-Time Work**: Scoped CSS, dependency tracking, component auto-imports, and source maps are resolved ahead of time.

---

## 📝 The `.liq` Single-File Component

A `.liq` file combines logic, styles, and indentation-based UI:

```liquid
--- logic
import { signal, computed } from 'liquid';

const count = signal(0);
const double = computed(() => count() * 2);

function inc() {
  count.set(count() + 1);
}

--- style
.counter-box {
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.btn {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

--- ui
div.counter-box
  h2 Counter
  p Count: {count()} (Double: {double()})
  button.btn @click=inc +1
  if count() > 10
    p.badge High count reached!
```

---

## 🔤 Syntax at a Glance

| Feature | Syntax | Example |
|---|---|---|
| **Element** | `tag#id.class` | `button#submit.btn.primary Submit` |
| **Interpolation** | `{expr}` | `span Hello, {user.name}!` |
| **Event** | `@event=handler` | `button @click=increment` |
| **Modifiers** | `@event.mod=handler` | `form @submit.prevent=onSave` |
| **Two-Way Binding** | `$attr={sig}` | `input $value={name}` or `input $={name}` |
| **Conditionals** | `if` / `elseif` / `else` | `if isReady() \n  p Ready!` |
| **Keyed Loops** | `each coll as item (key)` | `each todos() as t (t.id) \n  li {t.text}` |
| **Components** | `CapitalizedTag` | `Card title="Dashboard" \n  p Content` |
| **Slots** | `slot` | `div.wrapper \n  slot` |
| **Scoped CSS** | `--- style` | `.card { color: red; }` |
| **Global Escape** | `:global(sel)`, `@global`| `:global(.dark) { background: #000; }` |

For complete language specifications, see [docs/syntax.md](docs/syntax.md).

---

## ⚡ Reactivity (Explicit Signals)

State is created explicitly using signals:

```javascript
import { signal, computed, effect, batch, untrack } from 'liquid';

// Reactive read/write cell
const count = signal(0);
count();        // Read: 0
count.set(5);   // Write: 5
count.update(n => n + 1); // Update: 6

// Derived lazy computation
const isEven = computed(() => count() % 2 === 0);

// Side effects with automatic cleanup
const dispose = effect(() => {
  console.log(`Current count: ${count()}`);
  return () => console.log('Cleanup previous effect');
});

// Batch multiple signal updates into one synchronous flush
batch(() => {
  count.set(10);
});
```

For in-depth reactivity documentation, see [docs/reactivity.md](docs/reactivity.md).

---

## 🛠️ CLI Commands

The `liquid` CLI comes with pure-JS commands designed for developer productivity:

| Command | Description |
|---|---|
| `liquid create <name>` | Scaffold a new project (`--minimal` for bare template) |
| `liquid dev` | Start development server with instant rebuild and SSE hot reload |
| `liquid build` | Build production bundle with scoped CSS extraction and minification |
| `liquid preview` | Serve the production build locally with SPA route fallback |
| `liquid check` | Validate all `.liq` files across the project without building |

Supports configurable ports and hosts (`-p, --port`, `-h, --host`) and displays local and LAN URLs for mobile phone testing.

---

## 🌍 Full RTL and Arabic Support

Liquid offers first-class support for Right-To-Left (RTL) languages like Arabic out of the box:

```liquid
--- logic
import { signal } from 'liquid';
const tasks = signal([
  { id: 1, title: 'كتابة واجهة مستخدم فائقة السرعة' }
]);

--- ui
div dir="rtl" lang="ar"
  h1 أهلاً بكم في إطار العمل ليكويد 🫟
  ul
    each tasks() as task (task.id)
      li {task.title}
```

---

## 📦 Monorepo Architecture

The framework is organized into decoupled, tree-shakeable packages:

- [`packages/liquid`](packages/liquid): The primary all-in-one package.
- [`packages/liquid-compiler`](packages/liquid-compiler): Standalone pure-JS compiler (`compile(source, options)`).
- [`packages/liquid-runtime`](packages/liquid-runtime): Fine-grained signals, DOM creation, and built-ins (`createStore`, `head`).
- [`packages/liquid-router`](packages/liquid-router): Tree-shakeable router with hash/history modes and params.
- [`packages/liquid-cli`](packages/liquid-cli): Command-line interface and development server.

---

## 📚 Documentation Links

- [Complete Syntax Reference](docs/syntax.md)
- [Reactivity & Signals Guide](docs/reactivity.md)
- [Compiler Architecture & API](docs/compiler.md)
- [Architectural Decisions (DECISIONS.md)](DECISIONS.md)

---

## 📄 License

MIT © Google DeepMind
