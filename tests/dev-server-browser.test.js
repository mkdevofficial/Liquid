import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { createCommand } from '../packages/liquid-cli/src/create.js';
import { devCommand } from '../packages/liquid-cli/src/dev.js';

const TEST_DIR = path.resolve('tmp-e2e-browser-test');

test.before(async () => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

test.after(async () => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

function hasChromium() {
  try {
    execSync('which chromium || which google-chrome', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pure JavaScript CDP client helper for headless Chromium.
 * Uses dynamic port (--remote-debugging-port=0) and isolated user-data-dir.
 */
async function runWithChromium(url, checkFn) {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'liq-chrome-'));
  const bin = fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : 'google-chrome';
  const chrome = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${tmpProfile}`,
    '--remote-debugging-port=0'
  ]);

  let wsUrl = null;
  chrome.stderr.on('data', (d) => {
    const str = d.toString();
    const match = str.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      wsUrl = match[1];
    }
  });

  try {
    for (let i = 0; i < 40; i++) {
      if (wsUrl) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (!wsUrl) {
      throw new Error('Chromium did not output DevTools WebSocket URL in time');
    }

    const host = new URL(wsUrl).host;
    const tabRes = await fetch(`http://${host}/json/new`, { method: 'PUT' });
    const tab = await tabRes.json();
    const pageWs = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => pageWs.onopen = r);

    let nextId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = nextId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            pageWs.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        pageWs.addEventListener('message', handler);
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    const browserExceptions = [];
    pageWs.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        browserExceptions.push(msg.params.exceptionDetails);
      }
    });

    await send('Page.navigate', { url });

    const result = await checkFn(send, { browserExceptions });
    pageWs.close();
    return result;
  } finally {
    chrome.kill();
    setTimeout(() => {
      try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}
    }, 500);
  }
}

/**
 * Extract true ESM import specifiers from JavaScript source code.
 */
function extractImportSpecifiers(code) {
  const specifiers = [];
  const regex = /(?:^|\n)\s*(?:import\s+(?:[\w*\s{},]+from\s+)?|export\s+[\w*\s{},]+from\s+|import\s+)['"]([^'"]+)['"]/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    const spec = m[1].trim();
    if (spec && !spec.includes('\n')) {
      specifiers.push(spec);
    }
  }
  return specifiers;
}

/**
 * Strict Browser ESM Loader Simulator:
 * Recursively resolves modules according to native browser ESM specification:
 * - Bare specifiers MUST be resolved via import map or error is thrown
 * - Content-Type MUST be a JavaScript MIME type
 * - Status code MUST be 200
 */
