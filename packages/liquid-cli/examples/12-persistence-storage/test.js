import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { getStoredItem, setStoredItem } from './src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('12-persistence-storage compiles cleanly and storage helper saves and retrieves values', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const webRes = compile(code, { target: 'web' });
  assert.ok(webRes.code.length > 0);

  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  setStoredItem('test_key', 'Hello Liquid');
  assert.equal(getStoredItem('test_key'), 'Hello Liquid');
  assert.equal(getStoredItem('non_existent', 'default'), 'default');
});
