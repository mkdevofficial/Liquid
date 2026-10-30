import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setImmediate as nodeSetImmediate } from 'node:timers';
import { Window } from 'happy-dom';

test('Example App - full browser environment simulation with production bundle', async () => {
  const distDir = path.resolve('examples/todo-counter-app/dist');
  assert.ok(fs.existsSync(distDir), 'dist directory must exist');

  const assets = fs.readdirSync(path.join(distDir, 'assets'));
  const jsFile = assets.find(f => f.startsWith('main.') && f.endsWith('.js'));
  assert.ok(jsFile, 'main bundle JS must exist');

  const bundleCode = fs.readFileSync(path.join(distDir, 'assets', jsFile), 'utf8');

  // Setup DOM environment
  const window = new Window();
  window.location.hash = '#/';
  const document = window.document;
  document.body.innerHTML = '<div id="app"></div>';

  // Inject globals for execution
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  globalThis.Comment = window.Comment;
  globalThis.Text = window.Text;

  // Execute production bundle
  const runBundle = new Function('window', 'document', bundleCode);
  runBundle(window, document);
  await new Promise(r => nodeSetImmediate(r));

  // 1. Verify Home page and Navbar
  const brand = document.querySelector('.brand');
  assert.ok(brand);
  assert.strictEqual(brand.textContent, 'Liquid 🫟 Showcase');

  const valueDisplay = document.querySelector('.value-display');
  assert.ok(valueDisplay);
  assert.strictEqual(valueDisplay.textContent, '0');

  const badge = document.querySelector('.badge');
  assert.ok(badge);
  assert.strictEqual(badge.textContent, 'Even Number');

  // 2. Click '+' button to increment counter
  const buttons = Array.from(document.querySelectorAll('button.btn'));
  const incBtn = buttons.find(b => b.textContent.trim() === '+');
  assert.ok(incBtn);

  incBtn.click();
  assert.strictEqual(valueDisplay.textContent, '1');
  assert.strictEqual(document.querySelector('.badge').textContent, 'Odd Number');

  incBtn.click();
  assert.strictEqual(valueDisplay.textContent, '2');
  assert.strictEqual(document.querySelector('.badge').textContent, 'Even Number');

  // 3. Navigate to #/todos
  window.location.hash = '#/todos';
  window.dispatchEvent(new window.Event('hashchange'));
  await new Promise(r => nodeSetImmediate(r));

  const todoItems = document.querySelectorAll('.todo-item');
  assert.ok(todoItems.length >= 3);
  assert.ok(document.body.textContent.includes('Task Manager'));

  // 4. Navigate to #/arabic
  window.location.hash = '#/arabic';
  window.dispatchEvent(new window.Event('hashchange'));
  await new Promise(r => nodeSetImmediate(r));

  assert.ok(document.body.textContent.includes('دعم كامل للغة العربية'));
  assert.ok(document.querySelector('.rtl-container'));
});
