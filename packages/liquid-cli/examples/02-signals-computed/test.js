import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { signal, computed, batch } from '@mkdevofficial/liquid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('02-signals-computed compiles cleanly and signal math executes', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  // Logic assertion
  const c = signal(5);
  const f = signal(3);
  const m = computed(() => c() * f());
  assert.equal(m(), 15);

  batch(() => {
    c.set(10);
    f.set(2);
  });
  assert.equal(m(), 20);
});
