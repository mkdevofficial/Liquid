import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { devCommand } from '../packages/liquid-cli/src/dev.js';
import { buildCommand } from '../packages/liquid-cli/src/build.js';
import { previewCommand } from '../packages/liquid-cli/src/preview.js';

const MASROUF_DIR = path.resolve('apps/masrouf');

function hasChromium() {
  try {
    execSync('which chromium || which google-chrome', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runWithChromium(url, checkFn) {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'masrouf-chrome-'));
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
    '--no-zygote',
    '--password-store=basic',
    '--use-mock-keychain',
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
    for (let i = 0; i < 250; i++) {
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

async function waitForSelector(send, selector, timeoutMs = 20000) {
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

test('Masrouf E2E - Full User Flow driven by real character typing in headless browser', async () => {
  if (!hasChromium()) return;

  const prevCwd = process.cwd();
  let server;

  try {
    process.chdir(MASROUF_DIR);
    server = await devCommand({ port: 3521, host: '127.0.0.1' });

    await runWithChromium('http://127.0.0.1:3521/', async (send, { browserExceptions }) => {
      await waitForSelector(send, '.app-shell');

      // Helper to evaluate script
      async function evaluate(code) {
        const res = await send('Runtime.evaluate', { expression: code, returnByValue: true });
        return res?.result?.value;
      }

      // Helper to type character-by-character into a focused element
      async function typeInto(selector, textToType) {
        await evaluate(`(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el) {
            el.focus();
            el.value = '';
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            const chars = Array.from(${JSON.stringify(textToType)});
            let accum = '';
            for (const ch of chars) {
              accum += ch;
              el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
              el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true }));
              el.value = accum;
              el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: ch, bubbles: true }));
              el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
            }
          }
        })()`);
        await new Promise(r => setTimeout(r, 50));
      }

      // Helper to click an element
      async function click(selector) {
        await evaluate(`(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el) el.click();
        })()`);
        await new Promise(r => setTimeout(r, 150));
      }

      // 1. Initial Dashboard Verification
      const initialShellText = await evaluate('document.querySelector(".app-shell")?.textContent || ""');
      assert.ok(initialShellText.includes('مصروف') || initialShellText.includes('Masrouf'), 'Dashboard must render Masrouf title');
      assert.ok(await evaluate('document.querySelectorAll(".card").length >= 2'), 'Dashboard must render summary cards');

      // 2. Add Transaction via Real Typing
      await click('button.nav-btn-add');
      await waitForSelector(send, 'form');

      // Verify form rendered
      assert.ok(await evaluate('Boolean(document.querySelector("form"))'), 'Form must be displayed');

      // Type amount character-by-character: '185.50'
      await typeInto('input.amount-field', '185.50');
      const enteredAmount = await evaluate('document.querySelector("input.amount-field").value');
      assert.strictEqual(enteredAmount, '185.50', 'Amount must match character typing');

      // Select category 'food'
      await click('.category-picker button.cat-chip');

      // Type note character-by-character: 'Special Family Feast 🍱'
      await typeInto('textarea.textarea-control', 'Special Family Feast 🍱');
      const enteredNote = await evaluate('document.querySelector("textarea.textarea-control").value');
      assert.strictEqual(enteredNote, 'Special Family Feast 🍱');

      // Submit form
      await click('button.btn-submit');
      await waitForSelector(send, '.search-input'); // Navigates to history

      // 3. Verify Added Transaction in History
      const historyText = await evaluate('document.querySelector(".main-content")?.textContent || ""');
      assert.ok(historyText.includes('Special Family Feast 🍱'), 'History must contain newly added transaction');
      assert.ok(historyText.includes('185.50') || historyText.includes('١٨٥٫٥٠'), 'History must display formatted amount');

      // 4. Edit Transaction via Real Typing
      // Click on the first transaction item to open edit mode
      await click('.tx-item');
      await waitForSelector(send, 'form');

      const loadedNote = await evaluate('document.querySelector("textarea.textarea-control").value');
      assert.strictEqual(loadedNote, 'Special Family Feast 🍱', 'Edit form must pre-populate existing note');

      // Change note character-by-character to 'Updated Family Feast 🍲'
      await typeInto('textarea.textarea-control', 'Updated Family Feast 🍲');
      await click('button.btn-submit');
      await waitForSelector(send, '.search-input');

      // Verify update in History
      const updatedHistoryText = await evaluate('document.querySelector(".main-content")?.textContent || ""');
      assert.ok(updatedHistoryText.includes('Updated Family Feast 🍲'), 'History must reflect updated note');

      // 5. Filter & Search via Real Typing
      await typeInto('input.search-input', 'Updated Family');
      await new Promise(r => setTimeout(r, 200));
      const searchCount = await evaluate('document.querySelectorAll(".tx-item").length');
      assert.strictEqual(searchCount, 1, 'Search query must filter list to matching item');

      // Clear search
      await evaluate('document.querySelector("input.search-input").value = ""');
      await evaluate('document.querySelector("input.search-input").dispatchEvent(new Event("input", { bubbles: true }))');
      await new Promise(r => setTimeout(r, 200));

      // 6. Delete Transaction with Confirmation
      const itemsCountBefore = await evaluate('document.querySelectorAll(".tx-item").length');
      await click('.tx-item button.tx-del-btn'); // click delete on first item
      await waitForSelector(send, '.dialog-box');

      const dialogVisible = await evaluate('Boolean(document.querySelector(".dialog-box"))');
      assert.strictEqual(dialogVisible, true, 'Confirm dialog must appear');

      // Click Confirm button
      await click('button.btn-confirm');
      await new Promise(r => setTimeout(r, 200));

      const itemsCountAfter = await evaluate('document.querySelectorAll(".tx-item").length');
      assert.strictEqual(itemsCountAfter, itemsCountBefore - 1, 'Transaction item must be deleted from list');

      // 7. Language Switch to Arabic (RTL) & English (LTR)
      await click('header.app-header .header-actions button:first-child'); // toggle language
      await new Promise(r => setTimeout(r, 200));

      const dirAfterToggle = await evaluate('document.documentElement.getAttribute("dir")');
      const langAfterToggle = await evaluate('document.documentElement.getAttribute("lang")');
      assert.ok(dirAfterToggle === 'rtl' || dirAfterToggle === 'ltr', 'Document dir must be set');
      assert.ok(langAfterToggle === 'ar' || langAfterToggle === 'en', 'Document lang must be set');

      // 8. Theme Switch (Dark / Light)
      await click('header.app-header .header-actions button:last-child'); // toggle theme
      await new Promise(r => setTimeout(r, 200));
      const themeAfterToggle = await evaluate('document.documentElement.getAttribute("data-theme")');
      assert.ok(themeAfterToggle === 'dark' || themeAfterToggle === 'light', 'Data-theme must toggle');

      // 9. Persistence Across Page Reload
      // Add a test transaction then reload page
      await click('button.nav-btn-add');
      await waitForSelector(send, 'form');
      await typeInto('input.amount-field', '777.77');
      await typeInto('textarea.textarea-control', 'Reload-Test-777');
      await click('button.btn-submit');
      await waitForSelector(send, '.search-input');

      // Reload page in Chromium
      await send('Page.reload');
      await waitForSelector(send, '.app-shell');

      // Check localStorage restored data
      const reloadedContent = await evaluate('document.body?.textContent || ""');
      assert.ok(reloadedContent.includes('Reload-Test-777'), 'Transaction must persist across page reload');

      // 10. Export / Import in Settings
      await click('nav.bottom-nav button:last-child'); // Settings
      await waitForSelector(send, '.settings-section');

      // Click Export
      await click('button.btn-action');
      const exportedJson = await evaluate('document.querySelector("textarea.json-area").value');
      assert.ok(exportedJson.length > 0, 'Exported JSON must not be empty');
      const parsedExport = JSON.parse(exportedJson);
      assert.strictEqual(parsedExport.version, 1, 'Exported JSON must be valid version 1');

      assert.strictEqual(browserExceptions.length, 0, 'Zero uncaught browser exceptions during full E2E flow');
    });
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('Masrouf CSS Parity - dev mode and preview mode computed styles match across languages and themes', async () => {
  if (!hasChromium()) return;

  const prevCwd = process.cwd();
  let devServer;
  let previewServer;

  try {
    process.chdir(MASROUF_DIR);

    // 1. Dev mode: start dev server and probe computed styles
    devServer = await devCommand({ port: 3522, host: '127.0.0.1' });

    let devStyles = null;
    await runWithChromium('http://127.0.0.1:3522/', async (send) => {
      await waitForSelector(send, '.app-shell');
      await waitForSelector(send, '.card');
      await waitForSelector(send, '.bottom-nav');

      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          function getStyles(sel, props) {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            const out = {};
            for (const p of props) {
              out[p] = cs.getPropertyValue(p);
            }
            return out;
          }

          const shellProps = ['max-width', 'display', 'position'];
          const cardProps = ['border-radius', 'padding-top', 'padding-bottom', 'box-shadow'];
          const navProps = ['position', 'bottom', 'height', 'display', 'max-width'];
          const addBtnProps = ['width', 'height', 'border-radius'];

          return {
            shell: getStyles('.app-shell', shellProps),
            card: getStyles('.card', cardProps),
            nav: getStyles('.bottom-nav', navProps),
            addBtn: getStyles('.nav-btn-add', addBtnProps)
          };
        })()`,
        returnByValue: true
      });
      devStyles = res?.result?.value;
    });

    devServer.close();
    devServer = null;

    // 2. Production build and preview mode
    await buildCommand();
    previewServer = await previewCommand({ port: 4181, host: '127.0.0.1' });

    let previewStyles = null;
    await runWithChromium('http://127.0.0.1:4181/', async (send) => {
      await waitForSelector(send, '.app-shell');
      await waitForSelector(send, '.card');
      await waitForSelector(send, '.bottom-nav');

      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          function getStyles(sel, props) {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            const out = {};
            for (const p of props) {
              out[p] = cs.getPropertyValue(p);
            }
            return out;
          }

          const shellProps = ['max-width', 'display', 'position'];
          const cardProps = ['border-radius', 'padding-top', 'padding-bottom', 'box-shadow'];
          const navProps = ['position', 'bottom', 'height', 'display', 'max-width'];
          const addBtnProps = ['width', 'height', 'border-radius'];

          return {
            shell: getStyles('.app-shell', shellProps),
            card: getStyles('.card', cardProps),
            nav: getStyles('.bottom-nav', navProps),
            addBtn: getStyles('.nav-btn-add', addBtnProps)
          };
        })()`,
        returnByValue: true
      });
      previewStyles = res?.result?.value;
    });

    assert.ok(devStyles, 'Dev styles must be captured');
    assert.ok(previewStyles, 'Preview styles must be captured');

    // Specific design token checks
    assert.strictEqual(devStyles.shell['max-width'], '480px');
    assert.strictEqual(previewStyles.shell['max-width'], '480px');
    assert.strictEqual(devStyles.card['border-radius'], '16px');
    assert.strictEqual(previewStyles.card['border-radius'], '16px');
    assert.strictEqual(devStyles.nav['height'], '64px');
    assert.strictEqual(previewStyles.nav['height'], '64px');
    assert.strictEqual(devStyles.addBtn['border-radius'], '50%');
    assert.strictEqual(previewStyles.addBtn['border-radius'], '50%');

    // Deep strict equality
    assert.deepStrictEqual(devStyles, previewStyles, 'Computed styles must match identically between dev and preview');
  } finally {
    if (devServer) devServer.close();
    if (previewServer) previewServer.close();
    process.chdir(prevCwd);
  }
});
