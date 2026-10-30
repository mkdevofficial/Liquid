import test from 'node:test';
import assert from 'node:assert';
import { Window } from 'happy-dom';
import { compile } from '../packages/liquid-compiler/src/index.js';
import * as runtime from '../packages/liquid-runtime/src/index.js';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Comment = window.Comment;
globalThis.Text = window.Text;

test('Integration - end-to-end component compilation and execution', async () => {
  const source = `--- logic
import { signal } from 'liquid';
const count = signal(0);
function inc() {
  count.set(count() + 1);
}

--- ui
div.counter
  span.label Value:
  span.val {count()}
  button.inc-btn @click=inc +
`;

  const compiled = compile(source, { file: 'Counter.liq' });

  // Transform runtime import to inject local runtime
  // Replace: import { ... } from 'liquid';
  // with local execution wrapper
  const code = compiled.code
    .replace(/import\s+\{([^}]+)\}\s+from\s+['"]liquid['"];?/g, '// import {$1}')
    .replace(/export\s+default\s+function/, 'function');

  // Construct module factory
  const factory = new Function(
    'runtime',
    `
    const { ${Object.keys(runtime).join(', ')} } = runtime;
    ${code}
    return Counter;
    `
  );

  const Component = factory(runtime);
  const container = document.createElement('div');
  const app = runtime.mount(Component, container);

  assert.strictEqual(container.querySelector('.val').textContent, '0');

  const btn = container.querySelector('.inc-btn');
  btn.click();

  assert.strictEqual(container.querySelector('.val').textContent, '1');

  btn.click();
  btn.click();
  assert.strictEqual(container.querySelector('.val').textContent, '3');

  app.unmount();
  assert.strictEqual(container.childNodes.length, 0);
});

test('Integration - end-to-end Arabic RTL component', async () => {
  const source = `--- logic
import { signal } from 'liquid';
const msg = signal('مرحباً بكم');

--- ui
div dir="rtl" lang="ar"
  h1.title {msg()}
`;

  const compiled = compile(source, { file: 'Arabic.liq' });
  const code = compiled.code
    .replace(/import\s+\{([^}]+)\}\s+from\s+['"]liquid['"];?/g, '// import {$1}')
    .replace(/export\s+default\s+function/, 'function');

  const factory = new Function(
    'runtime',
    `
    const { ${Object.keys(runtime).join(', ')} } = runtime;
    ${code}
    return Arabic;
    `
  );

  const Component = factory(runtime);
  const container = document.createElement('div');
  const app = runtime.mount(Component, container);

  const h1 = container.querySelector('.title');
  assert.strictEqual(h1.textContent, 'مرحباً بكم');

  app.unmount();
});
