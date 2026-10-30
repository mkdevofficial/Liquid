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
