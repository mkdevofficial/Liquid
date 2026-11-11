import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { appStore } from './src/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('09-shared-store compiles cleanly and store actions update reactive state', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const webRes = compile(code, { target: 'web' });
  assert.ok(webRes.code.length > 0);

  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  assert.equal(appStore.getCounter(), 10);
  assert.equal(appStore.getDouble(), 20);
  appStore.increment();
  assert.equal(appStore.getCounter(), 11);
  assert.equal(appStore.getDouble(), 22);
  appStore.decrement();
  assert.equal(appStore.getCounter(), 10);
});
