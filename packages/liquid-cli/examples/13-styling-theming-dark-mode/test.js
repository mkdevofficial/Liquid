import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { themes } from './src/tokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('13-styling-theming-dark-mode compiles cleanly for web and android with zero unsupported CSS', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const webRes = compile(code, { target: 'web' });
  assert.ok(webRes.code.length > 0);

  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  assert.ok(themes.light.bg !== themes.dark.bg);
  assert.ok(themes.light.text !== themes.dark.text);
});
