import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mkdevofficial/liquid-compiler';
import { getDeviceInfo } from './src/device.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('17-native-modules compiles cleanly and returns device telemetry', () => {
  const code = fs.readFileSync(path.join(__dirname, 'src/App.liq'), 'utf8');
  const webRes = compile(code, { target: 'web' });
  assert.ok(webRes.code.length > 0);

  const androidRes = compile(code, { target: 'android' });
  const unsup = (androidRes.diagnostics || []).filter(d => d.status === 'unsupported');
  assert.equal(unsup.length, 0);

  const info = getDeviceInfo();
  assert.ok(info.platform);
  assert.equal(info.arch, 'arm64');
});
