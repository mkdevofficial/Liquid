import test from 'node:test';
import assert from 'node:assert';
import { compile, LiquidSyntaxError } from '../src/index.js';

test('Compiler - compiles full component with logic, styles, and UI', () => {
  const source = `--- logic
import { signal } from 'liquid';
const count = signal(0);
function inc() {
  count.set(count() + 1);
}

--- style
.counter {
  padding: 10px;
}
.btn {
  color: blue;
}
:global(.global-badge) {
  font-size: 12px;
}

--- ui
div#app.counter
  h1 Count: {count()}
  button.btn @click=inc +
`;

  const result = compile(source, { file: 'Counter.liq' });

  assert.ok(result.code);
  assert.ok(result.code.includes('export default function Counter('));
  assert.ok(result.code.includes('import { signal } from \'liquid\';'));
  assert.ok(result.code.includes('"click", inc, []'));
  assert.ok(result.code.includes('bindText'));

  // Verify scoped CSS
  assert.ok(result.css.includes('.counter[data-l-'));
  assert.ok(result.css.includes('.btn[data-l-'));
  assert.ok(result.css.includes('.global-badge {')); // unscoped due to :global()

  // Verify source map
  assert.strictEqual(result.map.version, 3);
  assert.ok(result.map.mappings);
});

test('Compiler - conditionals and each loops', () => {
  const source = `
div.container
  if user()
    p Welcome, {user().name}
  else
    p Please sign in
  each todos() as todo, idx (todo.id)
    li.todo-item #{idx()}: {todo().title}
`;

  const result = compile(source, { file: 'TodoList.liq' });
  assert.ok(result.code.includes('createIfBlock'));
  assert.ok(result.code.includes('createEachBlock'));
  assert.ok(result.code.includes('(todo, idx) => (todo.id)'));
});

test('Compiler - components, props, and slots', () => {
  const source = `
Card title="Dashboard"
  p Slot content here
`;

  const result = compile(source, { file: 'App.liq' });
  assert.ok(result.code.includes('Card({ "title": "Dashboard", default: () => {'));
});

test('Compiler - syntax error reporting', () => {
  const badSource = `div\n \t p Mixed indentation`;
  assert.throws(() => compile(badSource, { file: 'Bad.liq' }), (err) => {
    assert.ok(err instanceof LiquidSyntaxError);
    assert.match(err.message, /Mixed tabs and spaces/);
    assert.match(err.message, /Bad\.liq:2/);
    return true;
  });
});

test('Compiler - click and event handlers are untracked and not wrapped in effects (Pass 3)', () => {
  const source = `--- logic
import { signal } from 'liquid';
const count = signal(0);
function handleClick() {
  count.set(count() + 1);
}

--- ui
div
  button @click=handleClick Click me
  span {count()}
`;

  const result = compile(source, { file: 'Button.liq' });
  // Verify listen() is generated directly, outside of bindAttr or effect
  assert.ok(result.code.includes('listen('), 'Must generate listen call');
  assert.ok(result.code.includes('listen(_el1, "click", handleClick, [])'), 'Must pass clean click handler to listen');
  // Ensure listen is NOT inside an effect or bindAttr wrapper
  assert.strictEqual(result.code.includes('effect(() => { listen'), false, 'listen must not be inside an effect');
  assert.strictEqual(result.code.includes('bindAttr(_el1, "click"'), false, 'click must not be compiled as attribute');
});

test('Compiler - multi-line import statements are kept top-level and not placed inside function body (Bug 3)', () => {
  const source = `--- logic
import Layout from './Layout.liq';
import {
  signal,
  computed,
  effect
} from 'liquid';

const value = signal(42);

--- ui
div
  span {value()}
`;

  const result = compile(source, { file: 'MultiImport.liq' });
  const lines = result.code.split('\n');
  const funcIdx = lines.findIndex(l => l.includes('export default function MultiImport'));
  assert.ok(funcIdx > 0, 'Component function must be defined');

  // Verify all parts of multi-line import appear BEFORE the function definition
  const importEndIdx = lines.findIndex((l, idx) => idx > 0 && l.includes('} from'));
  assert.ok(importEndIdx > 0, 'Closing brace of import must exist');
  assert.ok(importEndIdx < funcIdx, 'Multi-line import must end BEFORE component function definition');

  // Verify function body only contains the user statement
  const bodyAfterFunc = lines.slice(funcIdx).join('\n');
  assert.ok(!bodyAfterFunc.includes("from 'liquid'"), 'Function body must not contain import statements');
  assert.ok(bodyAfterFunc.includes('const value = signal(42);'), 'Function body must contain user statements');
});

test('Compiler - compiles standalone event modifiers without explicit handler', () => {
  const source = `
div.card @click.stop
  button @click.prevent Submit
`;
  const result = compile(source, { file: 'Modifiers.liq' });
  assert.ok(result.code.includes('listen(_el0, "click", () => {}, ["stop"])'));
  assert.ok(result.code.includes('listen(_el1, "click", () => {}, ["prevent"])'));
});

test('Compiler - preserves slots for nested components inside slots and blocks (Bug 6)', () => {
  const source = `
Layout
  Card
    form
      button Submit
`;
  const result = compile(source, { file: 'Nested.liq' });
  // Verify Layout has a default slot containing Card
  assert.ok(result.code.includes('Layout({ default: () => {'), 'Layout should have default slot');
  // Verify Card ALSO has a default slot containing form
  assert.ok(result.code.includes('Card({ default: () => {'), 'Nested Card should have default slot');
  assert.ok(result.code.includes('element("form"'), 'Card slot should contain form element');
});

test('Compiler - each loop proxy allows method invocation on primitive items (Bug 8)', () => {
  const source = `
div
  each months as m (m)
    span {m.split('-')[0]}
`;
  const result = compile(source, { file: 'EachProxy.liq' });
  assert.ok(result.code.includes('prop in Object(val)'), 'Proxy must allow property/method lookups on primitives');
});

test('Compiler - merges shorthand class with dynamic and static class attribute (Bug 10)', () => {
  const source = `
button.btn-confirm class={danger ? 'btn-danger' : ''}
`;
  const result = compile(source, { file: 'ClassMerge.liq' });
  assert.ok(result.code.includes('"btn-confirm" + ((danger ? \'btn-danger\' : \'\')'), 'Must merge shorthand class with dynamic class binding');
});




