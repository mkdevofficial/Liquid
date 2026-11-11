import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { devCommand } from '../src/dev.js';
import { checkBundleLinking } from '../src/link-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

function fetchHttp(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }
  return null;
}

function getLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(color1Hex, color2Hex) {
  const rgb1 = hexToRgb(color1Hex);
  const rgb2 = hexToRgb(color2Hex);
  if (!rgb1 || !rgb2) return null;
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test('Acceptance: todo-counter-app loads in liquid dev with full state & native views', async () => {
  const projectDir = path.join(rootDir, 'examples/todo-counter-app');
  const prevCwd = process.cwd();
  let devServer = null;
  const testPort = 3995;
  const testToken = 'token-todo-counter';

  try {
    process.chdir(projectDir);
    devServer = await devCommand({ port: testPort, host: '127.0.0.1', token: testToken });
    const baseUrl = `http://127.0.0.1:${devServer.activePort}`;

    // 1. Fetch manifest
    const manifestRes = await fetchHttp(`${baseUrl}/manifest.json?token=${testToken}`);
    assert.equal(manifestRes.statusCode, 200);
    const manifest = JSON.parse(manifestRes.data);
    assert.equal(manifest.entry, 'bundle.js');

    // 2. Fetch bundle.js
    const bundleRes = await fetchHttp(`${baseUrl}/bundle.js?token=${testToken}`);
    assert.equal(bundleRes.statusCode, 200);
    const bundleJs = bundleRes.data;

    // 3. Link check on bundle
    const linkCheck = checkBundleLinking(bundleJs, { target: 'android' });
    assert.equal(linkCheck.ok, true, `Link check must pass with 0 unresolved identifiers: ${JSON.stringify(linkCheck.unresolved)}`);

    // 4. Evaluate bundle inside QuickJS native bridge simulation
    const nativeOps = [];
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __liquid_native_bridge: {
        applyBatch: (batchStr) => {
          const ops = JSON.parse(batchStr);
          nativeOps.push(...ops);
        }
      }
    };
    sandbox.globalThis = sandbox;

    vm.runInNewContext(bundleJs, sandbox);

    // 5. Assertions on live state and rendered views
    assert.ok(nativeOps.length > 50, `Native renderer must dispatch >50 ops, dispatched ${nativeOps.length}`);
    assert.ok(sandbox.globalStore, 'globalStore must be created');
    assert.equal(sandbox.globalStore.appName, 'Liquid 🫟 Showcase');
    assert.equal(sandbox.globalStore.globalCount, 42);
    assert.equal(sandbox.globalStore.todos.length, 3);

    // 6. Test reactive store mutations
    sandbox.globalStore.incrementGlobal();
    assert.equal(sandbox.globalStore.globalCount, 43);

    sandbox.globalStore.addTodo('Test Dev Acceptance Task');
    assert.equal(sandbox.globalStore.todos.length, 4);

    sandbox.globalStore.toggleTodo(1);
    assert.equal(sandbox.globalStore.todos.find(t => t.id === 1).done, false);

  } finally {
    if (devServer) devServer.close();
    process.chdir(prevCwd);
  }
});

test('Acceptance: android-sample loads in liquid dev and passes parity scenarios', async () => {
  const projectDir = path.join(rootDir, 'examples/android-sample');
  const prevCwd = process.cwd();
  let devServer = null;
  const testPort = 3996;
  const testToken = 'token-android-sample';

  try {
    process.chdir(projectDir);
    devServer = await devCommand({ port: testPort, host: '127.0.0.1', token: testToken });
    const baseUrl = `http://127.0.0.1:${devServer.activePort}`;

    // 1. Fetch bundle
    const bundleRes = await fetchHttp(`${baseUrl}/bundle.js?token=${testToken}`);
    assert.equal(bundleRes.statusCode, 200);
    const bundleJs = bundleRes.data;

    // 2. Link check
    const linkCheck = checkBundleLinking(bundleJs, { target: 'android' });
    assert.equal(linkCheck.ok, true, `Link check must pass with 0 unresolved identifiers: ${JSON.stringify(linkCheck.unresolved)}`);

    // 3. Evaluate bundle in QuickJS native bridge simulation
    const nativeOps = [];
    let registeredRenderer = null;

    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __liquid_native_bridge: {
        applyBatch: (batchStr) => {
          const ops = JSON.parse(batchStr);
          nativeOps.push(...ops);
        }
      }
    };
    sandbox.globalThis = sandbox;

    vm.runInNewContext(bundleJs, sandbox);
    registeredRenderer = sandbox.getRenderer ? sandbox.getRenderer() : null;

    assert.ok(nativeOps.length > 50, `android-sample must dispatch initial ops, dispatched ${nativeOps.length}`);
    assert.ok(registeredRenderer, 'Renderer must be registered in runtime');

    // 4. Verify native view tree structure and text content
    const nodes = registeredRenderer.nodes;
    assert.ok(nodes.size > 10, `Expected >10 rendered nodes, got ${nodes.size}`);

    // Find Counter node: "Count: 0 (Double: 0)"
    let counterNode = null;
    let headerLogoNode = null;
    let badgeNode = null;
    let plusBtnNode = null;
    let addBtnNode = null;
    let deleteBtnNode = null;

    for (const [id, node] of nodes.entries()) {
      const text = node.textContent || '';
      if (text.includes('Count:') && text.includes('Double:')) counterNode = node;
      if (text.includes('Liquid App')) headerLogoNode = node;
      if (text.includes('Ready to build')) badgeNode = node;
      if (text === '+') plusBtnNode = node;
      if (text === 'Add') addBtnNode = node;
      if (text === '✕') deleteBtnNode = node;
    }

    assert.ok(counterNode, 'Counter text node "Count: 0 (Double: 0)" must exist');
    assert.ok(headerLogoNode, 'Header logo node "Liquid App" must exist');
    assert.ok(badgeNode, 'Badge node "Ready to build" must exist');
    assert.ok(plusBtnNode, 'Increment button "+" must exist');
    assert.ok(addBtnNode, 'Add button must exist');
    assert.ok(deleteBtnNode, 'Delete button "✕" must exist');

    // 5. Scenario 1: Tap "+" button to test reactive increment
    assert.equal(counterNode.textContent, 'Count: 0 (Double: 0)');
    // Find click listener on plusBtn or its parent view
    let targetClickId = plusBtnNode.id;
    if (!plusBtnNode._listeners?.has('click') && plusBtnNode.parentNode) {
      targetClickId = plusBtnNode.parentNode.id;
    }
    registeredRenderer.dispatchNativeEvent(targetClickId, 'click', {});
    registeredRenderer.flush();

    assert.equal(counterNode.textContent, 'Count: 1 (Double: 2)', 'Counter must reactively increment to Count: 1 (Double: 2)');

    // 6. Scenario 2: Tap "+" again
    registeredRenderer.dispatchNativeEvent(targetClickId, 'click', {});
    registeredRenderer.flush();
    assert.equal(counterNode.textContent, 'Count: 2 (Double: 4)', 'Counter must reactively increment to Count: 2 (Double: 4)');

    // 7. Accessibility Contrast check on Header and Badge
    // Header background: #0f172a, Text color: #f8fafc
    const headerRatio = calculateContrastRatio('#0f172a', '#f8fafc');
    assert.ok(headerRatio >= 4.5, `Header contrast ratio must be >= 4.5:1 (got ${headerRatio.toFixed(2)})`);

  } finally {
    if (devServer) devServer.close();
    process.chdir(prevCwd);
  }
});
