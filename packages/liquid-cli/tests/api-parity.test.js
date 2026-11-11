import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as liquid from 'liquid';
import { createAndroidBundle } from '../src/android.js';
import { buildProductionBundle } from '../src/build.js';
import { checkBundleLinking } from '../src/link-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

test('Public API Parity - all liquid exports link cleanly for Web and Android', async () => {
  // 1. Enumerate every public export of liquid package
  const publicExports = Object.keys(liquid).sort();
  assert.ok(publicExports.length > 40, `Expected >40 exports from liquid, found ${publicExports.length}`);
  assert.ok(publicExports.includes('createStore'), 'liquid must export createStore');
  assert.ok(publicExports.includes('createRouter'), 'liquid must export createRouter');
  assert.ok(publicExports.includes('signal'), 'liquid must export signal');
  assert.ok(publicExports.includes('computed'), 'liquid must export computed');
  assert.ok(publicExports.includes('head'), 'liquid must export head');
  assert.ok(publicExports.includes('AndroidBatchRenderer'), 'liquid must export AndroidBatchRenderer');

  // 2. Create a temporary project directory
  const testDir = path.join(rootDir, 'tmp-test-api-parity');
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });

  const packageJson = {
    name: 'api-parity-test',
    version: '1.0.0',
    type: 'module'
  };
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Write App.liq importing all public exports
  const importList = publicExports.join(', ');
  const appLiq = `--- logic
import { ${importList} } from 'liquid';

const count = signal(0);
const store = createStore({ title: 'Test Store' });

--- ui
div.container
  text Hello Parity!
`;
  fs.writeFileSync(path.join(testDir, 'src/App.liq'), appLiq);

  // Write helper store.js also importing createStore and signals
  const storeJs = `import { createStore, signal } from 'liquid';
export const myStore = createStore({ count: 1 });
`;
  fs.writeFileSync(path.join(testDir, 'src/store.js'), storeJs);

  // Write main.js for web
  const mainJs = `import { mount } from 'liquid';
import App from './App.liq';
const el = document.getElementById('app');
if (el) mount(App, el);
`;
  fs.writeFileSync(path.join(testDir, 'src/main.js'), mainJs);

  try {
    // 3. Test Android target bundling and link check
    const androidBundle = createAndroidBundle(testDir, { appName: 'ParityTest', packageId: 'com.liquid.parity' }, { id: 'parity-test' });
    assert.ok(typeof androidBundle === 'string' && androidBundle.length > 0, 'Android bundle must generate code');

    const androidLinkResult = checkBundleLinking(androidBundle, {
      sourceFiles: [
        { path: 'src/App.liq', content: appLiq },
        { path: 'src/store.js', content: storeJs }
      ],
      target: 'android'
    });

    assert.equal(androidLinkResult.ok, true, `Android link check failed: ${JSON.stringify(androidLinkResult.errors)}`);
    assert.equal(androidLinkResult.unresolved.length, 0, `Found unresolved identifiers in Android bundle: ${androidLinkResult.unresolved.map(u => u.name).join(', ')}`);

    // Verify evaluation in QuickJS-compatible VM sandbox
    const androidSandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __liquid_native_bridge: { sendBatch: () => '[]' }
    };
    androidSandbox.globalThis = androidSandbox;

    vm.runInNewContext(androidBundle, androidSandbox);
    assert.ok(androidSandbox.liquid, 'globalThis.liquid must exist');
    assert.equal(typeof androidSandbox.createStore, 'function', 'createStore must be a function in Android bundle');
    assert.equal(typeof androidSandbox.createRouter, 'function', 'createRouter must be a function in Android bundle');
    assert.equal(typeof androidSandbox.signal, 'function', 'signal must be a function in Android bundle');
    assert.equal(typeof androidSandbox.AndroidBatchRenderer, 'function', 'AndroidBatchRenderer must be defined in Android bundle');

    // 4. Test Web target bundling and link check
    const compiledModules = new Map();
    compiledModules.set('src/App.liq', `import { ${importList} } from 'liquid';
export default function App() { return []; }
`);

    const webBundle = buildProductionBundle({
      entryPath: path.join(testDir, 'src/main.js'),
      compiledModules,
      rootDir: testDir
    });

    assert.ok(typeof webBundle === 'string' && webBundle.length > 0, 'Web bundle must generate code');

    const webLinkResult = checkBundleLinking(webBundle, {
      sourceFiles: [
        { path: 'src/App.liq', content: appLiq },
        { path: 'src/store.js', content: storeJs },
        { path: 'src/main.js', content: mainJs }
      ],
      target: 'web'
    });

    assert.equal(webLinkResult.ok, true, `Web link check failed: ${JSON.stringify(webLinkResult.errors)}`);
    assert.equal(webLinkResult.unresolved.length, 0, `Found unresolved identifiers in Web bundle: ${webLinkResult.unresolved.map(u => u.name).join(', ')}`);

    // Verify evaluation in Web VM sandbox
    const webSandbox = {
      console,
      document: { getElementById: () => null },
      setTimeout,
      clearTimeout
    };
    webSandbox.globalThis = webSandbox;
    webSandbox.window = webSandbox;

    vm.runInNewContext(webBundle, webSandbox);
    assert.equal(typeof webSandbox.createStore, 'function', 'createStore must be a function in Web bundle');
    assert.equal(typeof webSandbox.createRouter, 'function', 'createRouter must be a function in Web bundle');
    assert.equal(typeof webSandbox.signal, 'function', 'signal must be a function in Web bundle');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});
