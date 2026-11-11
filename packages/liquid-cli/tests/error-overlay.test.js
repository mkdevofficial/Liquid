import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createAndroidBundle } from '../src/android.js';
import { resolveRuntimeError } from '../src/sourcemap-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

test('Error Overlay - runtime exception maps back to original .liq source location and code frame', async () => {
  const testDir = path.join(rootDir, 'tmp-test-error-overlay');
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });

  const packageJson = {
    name: 'error-overlay-test',
    version: '1.0.0',
    type: 'module'
  };
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Faulty component that throws on line 4 of .liq file
  const faultyLiq = `--- logic
import { signal } from 'liquid';
const count = signal(0);
throw new Error("Deliberate component explosion in .liq");

--- ui
div.container
  text Failure Test
`;
  fs.writeFileSync(path.join(testDir, 'src/App.liq'), faultyLiq);

  try {
    const bundleCode = createAndroidBundle(
      testDir,
      { appName: 'ErrorTest', packageId: 'com.liquid.errortest' },
      { id: 'err-test-stamp' }
    );

    assert.ok(bundleCode.includes('__LIQUID_SOURCEMAP__'), 'Bundle must contain __LIQUID_SOURCEMAP__ table');

    // Run in QuickJS-compatible VM
    let caughtError = null;
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __liquid_native_bridge: { sendBatch: () => '[]' }
    };
    sandbox.globalThis = sandbox;

    try {
      vm.runInNewContext(bundleCode, sandbox);
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, 'Executing bundle with faulty component must throw at runtime');
    assert.ok(caughtError.stack, 'Caught error must have a stack trace');

    // Resolve runtime error stack trace using sourcemap resolver
    const resolved = resolveRuntimeError({
      message: caughtError.message,
      stack: caughtError.stack,
      bundleCode,
      rootDir: testDir
    });

    assert.equal(resolved.file, 'src/App.liq', `File must be mapped to src/App.liq, got: ${resolved.file}`);
    assert.ok(resolved.line >= 1 && resolved.line <= 6, `Line must be mapped within logic block (expected ~4), got: ${resolved.line}`);
    assert.ok(resolved.message.includes('Deliberate component explosion in .liq'), 'Message must be preserved');
    assert.ok(resolved.frame.includes('Deliberate component explosion in .liq'), 'Code frame must show the faulty line');
    assert.ok(resolved.frame.includes('LQ-RUNTIME-ERR'), 'Code frame must have LQ-RUNTIME-ERR code');
    assert.ok(!resolved.file.includes('bundle.js'), 'Mapped file must NOT be bundle.js');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});
