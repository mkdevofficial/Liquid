import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { buildCommand } from '../packages/liquid-cli/src/build.js';
import { previewCommand } from '../packages/liquid-cli/src/preview.js';

const LEARN_DIR = path.resolve('apps/learn-liquid');

function hasChromium() {
  try {
    execSync('which chromium || which google-chrome', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runWithChromium(url, checkFn) {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'learn-liquid-chrome-'));
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
    const consoleLogs = [];
    pageWs.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        browserExceptions.push(msg.params.exceptionDetails);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push(msg.params);
      }
    });

    await send('Page.navigate', { url });

    const result = await checkFn(send, { browserExceptions, consoleLogs });

    pageWs.close();
    return result;
  } finally {
    chrome.kill('SIGKILL');
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

test('Liquid Documentation & Guide Website ("Learn Liquid") E2E in Chromium', async (t) => {
  if (!hasChromium()) {
    t.skip('Chromium not available in this environment');
    return;
  }

  // 1. Build the application
  const originalCwd = process.cwd();
  try {
    process.chdir(LEARN_DIR);
    await buildCommand({ outDir: 'dist' });
  } finally {
    process.chdir(originalCwd);
  }

  // 2. Start preview server on free port
  const port = 4192;
  const originalCwdPreview = process.cwd();
  let server = null;
  try {
    process.chdir(LEARN_DIR);
    server = await previewCommand({ port, host: '127.0.0.1', outDir: 'dist' });
  } finally {
    process.chdir(originalCwdPreview);
  }

  const baseUrl = `http://127.0.0.1:${port}/`;

  try {
    await runWithChromium(baseUrl, async (send, { browserExceptions, consoleLogs }) => {
      // Wait for app to mount
      let appMounted = false;
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 200));
        const res = await send('Runtime.evaluate', {
          expression: `Boolean(document.getElementById('app') && document.getElementById('app').children.length > 0)`
        });
        if (res.result && res.result.value) {
          appMounted = true;
          break;
        }
      }

      if (!appMounted) {
        const bodyHtml = await send('Runtime.evaluate', { expression: `document.body.innerHTML` });
        console.error('App failed to mount! Body HTML:', bodyHtml.result.value);
        console.error('Browser Exceptions:', JSON.stringify(browserExceptions, null, 2));
        console.error('Console Logs:', JSON.stringify(consoleLogs, null, 2));
      }

      assert.ok(appMounted, 'App must mount content in #app in real Chromium browser');
      assert.strictEqual(browserExceptions.length, 0, `Browser must have zero runtime exceptions: ${JSON.stringify(browserExceptions)}`);

      // 1. Check Hero Title and Tagline in Arabic
      const heroText = await send('Runtime.evaluate', {
        expression: `document.querySelector('.hero-title') ? document.querySelector('.hero-title').innerText : ''`
      });
      assert.ok(heroText.result.value.includes('اصنع موقع'), `Hero title must be rendered in Arabic (got: "${heroText.result.value}")`);

      // 2. Check Terminal command box
      const terminalCmd = await send('Runtime.evaluate', {
        expression: `document.querySelector('.terminal-code') ? document.querySelector('.terminal-code').innerText : ''`
      });
      assert.ok(terminalCmd.result.value.includes('liquid create'), `Terminal command must mention liquid create (got: "${terminalCmd.result.value}")`);

      // 3. Test interactive Live Counter right on the page
      const initialCount = await send('Runtime.evaluate', {
        expression: `document.querySelector('.counter-num') ? document.querySelector('.counter-num').innerText.trim() : ''`
      });
      assert.strictEqual(initialCount.result.value, '0', 'Counter must start at 0');

      // Click the + button
      await send('Runtime.evaluate', {
        expression: `
          const btns = Array.from(document.querySelectorAll('.ctrl-btn'));
          const incBtn = btns.find(b => b.innerText.trim() === '+');
          if (incBtn) incBtn.click();
        `
      });
      await new Promise(r => setTimeout(r, 100));

      const updatedCount = await send('Runtime.evaluate', {
        expression: `document.querySelector('.counter-num') ? document.querySelector('.counter-num').innerText.trim() : ''`
      });
      assert.strictEqual(updatedCount.result.value, '1', 'Counter must increment to 1 after click');

      // 4. Test Navigation to Guide page via router
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/guide'`
      });
      await new Promise(r => setTimeout(r, 300));

      const guideHeading = await send('Runtime.evaluate', {
        expression: `document.querySelector('.ch-h1') ? document.querySelector('.ch-h1').innerText : ''`
      });
      assert.ok(guideHeading.result.value.includes('ما هو Liquid'), `Guide page heading must be displayed (got: "${guideHeading.result.value}")`);

      // 5. Test Navigation to Playground page
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/playground'`
      });
      await new Promise(r => setTimeout(r, 300));

      const pgHeading = await send('Runtime.evaluate', {
        expression: `document.querySelector('.pg-title') ? document.querySelector('.pg-title').innerText : ''`
      });
      assert.ok(pgHeading.result.value.includes('المعمل التفاعلي'), `Playground page must be displayed (got: "${pgHeading.result.value}")`);

      // 6. Test Navigation to Cheatsheet page
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/cheatsheet'`
      });
      await new Promise(r => setTimeout(r, 300));

      const sheetHeading = await send('Runtime.evaluate', {
        expression: `document.querySelector('.sheet-title') ? document.querySelector('.sheet-title').innerText : ''`
      });
      assert.ok(sheetHeading.result.value.includes('المرجع السريع'), `Cheatsheet page must be displayed (got: "${sheetHeading.result.value}")`);

      // 7. Test Navigation to Deploy page
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/deploy'`
      });
      await new Promise(r => setTimeout(r, 300));

      const deployHeading = await send('Runtime.evaluate', {
        expression: `document.querySelector('.deploy-title') ? document.querySelector('.deploy-title').innerText : ''`
      });
      assert.ok(deployHeading.result.value.includes('النشر والإنتاج'), `Deploy page must be displayed (got: "${deployHeading.result.value}")`);

      // 7.5. Test Navigation to Errors catalog page
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/errors'`
      });
      await new Promise(r => setTimeout(r, 300));

      const errorsHeading = await send('Runtime.evaluate', {
        expression: `document.querySelector('.page-title') ? document.querySelector('.page-title').innerText : ''`
      });
      assert.ok(errorsHeading.result.value.includes('دليل معرفات الأخطاء'), `Errors page heading must be displayed (got: "${errorsHeading.result.value}")`);

      // Verify LQ-101 card is rendered
      const lq101Card = await send('Runtime.evaluate', {
        expression: `Boolean(document.getElementById('LQ-101'))`
      });
      assert.strictEqual(lq101Card.result.value, true, 'LQ-101 error card must be rendered in DOM');

      // 8. Test Navigation to Play Arena (#/play - Gamified Microlearning)
      await send('Runtime.evaluate', {
        expression: `window.location.hash = '#/play'`
      });
      await new Promise(r => setTimeout(r, 400));

      const playPageExists = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.play-page'))`
      });
      assert.strictEqual(playPageExists.result.value, true, 'Play Arena (.play-page) must be rendered in DOM');

      const hudExists = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.hud-card'))`
      });
      assert.strictEqual(hudExists.result.value, true, 'Gaming HUD (.hud-card) must exist');

      const seasonTabsCount = await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('.season-tab').length`
      });
      assert.strictEqual(seasonTabsCount.result.value, 4, 'All 4 seasons must be rendered');

      const episodeCardsCount = await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('.episode-card').length`
      });
      assert.ok(episodeCardsCount.result.value >= 4, 'Current season episodes must be rendered');

      const bossButtonExists = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.btn-boss'))`
      });
      assert.strictEqual(bossButtonExists.result.value, true, 'Boss Exam action button must exist');

      // Test Episode 1 Live Compiler Validation
      await send('Runtime.evaluate', {
        expression: `
          const firstEp = document.querySelectorAll('.episode-card')[0];
          if (firstEp) firstEp.click();
        `
      });
      await new Promise(r => setTimeout(r, 300));

      const modalOpen = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.modal-overlay textarea'))`
      });
      assert.strictEqual(modalOpen.result.value, true, 'Episode 1 modal with textarea must be open');

      // Fill in valid completed challenge code
      const validCode = '--- ui\\ndiv.card\\n  h1 أهلاً بك في Liquid\\n  p ابدأ رحلتك التفاعلية هنا\\n  button.btn-start ابدأ الآن';
      await send('Runtime.evaluate', {
        expression: `
          const ta = document.querySelector('textarea');
          if (ta) {
            ta.value = "${validCode}";
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        `
      });
      await new Promise(r => setTimeout(r, 100));

      // Click "Verify & Live Compile"
      await send('Runtime.evaluate', {
        expression: `
          const checkBtn = document.querySelector('.btn-primary-action');
          if (checkBtn) checkBtn.click();
        `
      });
      await new Promise(r => setTimeout(r, 300));

      // Verify no "compile is not defined" error in feedback
      const feedbackText = await send('Runtime.evaluate', {
        expression: `document.querySelector('.feedback-alert') ? document.querySelector('.feedback-alert').innerText : ''`
      });
      assert.ok(!feedbackText.result.value.includes('compile is not defined'), 'Must NOT throw compile is not defined error');
      assert.ok(feedbackText.result.value.includes('أحسنت صنعاً') || feedbackText.result.value.includes('XP'), `Must show success feedback (got: "${feedbackText.result.value}")`);

      // Close modal
      await send('Runtime.evaluate', {
        expression: `
          const closeBtn = document.querySelector('.modal-close');
          if (closeBtn) closeBtn.click();
        `
      });
      await new Promise(r => setTimeout(r, 200));

      // 9. Test Language Toggle (AR -> EN -> AR)
      const initialDir = await send('Runtime.evaluate', {
        expression: `document.documentElement.getAttribute('dir')`
      });
      assert.strictEqual(initialDir.result.value, 'rtl', 'Initial direction should be rtl');

      await send('Runtime.evaluate', {
        expression: `
          const langBtn = document.querySelector('button[title*="Language"]');
          if (langBtn) langBtn.click();
        `
      });
      await new Promise(r => setTimeout(r, 200));

      const ltrDir = await send('Runtime.evaluate', {
        expression: `document.documentElement.getAttribute('dir')`
      });
      assert.strictEqual(ltrDir.result.value, 'ltr', 'Direction should become ltr after switching to EN');

      // 9. Test Theme Toggle (Dark -> Light)
      const initialTheme = await send('Runtime.evaluate', {
        expression: `document.documentElement.getAttribute('data-theme')`
      });
      assert.strictEqual(initialTheme.result.value, 'dark', 'Initial theme should be dark');

      await send('Runtime.evaluate', {
        expression: `
          const themeBtn = document.querySelector('button[title*="Theme"]');
          if (themeBtn) themeBtn.click();
        `
      });
      await new Promise(r => setTimeout(r, 200));

      const lightTheme = await send('Runtime.evaluate', {
        expression: `document.documentElement.getAttribute('data-theme')`
      });
      assert.strictEqual(lightTheme.result.value, 'light', 'Theme should toggle to light');
    });
  } finally {
    if (server && server.close) {
      await new Promise(r => server.close(r));
    }
  }
});
