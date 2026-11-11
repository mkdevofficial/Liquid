import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { signal, effect, onMount, onCleanup } from '@mkdevofficial/liquid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('03-effects-lifecycle compiles cleanly and effect callbacks trigger', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  let effectRuns = 0;
  const count = signal(0);
  effect(() => {
    count();
    effectRuns++;
  });
  assert.equal(effectRuns, 1);
  count.set(1);
  assert.equal(effectRuns, 2);
});
