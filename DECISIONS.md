# Architectural Decisions — Liquid 🫟

This document records every non-trivial decision made in the design and implementation of the **Liquid** frontend framework.

---

## 1. Pure JavaScript Ecosystem & Portability
- **Decision**: Avoid all native C/C++ addons, Rust binaries, and platform-specific postinstall downloads (e.g. native esbuild/swc/rollup binary packages). All framework code, runtime, compiler, and CLI are written in 100% pure JavaScript (ESM).
- **Rationale**: The framework must install and execute smoothly in constrained environments like Termux (proot-distro Debian, AArch64 Android), GitHub Codespaces, low-spec servers, and standard Linux x86_64 without compilation toolchains (`make`, `gcc`, `python`, `node-gyp`) or glibc/musl binary incompatibilities.
- **HMR / Dev Server Protocol**: Use native HTTP Server-Sent Events (`EventSource('/__liquid_hmr')`) for hot module reloading rather than WebSockets. SSE is supported out-of-the-box by all modern browsers and requires zero third-party networking dependencies.

---

## 2. `.liq` File Format and Section Boundaries
- **Decision**: A `.liq` file contains up to three optional sections: `logic`, `styles`, and `ui`.
- **Section Headers**: Delimited by `--- <section-name>` at column 0.
  - `--- logic` (or alias `--- js`): JavaScript ES module logic, signal declarations, lifecycle hooks.
  - `--- style` (or alias `--- css`): Scoped CSS rules.
  - `--- ui` (or any lines outside/after headers): Indentation-based template structure.
- **Rationale**: Triple-dash section headers (`---`) are standard, visually clean, Markdown/frontmatter-like, and trivial to type on mobile keyboards (the hyphen `-` is readily available on the primary symbol keyboard layout).

---

## 3. UI Template Syntax & Indentation
- **Decision**: Structure is defined by 2-space indentation with strict indentation validation.
  - **Tabs & Spaces**: Mixed tabs and spaces are strictly rejected with an explicit error specifying the line, column, and caret excerpt. Standard indent width is 2 spaces.
  - **Element Syntax**: `tag#id.class1.class2 attr="val" attr={expr} inline text`
  - **Plain Text**: Inline on element line, or child lines. Child text lines can either be preceded by the explicit text marker `| ` (e.g. `| Hello world`) or written directly as child lines when they do not match HTML tags, capitalized components, or control flow keywords.
  - **Interpolation**: `{expression}`. Escaping is done via `\{`.
  - **Event Directives**: `@event=handler` or `@event.modifier=handler`.
    - Supported modifiers: `.prevent` (or `.prev`), `.stop`, `.once`.
  - **Two-Way Binding**: `$value={sig}`, `$checked={sig}`, and shorthand `$={sig}`.
  - **Conditionals**: Keyword elements `if condition`, `elseif condition` (or `else if condition`), and `else`.
  - **Loops**: `each collection as item (key)` and `each collection as item, index (key)`.
  - **Components**: Any capitalized tag (e.g. `Button`, `TodoList`) is treated as a component.
  - **Slots**: `<slot>` or `slot` keyword for default slot; `slot name="name"` for named slots. Slot content in callers can be passed as child elements or `slot:name`.

---

## 4. Signal Reactivity API & Fine-Grained Propagation
- **Decision**: State is explicit through signals; nothing is magically or implicitly reactive.
- **Primitives**:
  - `signal(initialValue)`: Creates a reactive read/write cell. Returns a callable accessor:
    - `count()`: Reads value, registers active subscriber if inside an effect or computed.
    - `count(newValue)`: Writes value and returns it.
    - `count.set(newValue)`: Explicit setter method.
    - `count.update(fn)`: Updates value via functional transformation `fn(current)`.
  - `computed(computeFn)`: Lazily evaluated derived signal. Only recomputes when dirty and read.
  - `effect(effectFn)`: Runs immediately, subscribes to signals accessed, and reruns on changes. Supports an optional returned cleanup function.
  - `batch(batchFn)`: Batches multiple signal writes so effects execute only once at the end of the batch, preventing duplicate executions and glitches.
  - `untrack(fn)`: Executes `fn` without registering any reactive subscriptions.
- **Disposal & Lifecycle**:
  - `createScope(fn)` / `onDestroy(fn)`: All effects created during component mount or inside `if`/`each` blocks are bound to an effect scope. When the component or block is removed, the scope is disposed, tearing down all event listeners, effect subscriptions, and running cleanup callbacks.

---

## 5. Scoped CSS & Global Escape Hatch
- **Decision**: All selectors in `--- style` are scoped to the component by automatically appending an attribute selector `[data-l-<hash>]` to each selector segment.
- **Global Escape Hatch**:
  - Pseudo-class `:global(selector)` strips the scoped attribute for that selector.
  - At-rule `@global { ... }` leaves all enclosed rules completely unscoped.

