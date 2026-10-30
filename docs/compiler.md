# Liquid 🫟 Compiler Architecture & API

The Liquid compiler transforms indentation-based `.liq` single-file components into standard, readable ES modules with direct DOM assembly, fine-grained reactive subscriptions, scoped CSS, and Source Maps v3.

The compiler is 100% pure JavaScript with zero native binaries, making it portable to Linux, Termux (AArch64 Android), GitHub Codespaces, and Web browsers.

---

## 1. Compiler Pipeline

```
  .liq Source String
         │
         ▼
 1. Tokenizer  ───► INDENT/DEDENT stack, mixed tab/space validation, tag shorthands
         │
         ▼
 2. Parser     ───► Program AST (Logic, Styles, UI Tree, If/Each/Slot nodes)
         │
         ▼
 3. Analyzer   ───► Component resolution, scoped hash generation, warnings
         │
         ▼
 4. CSS Scope  ───► Appends [data-l-xxxx] to rules; handles :global() & @global {}
         │
         ▼
 5. Codegen    ───► Direct DOM instructions, reactive bindings, VLQ Source Maps
         │
         ▼
 Output: { code, map, css, warnings, ast }
```

### Stage 1: Tokenizer (`tokenizer.js`)
- Scans line by line, maintaining an indentation depth stack.
- Strictly validates 2-space indentation; rejects tabs and mixed tabs/spaces with clear line/column and visual caret excerpts.
- Extracts section headers (`--- logic`, `--- style`, `--- ui`).
- Parses shorthand IDs (`#app`) and classes (`.btn.primary`), inline and explicit text (`| text`), event directives (`@click.prevent=handler`), and two-way bindings (`$value={sig}`).

### Stage 2: Parser (`parser.js`)
- Consumes tokens and constructs an Abstract Syntax Tree (AST).
- Parses keyword elements: `if` / `elseif` / `else` sibling trees, `each` loops with collection, item, index, and key expression, and `slot` elements.
- Extracts JS expressions from interpolated text strings (`{expression}`).

### Stage 3: Analyzer (`analyzer.js`)
- Inspects ES imports in `--- logic`.
- Finds referenced component tags (`<Button>`, `<TodoList>`) and matches them against explicit imports.
- Computes deterministic scope identifier (`data-l-xxxx`) from component content and file path.
- Generates compiler warnings (e.g. unkeyed `each` loops).

### Stage 4: Scoped CSS (`css.js`)
- Transforms Plain CSS in `--- style` into scoped CSS rules.
- Appends `[data-l-xxxx]` to individual selectors.
- Supports `:global(.selector)` to exempt specific selectors from scoping.
- Supports `@global { ... }` blocks to output unscoped global rules (such as CSS resets or fonts).

### Stage 5: Code Generator (`codegen.js`)
- Produces clean, readable ES modules.
- Emits imperative DOM element creation (`element()`), text nodes (`text()`), reactive text bindings (`bindText()`), reactive attribute bindings (`bindAttr()`), event listeners (`listen()`), and keyed each lists (`createEachBlock()`).
- Generates Source Map v3 mappings using pure JavaScript Base64 VLQ encoding (`sourcemap.js`).

---

## 2. Standalone Compiler API

The compiler can be used independently in build tools, custom Vite/Rollup/Webpack plugins, or in-browser sandboxes:

```javascript
import { compile, LiquidSyntaxError } from 'liquid-compiler';

const source = `--- logic
import { signal } from 'liquid';
const name = signal('World');

--- ui
div.greeting
  h1 Hello, {name()}!
`;

try {
  const result = compile(source, {
    file: 'Greeting.liq',
    runtimeModule: 'liquid'
  });

  console.log('Generated JavaScript:\n', result.code);
  console.log('Scoped CSS:\n', result.css);
  console.log('Source Map:\n', result.map);
  console.log('Warnings:\n', result.warnings);
} catch (err) {
  if (err instanceof LiquidSyntaxError) {
    console.error(err.message); // Formatted with line, column, and caret excerpt!
  } else {
    console.error(err);
  }
}
```

### Compiler Options
| Option | Type | Default | Description |
|---|---|---|---|
| `file` | `string` | `'Component.liq'` | Source file path used for diagnostics and sourcemaps |
| `name` | `string` | Derived from file | Exported component function name |
| `runtimeModule` | `string` | `'liquid'` | Import path for runtime helpers (`element`, `text`, etc.) |
| `resolveComponent` | `function` | Auto relative import | Custom hook to resolve component import paths |
