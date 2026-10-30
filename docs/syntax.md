# Liquid 🫟 Syntax Reference

The `.liq` language is designed for maximum conciseness and clarity: **no angle brackets, no closing tags, and structure defined purely by indentation**.

---

## 1. Concrete Token Reference

| Construct | Syntax | Example | Description |
|---|---|---|---|
| **Section Header** | `--- <name>` | `--- logic`, `--- style`, `--- ui` | Clear, unambiguous boundaries. Triple-dash is easy to type on mobile keyboards. |
| **Element** | `tag` | `div`, `header`, `button` | Element name first on the line. Unquoted child lines without tags default to text. |
| **ID Shorthand** | `#id` | `div#app`, `#root` | Sets element `id`. Defaults to `div` if tag is omitted. |
| **Class Shorthand** | `.class` | `button.btn.primary` | Adds class names to the element. Multiple classes chainable. |
| **Static Attribute** | `key="val"` | `input placeholder="Name"` | Standard HTML attributes. Unquoted values supported for single tokens. |
| **Dynamic Attribute** | `key={expr}` | `img src={avatarUrl()}` | Dynamic attribute evaluated and reactively bound. |
| **Interpolated Text** | `{expr}` | `p Hello, {name()}!` | Dynamic expression interpolation inside inline or child text lines. |
| **Escaped Brace** | `\{` | `p Literal \{notDynamic}` | Escape sequence to output a literal `{`. |
| **Explicit Text Line** | `\| text` | `\| Raw multiline text` | Pipe marker to explicitly mark text that might otherwise match tags. |
| **Event Binding** | `@event=handler` | `@click=handleClick` | Attaches DOM event listener. Plain function name or inline expression. |
| **Event Modifiers** | `@event.mod=handler`| `@click.prevent=onSubmit` | Modifiers: `.prevent` (or `.prev`), `.stop`, `.once`. |
| **Two-Way Binding** | `$attr={sig}` | `$value={username}` | Two-way syncs input value/checkbox to a signal. |
| **Shorthand Binding** | `$={sig}` | `input $={query}` | Binds default attribute (`value` for text/select, `checked` for checkbox). |
| **Conditional: If** | `if test` | `if count() > 10` | Reactive conditional block. Indented children render when truthy. |
| **Conditional: Else If** | `elseif test` | `elseif count() > 0` | Alternative branch (also accepts `else if`). |
| **Conditional: Else** | `else` | `else` | Fallback branch when prior conditions are falsy. |
| **List Loop** | `each coll as item (key)` | `each todos() as t (t.id)` | Keyed reactive list reconciliation with minimal DOM moves. |
| **Loop with Index** | `each coll as item, idx (key)` | `each items() as it, i (it.id)` | Exposes reactive item and index proxy. |
| **Component** | `CapitalizedTag` | `Navbar title="Home"` | Capitalized tags instantiate components; props passed as attributes. |
| **Default Slot** | `slot` | `div.content \n slot` | Yields default children passed into the component. |
| **Named Slot** | `slot name="name"` | `slot name="actions"` | Yields content passed into named slot. |

---

## 2. File Structure

A `.liq` component consists of three optional sections. Section headers start with `---`:

```liquid
--- logic
import { signal } from 'liquid';
const count = signal(0);
function inc() { count.set(count() + 1); }

--- style
.counter {
  padding: 1rem;
}
.btn {
  background: #0284c7;
  color: white;
}

--- ui
div.counter
  h1 Count: {count()}
  button.btn @click=inc Increment
```

### Order Flexibility
Sections may appear in any order. If section headers are omitted entirely, the entire file is treated as the `ui` template.

---

## 3. UI Template Indentation Rules

1. **Standard Indent**: Exactly **2 spaces** per indentation level.
2. **Tabs Forbidden**: Mixed tabs and spaces, or tabs used for indentation, are rejected with a compile-time syntax error including line number, column, and caret excerpt.
3. **One Element Per Line**:
   - Tag name and shorthands first: `button#submit.btn.primary`
   - Attributes, directives, and bindings on the same line: `type="submit" disabled={isSubmitting()}`
   - Optional trailing inline text on the same line: `button.btn Submit Now`
4. **Children**:
   - Indented 2 spaces deeper than their parent element.
   - Child text can be written directly on child lines or prefixed with `| `.

---

## 4. Events and Modifiers

Events are declared with the `@` prefix:

```liquid
button @click=increment
button @click.prevent=submitForm
button @click.prevent.stop=handleInner
button @click.once=loadData
button @keydown.enter=onEnterPressed
```

### Supported Modifiers
- `.prevent` (alias `.prev`): Calls `event.preventDefault()`.
- `.stop`: Calls `event.stopPropagation()`.
- `.once`: Adds event listener with `{ once: true }`.

### Handler Forms
- Function identifier: `@click=handleClick`
- Inline expression: `@click=count.set(count() + 1)`
- Parameterized call: `@click=removeTodo(todo.id)`

---

## 5. Two-Way Form Binding

Use the `$` directive to bind form inputs to signals:

```liquid
// Text inputs
input.input-field $value={username}

// Shorthand for value
input.input-field $={username}

// Checkbox boolean binding
input type="checkbox" $checked={agreedToTerms}

// Select dropdowns
select $value={selectedCategory}
  option value="tech" Technology
  option value="design" Design
```

When user edits the input, the signal is updated automatically. When the signal changes, the input's DOM property updates immediately.

---

## 6. Control Flow Elements

Control flow blocks are keywords inside the template, following the same indentation rules:

### If / Elseif / Else
```liquid
if user()
  p Welcome back, {user().name}!
elseif isGuest()
  p Welcome, Guest!
else
  p Please sign in to continue.
```

When conditions toggle, inactive branches are completely unmounted and all reactive subscriptions inside them are cleanly disposed.

### Each (Keyed Loops)
```liquid
ul.todo-list
  each todos() as item (item.id)
    li.todo-item
      span {item.title}
```

With index:
```liquid
ul.todo-list
  each todos() as item, idx (item.id)
    li.todo-item
      span #{idx + 1}: {item.title}
```

The key expression `(item.id)` enables Liquid's fine-grained keyed reconciliation: existing DOM nodes are moved rather than recreated, preserving input focus, selection, and CSS animations.

---

## 7. Components, Props, and Slots

### Defining Components
Every `.liq` file is a reusable component. Props are declared via `defineProps()` in `--- logic`:

```liquid
--- logic
const { title = 'Default Title', subtitle = '' } = defineProps();

--- ui
div.card
  h2.card-title {title}
  if subtitle
    p.card-subtitle {subtitle}
  div.card-body
    slot
```

### Using Components
Capitalized tags instantiate components:

```liquid
--- logic
import Card from './Card.liq';

--- ui
div.page
  Card title="Dashboard" subtitle="Overview of stats"
    p This is slotted child content inside the card!
```

---

## 8. Scoped Styles & Escape Hatches

CSS in `--- style` is automatically scoped by the compiler using a unique component hash attribute (e.g. `[data-l-1ywmi3o]`):

```css
--- style
/* Scoped to this component */
.button {
  padding: 0.5rem 1rem;
}

.button:hover {
  background: #38bdf8;
}

/* Escape hatch: unscoped global selector */
:global(.theme-dark) {
  background: #0f172a;
  color: #f8fafc;
}

/* Escape hatch: block of unscoped rules */
@global {
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
}
```