---

## 6. List Reconciliation in `each` Blocks
- **Decision**: Use a keyed Map-based reconciliation algorithm with minimal DOM operations.
  - Each item block has its own reactive scope and DOM fragment.
  - When the list updates: unchanged keys are preserved without re-rendering, moved keys are repositioned using `insertBefore`, new keys are inserted, and removed keys have their scopes disposed and DOM nodes unmounted.

---

## 7. Component Resolution & Auto-Imports
- **Decision**: Components within the project (e.g. in `src/components/` or relative paths) are automatically resolved by name if not explicitly imported in `--- logic`.
- Explicit imports take precedence over automatic resolution.

---

## 8. Compiler Architecture
- **Pipeline**:
  1. `Tokenizer`: Line-by-line scanner with indentation stack tracking INDENT / DEDENT tokens and validating tab/space consistency.
  2. `Parser`: Generates an Abstract Syntax Tree (AST) for UI elements, keyword blocks (`if`, `elseif`, `else`, `each`), attributes, events, bindings, and extracts raw text for `logic` and `style`.
  3. `Analyzer`: Validates scope, finds signal references, generates scoped CSS hashes, identifies component references, and generates warnings.
  4. `Codegen`: Emits direct, imperatively assembled DOM creation instructions using fine-grained subscriptions. No Virtual DOM or runtime template interpreter.
  5. `Source Maps`: Pure-JS VLQ-encoded Source Map v3 generation mapping compiled output back to `.liq` source lines.
- **Standalone API**: Export `compile(source, options)` returning `{ code, map, css, warnings }`.

---

## 9. Defensive Set Snapshots in Reactive Subscriber Notification
- **Decision**: In `computed.notify()` and `scope.dispose()`, always clone subscribers and cleanups into an Array (`Array.from(...)`) before iteration rather than iterating the live Set.
- **Rationale**: When an effect runs in response to a signal or computed notification, it cleans up previous dependencies (`dep.delete(node)`) and registers new dependencies (`dep.add(node)`). In JavaScript, iterating a mutating Set causes newly added elements to be visited by the iterator, leading to an infinite notification loop. Array snapshots ensure strictly one run per subscriber per update cycle.

---

## 10. Item & Index Proxy Ergonomics in `each` Blocks
- **Decision**: Wrap the loop item and index in transparent Proxies supporting both function call syntax (`item()`, `idx()`) and direct property/math operations (`item.title`, `idx + 1` via `Symbol.toPrimitive` and `valueOf`).
- **Rationale**: Developers intuitively write `{item.title}` or `#{idx + 1}` without constantly thinking about accessor parentheses. Transparent proxying gives the ergonomics of plain variables with the performance of signals under the hood.

---

## 11. Production Bundling & CSS Extraction Strategy
- **Decision**: Pure JavaScript single-file production bundler that extracts all component scoped CSS into a hashed CSS file (`assets/style.[hash].css`), minifies JS into a hashed runtime bundle (`assets/main.[hash].js`), and generates an optimized `index.html`.
- **Rationale**: Keeps build time under 100ms without native binary bundlers (no esbuild or rollup native binaries) to guarantee execution on ARM Android (Termux) and constrained cloud environments.

---

## 12. RouterView Mounting Lifecycle
- **Decision**: `RouterView` renders its initial active route component synchronously upon creation, returning `[...currentRenderedNodes, anchor]`, and updates dynamically upon hash/popstate route changes using `insertBefore`.
- **Rationale**: Synchronous initial rendering ensures that query selectors, parent mount lifecycle hooks, and initial animations find the target elements immediately upon mount, preventing layout shifts and flicker.

---

## 13. Watcher Resource Teardown
- **Decision**: `devCommand` returns the HTTP server with an automatic `close` event listener that explicitly closes the file system watcher (`fs.watch`) and closes all active Server-Sent Events (SSE) connections.
- **Rationale**: Prevents hanging background processes and dangling file descriptors during testing and dev server restarts.

---

## 14. Dev Server Module Resolution & Browser Execution Guardrails
- **Decision**: Implement dual module resolution combining native browser `<script type="importmap">` injection in `index.html` with server-side import rewriting to fully qualified paths (`/@modules/<pkg>/src/...`). In addition, rewrite all relative imports within served modules to absolute `/@modules/<pkg>/...` paths.
- **Rationale**: Browsers reject bare specifiers in native ESM mode. Furthermore, when modules are fetched under extensionless URLs (e.g. `/@modules/liquid-runtime`), relative imports (such as `./signals.js`) are resolved by browsers against the root directory (`/@modules/signals.js` -> 404) rather than the package subpath. Rewriting to fully qualified URLs prevents 404 failures and module graph execution aborts across all browser engines.

---

