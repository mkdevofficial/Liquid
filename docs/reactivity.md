# Liquid 🫟 Reactivity (Explicit Signals)

Liquid employs **fine-grained reactivity powered by explicit signals**. State is never implicitly or magically reactive; all reactive cells and derived computations are created via explicit primitives.

---

## 1. Core Primitives

### `signal(initialValue, equals?)`
Creates a reactive state cell. Returns a callable accessor:

```javascript
import { signal } from 'liquid';

// Create a signal
const count = signal(0);

// 1. Read value (registers active effect as subscriber)
console.log(count()); // 0

// 2. Write value (notifies subscribers if value changed)
count(1);
count.set(5);

// 3. Functional update
count.update(prev => prev + 1);

// 4. Non-reactive peek (reads value without subscribing)
const currentValue = count.peek();
```

### `computed(computeFn, equals?)`
Creates a derived, lazily-evaluated signal. Computed signals only rerun when dirty and read:

```javascript
import { signal, computed } from 'liquid';

const first = signal('John');
const last = signal('Doe');

const fullName = computed(() => {
  return `${first()} ${last()}`;
});

// fullName is not evaluated until read
console.log(fullName()); // "John Doe"

first.set('Jane');
// dirty flag set, recomputed on next read:
console.log(fullName()); // "Jane Doe"
```

### `effect(effectFn)`
Runs immediately, tracks any signals read during execution, and reruns whenever those signals change. Supports returning a cleanup callback:

```javascript
import { signal, effect } from 'liquid';

const count = signal(0);

const dispose = effect(() => {
  const current = count();
  console.log(`Count changed to ${current}`);

  return () => {
    console.log(`Cleaning up previous state ${current}`);
  };
});

count.set(1);
// Logs:
// "Cleaning up previous state 0"
// "Count changed to 1"

// Stop tracking and clean up:
dispose();
```

### `batch(batchFn)`
Groups multiple signal writes into a single synchronous update, guaranteeing glitch-free propagation and eliminating duplicate effect runs:

```javascript
import { signal, computed, effect, batch } from 'liquid';

const a = signal(1);
const b = signal(2);
const sum = computed(() => a() + b());

effect(() => {
  console.log(`Sum is: ${sum()}`);
});

// Logs: "Sum is: 3"

batch(() => {
  a.set(10);
  b.set(20);
});

// Logs: "Sum is: 30" (Only ONE effect run, never intermediate 12 or 21)
```

### `untrack(fn)`
Runs a function without registering any reactive subscriptions for signals accessed within it:

```javascript
import { signal, effect, untrack } from 'liquid';

const count = signal(0);
const multiplier = signal(2);

effect(() => {
  const c = count();
  // Read multiplier without subscribing to multiplier changes:
  const m = untrack(() => multiplier());
  console.log(c * m);
});
```

---

## 2. Scopes and Automatic Lifecycle Disposal

### `createScope(fn)`
Effects created during component mounting, inside conditionals (`if`), or inside list loops (`each`) are bound to an effect scope. When a component or DOM branch is destroyed, `scope.dispose()` automatically cleans up all subscriptions and event listeners:

```javascript
import { createScope, effect, onDestroy } from 'liquid';

const scope = createScope(() => {
  effect(() => { ... });

  onDestroy(() => {
    console.log('Unmounted and cleaned up');
  });
});

// Tear down everything inside this scope:
scope.dispose();
```

### `onDestroy(cleanupFn)`
Registers a teardown callback in the current active scope.

### `onMount(mountFn)`
Registers an asynchronous or post-render lifecycle hook. May optionally return a cleanup function.

---

## 3. Fine-Grained DOM Updates

Liquid does **not** use a Virtual DOM (VDOM), and components **never re-render as a whole**. Instead:

1. When a `.liq` file compiles, the compiler detects all dynamic interpolations (`{expr}`), attribute bindings (`$value={sig}`), and conditions (`if expr`).
2. It generates direct DOM element creation (`element()`) and direct text nodes (`text()`).
3. Each dynamic node subscribes directly to the signals it reads via `bindText()`, `bindAttr()`, or `bindInput()`.
4. When `count.set(count() + 1)` executes, **only the single text node** (`targetNode.data = count()`) updates directly in the DOM.

```
Signal Change (count = 1)
      │
      ▼
Direct TextNode mutation (textNode.data = "1")
(No VDOM diffing, No component function re-execution)
```
