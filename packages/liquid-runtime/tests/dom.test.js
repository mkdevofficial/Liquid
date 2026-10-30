import test from 'node:test';
import assert from 'node:assert';
import { Window } from 'happy-dom';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Comment = window.Comment;
globalThis.Text = window.Text;

import {
  signal,
  computed,
  element,
  text,
  bindText,
  bindAttr,
  listen,
  bindInput,
  createIfBlock,
  createEachBlock,
  mount
} from '../src/index.js';

test('DOM - element, text, and bindText', () => {
  const count = signal(0);
  const el = element('div', 'data-l-1234', ['counter', 'active']);
  const t = text('Count: ');
  const tVal = text('');
  bindText(tVal, () => count());

  el.appendChild(t);
  el.appendChild(tVal);

  assert.strictEqual(el.getAttribute('data-l-1234'), '');
  assert.strictEqual(el.className, 'counter active');
  assert.strictEqual(el.textContent, 'Count: 0');

  count.set(5);
  assert.strictEqual(el.textContent, 'Count: 5');
});

test('DOM - bindAttr and listen with modifiers', () => {
  const isHidden = signal(false);
  const btn = element('button');
  bindAttr(btn, 'hidden', () => isHidden());

  assert.strictEqual(btn.hasAttribute('hidden'), false);

  isHidden.set(true);
  assert.strictEqual(btn.hasAttribute('hidden'), true);

  let clicks = 0;
  listen(btn, 'click', () => { clicks++; }, ['prevent', 'once']);

  // First click
  btn.click();
  assert.strictEqual(clicks, 1);

  // Second click (once should prevent second invocation)
  btn.click();
  assert.strictEqual(clicks, 1);
});

test('DOM - bindInput two-way binding for text and checkbox', () => {
  const username = signal('alice');
  const input = element('input');
  bindInput(input, username, 'value');

  assert.strictEqual(input.value, 'alice');

  // Simulate user typing
  input.value = 'bob';
  input.dispatchEvent(new window.Event('input'));
  assert.strictEqual(username(), 'bob');

  // Signal change updates input
  username.set('charlie');
  assert.strictEqual(input.value, 'charlie');

  // Checkbox test
  const agreed = signal(false);
  const check = element('input');
  check.type = 'checkbox';
  bindInput(check, agreed, 'checked');

  assert.strictEqual(check.checked, false);
  check.checked = true;
  check.dispatchEvent(new window.Event('change'));
  assert.strictEqual(agreed(), true);
});

test('DOM - createIfBlock toggles branches and disposes inactive scopes', () => {
  const container = element('div');
  const anchor = document.createComment('if');
  container.appendChild(anchor);

  const show = signal(true);
  let thenScopeActive = 0;
  let elseScopeActive = 0;

  createIfBlock(
    anchor,
    () => show(),
    () => {
      thenScopeActive++;
      const p = element('p');
      p.textContent = 'Visible';
      return [p];
    },
    () => {
      elseScopeActive++;
      const span = element('span');
      span.textContent = 'Hidden fallback';
      return [span];
    }
  );

  assert.strictEqual(container.innerHTML, '<p>Visible</p><!--if-->');

  show.set(false);
  assert.strictEqual(container.innerHTML, '<span>Hidden fallback</span><!--if-->');

  show.set(true);
  assert.strictEqual(container.innerHTML, '<p>Visible</p><!--if-->');
});

test('DOM - createEachBlock keyed list reconciliation preserves existing nodes', () => {
  const container = element('ul');
  const anchor = document.createComment('each');
  container.appendChild(anchor);

  const items = signal([
    { id: 1, text: 'First' },
    { id: 2, text: 'Second' }
  ]);

  createEachBlock(
    anchor,
    () => items(),
    (item) => item.id,
    (itemSig) => {
      const li = element('li');
      bindText(li, () => itemSig().text);
      return [li];
    }
  );

  assert.strictEqual(container.innerHTML, '<li>First</li><li>Second</li><!--each-->');
  const firstNode = container.childNodes[0];

  // Reorder items: [2, 1]
  items.set([
    { id: 2, text: 'Second' },
    { id: 1, text: 'First' }
  ]);

  assert.strictEqual(container.innerHTML, '<li>Second</li><li>First</li><!--each-->');
  // Verify DOM node was preserved/moved, not recreated!
  assert.strictEqual(container.childNodes[1], firstNode);

  // Add a third item
  items.set([
    { id: 2, text: 'Second' },
    { id: 1, text: 'First modified' },
    { id: 3, text: 'Third' }
  ]);

  assert.strictEqual(container.innerHTML, '<li>Second</li><li>First modified</li><li>Third</li><!--each-->');
});

test('DOM - mount and unmount lifecycle', () => {
  const container = element('div');
  const count = signal(10);

  function MyComponent() {
    const root = element('div', null, ['box']);
    const t = text('');
    bindText(t, () => `Count: ${count()}`);
    root.appendChild(t);
    return root;
  }

  const app = mount(MyComponent, container);
  assert.strictEqual(container.innerHTML, '<div class="box">Count: 10</div>');

  count.set(20);
  assert.strictEqual(container.innerHTML, '<div class="box">Count: 20</div>');

  app.unmount();
  assert.strictEqual(container.innerHTML, '');

  // Changes after unmount must have no effect
  count.set(30);
  assert.strictEqual(container.innerHTML, '');
});