## 15. In-Browser Runtime Error Overlay & Synchronous Head Injection
- **Decision**: Inject dev server error handling and mount watchdog via a synchronous plain `<script>` tag in `<head>` rather than a deferred `<script type="module">`. The overlay includes an embedded pure-JS VLQ source-map decoder that maps browser runtime stack traces back to original `.liq` source line numbers and code snippets.
- **Rationale**: Module scripts are deferred by browsers until document parsing completes. A synchronous `<script>` in `<head>` guarantees that `window.addEventListener('error')` and `window.addEventListener('unhandledrejection')` are active before any application module begins loading, capturing network load failures and module initialization explosions.

---

## 16. Terminal Request Logging & Mount Watchdog
- **Decision**: Log every HTTP request in the terminal (`[time] [METHOD] [path] [status] [duration_ms]`). If the `#app` container element remains empty for 2 seconds and no error has been raised, display a prominent diagnostic card in the browser suggesting verified fix actions.
- **Rationale**: Eliminates silent blank-screen failures on mobile devices without devtools, providing instant feedback on both the device screen and the developer terminal.

---

## 17. Banner Emoji UTF-8 Integrity & Graceful Fallback
- **Decision**: Maintain intact UTF-8 code point U+1FADF (`🫟`, Pouring Liquid) while providing automatic fallback to the plain word `"Liquid"` when `TERM=dumb`, when stdout is non-TTY, or in non-UTF-8 locales. Support manual overrides via `LIQUID_EMOJI=1` (force on) and `LIQUID_EMOJI=0` / `LIQUID_NO_EMOJI=1` (force off).
- **Rationale**: Unicode 15.0 emojis may render as replacement boxes (``) in older terminal fonts, mobile shells, or CI environments. Graceful degradation preserves clean, legible output in all environments.

---

## 18. Each-Block Array Guards, Key Reconciliation & Proxy Primitive Semantics
- **Decision**:
  1. **Strict Non-Array Guards**: In `createEachBlock`, non-array inputs (specifically primitive strings, numbers, booleans) trigger a development warning (`[Liquid Warning] <each> block expected an Array...`) and default to an empty list `[]`. Only explicit collections (`Set` and `Map`) are converted to arrays via `.values()`. Strings are never treated as character iterables by `createEachBlock`.
  2. **Key Reconciliation & Duplicate Disambiguation**: When an each-block item lacks a key or evaluates to `null`/`undefined`, the runtime emits a dev warning and falls back to item value or index. When duplicate keys are detected, the runtime logs a dev warning (`[Liquid Warning] Duplicate key "${key}" detected...`) and synthesizes a collision-free disambiguation key (`${key}__liquid_dup_${index}`). Duplicate items are preserved and rendered into the DOM rather than silently overwritten or dropped.
  3. **Proxy `Symbol.toPrimitive` Support**: Reactive loop items and indexes wrapped in runtime Proxies expose `Symbol.toPrimitive`, `valueOf`, and `toString` traps returning `() => target()`. This prevents fatal `TypeError: string is not a function` during string interpolation (`${item}`) and template rendering.
  4. **Monotonic Store ID Generation**: Replace `Date.now()` with monotonic ID sequence counters (`nextId++`) in templates and examples to prevent ID collisions on rapid inputs.
- **Rationale**: In JavaScript, `Array.from(string)` decomposes a string into individual Unicode characters. When combined with keyed reconciliation where string items have `item.id === undefined`, duplicate keys collide on `undefined`, dropping subsequent items. Guarding type conversions, disambiguating keys, and supporting primitive proxy unwrapping prevents item character splitting and node dropping bugs entirely.

---

## 19. Event Modifier Filtering & Untracked Listener Execution
- **Decision**:
  1. **Keyboard Modifier Filtering**: In `listen(el, eventName, handler, modifiers)`, keyboard modifiers (`enter`, `escape`/`esc`, `tab`, `space`, `delete`, `up`, `down`, `left`, `right`) explicitly filter events using `e.key`, `e.keyCode`, and `e.which`. If an event does not match the declared key modifier, or if `e.isComposing` is true (such as during virtual keyboard IME composition on Android Gboard), the listener returns immediately without executing the handler.
  2. **Untracked Handler Execution**: All event listener callbacks are wrapped in `untrack(() => handler(e))`. Signal reads within event callbacks are strictly untracked and never create accidental subscriptions in any active reactive effect scope.
  3. **Cursor Preservation in Property Bindings**: In `bindAttr`, property values (e.g. `el.value`, `el.checked`) are only reassigned when `el[name] !== nextVal`. This prevents redundant DOM mutations that would reset input selection or cursor positions during rapid character typing.
- **Rationale**: Directives such as `@keydown.enter=addTodo` compile to `listen(el, "keydown", addTodo, ["enter"])`. Without key filtering in `listen`, `addTodo` executed on every single keystroke (`keydown`), creating a todo item per character and clearing the input continuously while typing. Correct modifier filtering and untracked execution ensure handlers fire strictly on their intended events.


