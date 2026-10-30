import test from 'node:test';
import assert from 'node:assert';
import { Window } from 'happy-dom';
import { createStore, head, effect, signal } from '../src/index.js';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;

test('Store - shared store state and actions', () => {
  const store = createStore({
    count: 0,
    inc() {
      this.count++;
    }
  });

  assert.strictEqual(store.count, 0);

  const runs = [];
  effect(() => {
    runs.push(store.count);
  });

  assert.deepStrictEqual(runs, [0]);

  store.inc();
  assert.strictEqual(store.count, 1);
  assert.deepStrictEqual(runs, [0, 1]);

  store.count = 10;
  assert.strictEqual(store.count, 10);
  assert.deepStrictEqual(runs, [0, 1, 10]);
});

test('Head - reactive head updates', () => {
  const title = signal('Initial Title');
  const cleanup = head({
    title: () => title(),
    meta: {
      description: () => `Page with title ${title()}`
    }
  });

  assert.strictEqual(document.title, 'Initial Title');
  const meta = document.querySelector('meta[name="description"]');
  assert.strictEqual(meta.getAttribute('content'), 'Page with title Initial Title');

  title.set('Updated Title');
  assert.strictEqual(document.title, 'Updated Title');
  assert.strictEqual(meta.getAttribute('content'), 'Page with title Updated Title');

  cleanup();
});
