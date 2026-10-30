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
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--no-first-run',
    `--user-data-dir=${tmpProfile}`,
    '--remote-debugging-port=0'
  ]);

  let wsUrl = null;
  let outputBuffer = '';
  const onData = (d) => {
    outputBuffer += d.toString();
    const match = outputBuffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      wsUrl = match[1];
    }
  };
  chrome.stderr.on('data', onData);
  chrome.stdout.on('data', onData);

  try {
    for (let i = 0; i < 80; i++) {
      if (wsUrl) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (!wsUrl) {
      throw new Error('Chromium did not output DevTools WebSocket URL in time: ' + outputBuffer.slice(-500));
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
    try { chrome.kill('SIGKILL'); } catch {}
    setTimeout(() => {
      try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}
    }, 500);
  }
}

async function waitForSelector(send, selector, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
      returnByValue: true
    });
    if (res?.result?.value) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
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
        await waitForSelector(send, '.app-container');

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
        await waitForSelector(send, '.container');

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
        await waitForSelector(send, '#liquid-error-overlay');

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
        // Wait for watchdog to display after 2s
        await waitForSelector(send, '#liquid-mount-watchdog', 6000);

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

test('E2E Browser - faithful real typing with character-by-character events, IME composition, and Enter key (Pass 3)', async () => {
  const projPath = path.join(TEST_DIR, 'todo-flow-app');
  await createCommand(projPath);

  const prevCwd = process.cwd();
  let server;
  try {
    process.chdir(projPath);
    server = await devCommand({ port: 3515, host: '127.0.0.1' });

    if (hasChromium()) {
      await runWithChromium('http://127.0.0.1:3515/', async (send, { browserExceptions }) => {
        await waitForSelector(send, '.todo-item');

        async function getTodoTexts() {
          const res = await send('Runtime.evaluate', {
            expression: 'Array.from(document.querySelectorAll(".todo-item span")).map(el => el.textContent.trim())',
            returnByValue: true
          });
          return res.result.value || [];
        }

        async function getInputValue() {
          const res = await send('Runtime.evaluate', {
            expression: 'document.querySelector("input.input-text")?.value',
            returnByValue: true
          });
          return res.result.value ?? '';
        }

        /**
         * Real faithful character-by-character typing simulation.
         * For each character: keydown -> beforeinput -> input.value += char -> input -> keyup.
         */
        async function typeCharacterByCharacter(textToType) {
          await send('Runtime.evaluate', {
            expression: `(() => {
              const input = document.querySelector('input.input-text');
              input.focus();
              const chars = Array.from(${JSON.stringify(textToType)});
              for (const c of chars) {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: c, bubbles: true, cancelable: true }));
                input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: c, bubbles: true }));
                input.value += c;
                input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: c, bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { key: c, bubbles: true, cancelable: true }));
              }
            })()`,
            returnByValue: true
          });
          await new Promise(r => setTimeout(r, 50));
        }

        /**
         * Real IME composition simulation for East Asian/virtual keyboards.
         * compositionstart -> compositionupdate -> beforeinput -> input -> compositionend -> keydown/keyup.
         */
        async function typeWithIMEComposition(textToType) {
          await send('Runtime.evaluate', {
            expression: `(() => {
              const input = document.querySelector('input.input-text');
              input.focus();
              input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
              input.dispatchEvent(new CompositionEvent('compositionupdate', { data: ${JSON.stringify(textToType)}, bubbles: true }));
              input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertCompositionText', data: ${JSON.stringify(textToType)}, bubbles: true }));
              input.value += ${JSON.stringify(textToType)};
              input.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: ${JSON.stringify(textToType)}, bubbles: true }));
              input.dispatchEvent(new CompositionEvent('compositionend', { data: ${JSON.stringify(textToType)}, bubbles: true }));
              // Android Gboard sends keydown with keyCode 229 during composition
              input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', keyCode: 229, bubbles: true }));
              input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Unidentified', keyCode: 229, bubbles: true }));
            })()`,
            returnByValue: true
          });
          await new Promise(r => setTimeout(r, 50));
        }

        async function clickAddButton() {
          await send('Runtime.evaluate', {
            expression: `(() => {
              const btn = Array.from(document.querySelectorAll('button.btn')).find(b => b.textContent.trim() === 'Add');
              btn.click();
            })()`,
            returnByValue: true
          });
          await new Promise(r => setTimeout(r, 100));
        }

        async function pressKey(key, keyCode = 0) {
          await send('Runtime.evaluate', {
            expression: `(() => {
              const input = document.querySelector('input.input-text');
              input.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, keyCode: ${keyCode}, which: ${keyCode}, bubbles: true, cancelable: true }));
              input.dispatchEvent(new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, keyCode: ${keyCode}, which: ${keyCode}, bubbles: true, cancelable: true }));
            })()`,
            returnByValue: true
          });
          await new Promise(r => setTimeout(r, 100));
        }

        // 1. Initial seeded items
        const initial = await getTodoTexts();
        assert.deepStrictEqual(initial, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals'
        ]);

        // 2. Type 'a', then 'b' character by character
        // CRITICAL CHECK: The list must remain completely unchanged while typing!
        await typeCharacterByCharacter('a');
        let todosWhileTypingA = await getTodoTexts();
        assert.deepStrictEqual(todosWhileTypingA, initial, 'Typing "a" must NOT add any item before Add is pressed');

        await typeCharacterByCharacter('b');
        let todosWhileTypingB = await getTodoTexts();
        assert.deepStrictEqual(todosWhileTypingB, initial, 'Typing "b" must NOT add any item before Add is pressed');
        assert.strictEqual(await getInputValue(), 'ab', 'Input must retain typed string "ab"');

        // Now click Add -> exactly ONE item "ab" is added, input clears
        await clickAddButton();
        const afterAB = await getTodoTexts();
        assert.deepStrictEqual(afterAB, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'ab'
        ], 'Clicking Add must add exactly ONE item "ab"');
        assert.strictEqual(await getInputValue(), '', 'Input must be cleared after adding');

        // 3. Long sentence typing character-by-character
        await typeCharacterByCharacter('Fine-grained signals are fast');
        let todosWhileTypingSentence = await getTodoTexts();
        assert.deepStrictEqual(todosWhileTypingSentence, afterAB, 'Typing sentence must not add items while typing');
        assert.strictEqual(await getInputValue(), 'Fine-grained signals are fast');

        await clickAddButton();
        const afterSentence = await getTodoTexts();
        assert.deepStrictEqual(afterSentence, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'ab',
          'Fine-grained signals are fast'
        ]);
        assert.strictEqual(await getInputValue(), '');

        // 4. Arabic RTL text character-by-character
        await typeCharacterByCharacter('مرحبا بكم في ليكويد 🫟');
        let todosWhileTypingArabic = await getTodoTexts();
        assert.deepStrictEqual(todosWhileTypingArabic, afterSentence, 'Typing Arabic must not add items while typing');

        await clickAddButton();
        const afterArabic = await getTodoTexts();
        assert.deepStrictEqual(afterArabic, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'ab',
          'Fine-grained signals are fast',
          'مرحبا بكم في ليكويد 🫟'
        ]);

        // 5. Emoji with IME Composition sequence
        await typeWithIMEComposition('🚀✨🎉 Ultra Fast UI');
        let todosDuringIME = await getTodoTexts();
        assert.deepStrictEqual(todosDuringIME, afterArabic, 'IME composition must not add items before commit');

        await clickAddButton();
        const afterEmoji = await getTodoTexts();
        assert.deepStrictEqual(afterEmoji, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'ab',
          'Fine-grained signals are fast',
          'مرحبا بكم في ليكويد 🫟',
          '🚀✨🎉 Ultra Fast UI'
        ]);

        // 6. Enter key support (@keydown.enter)
        // Non-Enter keys (e.g. Tab, Escape, ArrowDown) must NOT add items
        await typeCharacterByCharacter('Enter key item');
        await pressKey('Tab', 9);
        await pressKey('Escape', 27);
        await pressKey('ArrowDown', 40);
        let todosAfterOtherKeys = await getTodoTexts();
        assert.deepStrictEqual(todosAfterOtherKeys, afterEmoji, 'Non-Enter keys must NOT add items');

        // Pressing Enter must add the item and clear the input
        await pressKey('Enter', 13);
        const afterEnter = await getTodoTexts();
        assert.deepStrictEqual(afterEnter, [
          'Write elegant UI in .liq',
          'Embrace fine-grained signals',
          'ab',
          'Fine-grained signals are fast',
          'مرحبا بكم في ليكويد 🫟',
          '🚀✨🎉 Ultra Fast UI',
          'Enter key item'
        ], 'Pressing Enter must add the item without clicking Add button');
        assert.strictEqual(await getInputValue(), '', 'Input must be cleared after Enter');

        assert.strictEqual(browserExceptions.length, 0, 'Zero browser exceptions during add flow');
      });
    }
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});