async function strictBrowserESMLoader(baseUrl) {
  const indexRes = await fetch(baseUrl);
  assert.strictEqual(indexRes.status, 200);
  assert.ok(indexRes.headers.get('content-type').includes('text/html'));
  const html = await indexRes.text();

  // Extract import map
  let importMap = { imports: {} };
  const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (importMapMatch) {
    importMap = JSON.parse(importMapMatch[1]);
  }

  // Extract module scripts
  const scriptMatches = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)];
  assert.ok(scriptMatches.length > 0, 'index.html must contain at least one module script');

  const visitedUrls = new Set();
  const loadedModules = new Map();

  async function loadModule(specifier, referrerUrl) {
    let resolvedUrl;
    if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
      resolvedUrl = specifier;
    } else if (specifier.startsWith('/')) {
      resolvedUrl = new URL(specifier, baseUrl).href;
    } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
      resolvedUrl = new URL(specifier, referrerUrl).href;
    } else {
      // Bare specifier! Must resolve via import map
      if (importMap.imports && importMap.imports[specifier]) {
        resolvedUrl = new URL(importMap.imports[specifier], baseUrl).href;
      } else {
        throw new Error(`Strict ESM failure: Bare module specifier "${specifier}" cannot be resolved by browser from ${referrerUrl}`);
      }
    }

    if (visitedUrls.has(resolvedUrl)) return;
    visitedUrls.add(resolvedUrl);

    const res = await fetch(resolvedUrl);
    assert.strictEqual(res.status, 200, `Module ${resolvedUrl} returned status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(
      contentType.includes('application/javascript') || contentType.includes('text/javascript'),
      `Module ${resolvedUrl} returned invalid Content-Type: ${contentType}`
    );

    const code = await res.text();
    loadedModules.set(resolvedUrl, code);

    // Parse all imports and exports
    const childSpecs = extractImportSpecifiers(code);
    for (const childSpec of childSpecs) {
      await loadModule(childSpec, resolvedUrl);
    }
  }

  for (const match of scriptMatches) {
    await loadModule(match[1], baseUrl);
  }

  return { visitedUrls, loadedModules };
}

test('E2E Browser - standard scaffolded project renders visible content and is NOT blank', async () => {
  const projPath = path.join(TEST_DIR, 'standard-app');
  await createCommand(projPath);

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3511, host: '127.0.0.1' });

    // 1. Strict Browser Module Loader verification
    const { visitedUrls } = await strictBrowserESMLoader('http://127.0.0.1:3511/');
    assert.ok(visitedUrls.size >= 4, 'Must load entry script and dependencies');

    // 2. Headless Chromium verification (if available)
    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3511/', async (send, { browserExceptions }) => {
        await new Promise(r => setTimeout(r, 1200));

        const appHtmlRes = await send('Runtime.evaluate', {
          expression: 'document.getElementById("app").innerHTML'
        });
        const appHtml = appHtmlRes.result.value || '';

        // CRITICAL ASSERTION: The app must NOT be blank
        assert.ok(appHtml.length > 0, 'document.getElementById("app").innerHTML must not be blank');
        assert.ok(appHtml.includes('app-container'), 'Rendered DOM must contain app-container');
        assert.ok(appHtml.includes('Counter'), 'Rendered DOM must contain Counter section');
        assert.ok(appHtml.includes('Todo List'), 'Rendered DOM must contain Todo List section');
        assert.ok(appHtml.includes('standard-app'), 'Rendered DOM must contain app title');

        assert.strictEqual(browserExceptions.length, 0, 'Browser must have 0 uncaught exceptions');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('E2E Browser - minimal scaffolded project (--minimal) renders visible content and is NOT blank', async () => {
  const projPath = path.join(TEST_DIR, 'min-app');
  await createCommand(projPath, { minimal: true });

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3512, host: '127.0.0.1' });

    // 1. Strict Browser Module Loader verification
    const { visitedUrls } = await strictBrowserESMLoader('http://127.0.0.1:3512/');
    assert.ok(visitedUrls.size >= 3, 'Must load minimal entry script and dependencies');

    // 2. Headless Chromium verification (if available)
    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3512/', async (send, { browserExceptions }) => {
        await new Promise(r => setTimeout(r, 1200));

        const appHtmlRes = await send('Runtime.evaluate', {
          expression: 'document.getElementById("app").innerHTML'
        });
        const appHtml = appHtmlRes.result.value || '';

        // CRITICAL ASSERTION: The app must NOT be blank
        assert.ok(appHtml.length > 0, 'document.getElementById("app").innerHTML must not be blank');
        assert.ok(appHtml.includes('container'), 'Rendered DOM must contain container');
        assert.ok(appHtml.includes('Hello from Liquid'), 'Rendered DOM must contain greeting');

        assert.strictEqual(browserExceptions.length, 0, 'Browser must have 0 uncaught exceptions');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('E2E Browser - in-browser runtime error overlay displays error mapped to .liq file (Bug 2)', async () => {
  const projPath = path.join(TEST_DIR, 'error-app');
  await createCommand(projPath, { minimal: true });

  const brokenLiq = `--- logic
throw new Error('Explosion inside App.liq logic');

--- ui
h1 Will not render
`;
  fs.writeFileSync(path.join(projPath, 'src/App.liq'), brokenLiq);

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3513, host: '127.0.0.1' });

    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3513/', async (send) => {
        await new Promise(r => setTimeout(r, 1200));

        const overlayRes = await send('Runtime.evaluate', {
          expression: 'document.getElementById("liquid-error-overlay")?.innerText'
        });
        const overlayText = overlayRes.result.value || '';

        assert.ok(overlayText.length > 0, 'liquid-error-overlay element must exist and be visible');
        assert.ok(overlayText.includes('Liquid Runtime Error'), 'Overlay must have title Liquid Runtime Error');
        assert.ok(overlayText.includes('Explosion inside App.liq logic'), 'Overlay must display error message');
        assert.ok(overlayText.includes('src/App.liq'), 'Overlay must map stack trace to .liq file');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('E2E Browser - mount watchdog diagnostic displays warning if #app mounts nothing (Bug 2)', async () => {
  const projPath = path.join(TEST_DIR, 'empty-app');
  await createCommand(projPath, { minimal: true });

  // Intentionally blank main.js
  fs.writeFileSync(path.join(projPath, 'src/main.js'), '// Intentionally mounts nothing\n');

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3514, host: '127.0.0.1' });

    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3514/', async (send) => {
        // Wait 2.2s for watchdog
        await new Promise(r => setTimeout(r, 2300));

        const watchdogRes = await send('Runtime.evaluate', {
          expression: 'document.getElementById("liquid-mount-watchdog")?.innerText'
        });
        const watchdogText = watchdogRes.result.value || '';

        assert.ok(watchdogText.length > 0, 'liquid-mount-watchdog must be displayed');
        assert.ok(watchdogText.includes('Liquid Diagnostic: #app has not mounted content'), 'Watchdog must explain empty #app');
        assert.ok(watchdogText.includes('mount(App, document.getElementById(\'app\'))'), 'Watchdog must suggest mount() call');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('E2E Browser - todo add-flow with 1, 2, many characters, Arabic/RTL, and emoji (Pass 2)', async () => {
  const projPath = path.join(TEST_DIR, 'todo-flow-app');
  await createCommand(projPath);

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3515, host: '127.0.0.1' });

    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3515/', async (send, { browserExceptions }) => {
        await new Promise(r => setTimeout(r, 1200));

        async function getTodoTexts() {
          const res = await send('Runtime.evaluate', {
            expression: 'Array.from(document.querySelectorAll(".todo-item span")).map(el => el.textContent.trim())',
            returnByValue: true
          });
          return res.result.value || [];
        }

        async function typeAndAdd(inputText) {
          await send('Runtime.evaluate', {
            expression: `(() => {
              const input = document.querySelector('input.input-text');
              input.value = ${JSON.stringify(inputText)};
              input.dispatchEvent(new Event('input', { bubbles: true }));
              const btn = Array.from(document.querySelectorAll('button.btn')).find(b => b.textContent.trim() === 'Add');
              btn.click();
            })()`,
            returnByValue: true
          });
          await new Promise(r => setTimeout(r, 150));
        }

        // 1. Initial seeded items
        const initial = await getTodoTexts();
        assert.deepStrictEqual(initial, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals'
        ]);

        // 2. Add 1 character: 'X'
        await typeAndAdd('X');
        const after1Char = await getTodoTexts();
        assert.deepStrictEqual(after1Char, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'X'
        ], '1-character input must be added as single item');

        // 3. Add 2 characters: 'OK' (must not drop either character)
        await typeAndAdd('OK');
        const after2Chars = await getTodoTexts();
        assert.deepStrictEqual(after2Chars, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'X',
          'OK'
        ], '2-character input must be added as single item without dropping');

        // 4. Add many characters / full sentence (must NOT split into characters)
        await typeAndAdd('Fine-grained signals are fast');
        const afterManyChars = await getTodoTexts();
        assert.deepStrictEqual(afterManyChars, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'X',
          'OK',
          'Fine-grained signals are fast'
        ], 'Sentence must be added as single item, not split into characters');

        // 5. Add Arabic / RTL text
        await typeAndAdd('مرحبا بكم في ليكويد 🫟');
        const afterArabic = await getTodoTexts();
        assert.deepStrictEqual(afterArabic, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'X',
          'OK',
          'Fine-grained signals are fast',
          'مرحبا بكم في ليكويد 🫟'
        ], 'Arabic text must be added intact as single item');

        // 6. Add Emoji text
        await typeAndAdd('🚀✨🎉 Ultra Fast UI');
        const afterEmoji = await getTodoTexts();
        assert.deepStrictEqual(afterEmoji, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'X',
          'OK',
          'Fine-grained signals are fast',
          'مرحبا بكم في ليكويد 🫟',
          '🚀✨🎉 Ultra Fast UI'
        ], 'Emoji text must be added intact as single item');

        assert.strictEqual(browserExceptions.length, 0, 'Zero browser exceptions during add flow');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});
