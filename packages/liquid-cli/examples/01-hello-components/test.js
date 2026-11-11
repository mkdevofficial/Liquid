import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('01-hello-components compiles for web and android with zero unsupported CSS', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const webRes = compile(code, { target: 'web' });
  assert.ok(webRes.code.includes('element') || webRes.code.includes('Component'));

  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0, 'Must have zero unsupported CSS diagnostics');
});
