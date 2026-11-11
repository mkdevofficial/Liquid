import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createCommand, TEMPLATES } from '../src/create.js';
import { checkCommand } from '../src/check.js';
import { buildCommand } from '../src/build.js';
import { guideCommand } from '../src/guide.js';
import { runCLI } from '../src/index.js';
import { examplesCommand, loadAllExamples } from '../src/examples.js';
import { getNetworkUrls, printServerUrls } from '../src/network.js';
import { shouldUseEmoji, formatBanner } from '../src/banner.js';

const TMP_DIR = path.resolve('tmp-test-cli');

test.before(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

test.after(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

test('CLI - getNetworkUrls generates local and LAN addresses with full http:// prefix (Bug 3)', () => {
  const { localUrl, networkUrls } = getNetworkUrls(3000, '0.0.0.0');
  assert.ok(localUrl.startsWith('http://'), `localUrl must start with http://, got: ${localUrl}`);
  assert.strictEqual(localUrl, 'http://localhost:3000/');
  assert.ok(Array.isArray(networkUrls));

  for (const netUrl of networkUrls) {
    assert.ok(netUrl.startsWith('http://'), `networkUrl must start with http://, got: ${netUrl}`);
  }

  // Test console.log output from printServerUrls does not drop 'h'
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    printServerUrls({ port: 3000, host: '0.0.0.0' });
    const fullLog = logs.join('\n');
    assert.ok(fullLog.includes('http://localhost:3000/'));
    // Ensure every protocol occurrence is http:// and none is ttp:// without leading h
    const matches = fullLog.match(/.?ttp:\/\//g) || [];
    assert.ok(matches.length > 0, 'Must have at least one URL');
    for (const m of matches) {
      assert.strictEqual(m, 'http://', `Found protocol missing leading 'h': ${m}`);
    }
  } finally {
    console.log = origLog;
  }
});

test('CLI - banner emoji integrity and graceful fallback (Bug 4)', () => {
  const prevEmoji = process.env.LIQUID_EMOJI;
  const prevNoEmoji = process.env.LIQUID_NO_EMOJI;
  const prevTerm = process.env.TERM;

  try {
    // 1. Force emoji ON via LIQUID_EMOJI=1
    process.env.LIQUID_EMOJI = '1';
    delete process.env.LIQUID_NO_EMOJI;
    assert.strictEqual(shouldUseEmoji(), true);
    const bannerEmoji = formatBanner('dev');
    assert.ok(bannerEmoji.includes('🫟'), 'Banner must include 🫟 when emoji enabled');
    assert.ok(bannerEmoji.includes('Liquid dev'));

    // 2. Force emoji OFF via LIQUID_EMOJI=0
    process.env.LIQUID_EMOJI = '0';
    assert.strictEqual(shouldUseEmoji(), false);
    const bannerPlain = formatBanner('dev');
    assert.ok(!bannerPlain.includes('🫟'), 'Banner must not include 🫟 when emoji disabled');
    assert.ok(bannerPlain.includes('Liquid dev'), 'Banner must print plain word Liquid');

    // 3. Force emoji OFF via LIQUID_NO_EMOJI=1
    delete process.env.LIQUID_EMOJI;
    process.env.LIQUID_NO_EMOJI = '1';
    assert.strictEqual(shouldUseEmoji(), false);

    // 4. Fallback on dumb terminal
    delete process.env.LIQUID_NO_EMOJI;
    process.env.TERM = 'dumb';
    assert.strictEqual(shouldUseEmoji(), false);
  } finally {
    if (prevEmoji !== undefined) process.env.LIQUID_EMOJI = prevEmoji; else delete process.env.LIQUID_EMOJI;
    if (prevNoEmoji !== undefined) process.env.LIQUID_NO_EMOJI = prevNoEmoji; else delete process.env.LIQUID_NO_EMOJI;
    if (prevTerm !== undefined) process.env.TERM = prevTerm; else delete process.env.TERM;
  }
});

test('CLI - create scaffolds a standard project with proper layout', async () => {
  const projPath = path.join(TMP_DIR, 'test-app');
  await createCommand(projPath);

  assert.ok(fs.existsSync(path.join(projPath, 'package.json')));
  assert.ok(fs.existsSync(path.join(projPath, 'liquid.config.js')));
  assert.ok(fs.existsSync(path.join(projPath, 'index.html')));
  assert.ok(fs.existsSync(path.join(projPath, 'public/favicon.svg')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/main.js')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/App.liq')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/components/Header.liq')));
  assert.ok(fs.existsSync(path.join(projPath, 'README.md')));
});

test('CLI - create scaffolds a minimal project with --minimal flag', async () => {
  const projPath = path.join(TMP_DIR, 'min-app');
  await createCommand(projPath, { minimal: true });

  assert.ok(fs.existsSync(path.join(projPath, 'src/App.liq')));
  const content = fs.readFileSync(path.join(projPath, 'src/App.liq'), 'utf8');
  assert.ok(content.includes('Hello from {name()}'));
});

test('CLI - create handles nested path and derives valid npm package name', async () => {
  const nestedPath = path.join(TMP_DIR, 'nested/my-nested-app');
  await createCommand(nestedPath, { minimal: true });

  const pkgJson = JSON.parse(fs.readFileSync(path.join(nestedPath, 'package.json'), 'utf8'));
  assert.strictEqual(pkgJson.name, 'my-nested-app');
});

test('CLI - check validates valid .liq files', async () => {
  const projPath = path.join(TMP_DIR, 'test-app');
  const prevCwd = process.cwd();
  try {
    process.chdir(projPath);
    const res = await checkCommand({ silent: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.errors, 0);
  } finally {
    process.chdir(prevCwd);
  }
});

test('CLI - guide command serves official guide on default port', async () => {
  const testPort = 4005;
  const server = await guideCommand({ port: testPort, host: '127.0.0.1' });
  assert.ok(server, 'guideCommand must return active server instance');

  try {
    const res = await fetch(`http://127.0.0.1:${testPort}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('id="app"'));
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('CLI - guide command with --play flag redirects to /#/play gamified arena', async () => {
  const testPort = 4006;
  const server = await guideCommand({ port: testPort, host: '127.0.0.1', play: true });
  assert.ok(server, 'guideCommand must return active server instance');

  try {
    const res = await fetch(`http://127.0.0.1:${testPort}/`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/#/play');

    const appRes = await fetch(`http://127.0.0.1:${testPort}/index.html`);
    assert.strictEqual(appRes.status, 200);
    const html = await appRes.text();
    assert.ok(html.includes('id="app"'));
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('CLI - TEMPLATES catalog contains 8 curated templates', () => {
  assert.strictEqual(TEMPLATES.length, 8);
  const ids = TEMPLATES.map(t => t.id).sort();
  assert.deepStrictEqual(ids, [
    'arabic-app',
    'chat',
    'expense-tracker',
    'notes',
    'shop',
    'starter',
    'todo-pro',
    'weather'
  ]);
});

test('CLI - create supports --template <id> with variable interpolation', async () => {
  const projPath = path.join(TMP_DIR, 'my-shop-app');
  await createCommand(projPath, { template: 'shop' });

  assert.ok(fs.existsSync(path.join(projPath, 'package.json')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/App.liq')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/store.js')));
  assert.ok(fs.existsSync(path.join(projPath, 'src/tokens.js')));

  const pkgJson = JSON.parse(fs.readFileSync(path.join(projPath, 'package.json'), 'utf8'));
  assert.strictEqual(pkgJson.name, 'my-shop-app');

  const html = fs.readFileSync(path.join(projPath, 'index.html'), 'utf8');
  assert.ok(html.includes('My Shop App'));
});

test('CLI - loadAllExamples returns 20 focused examples', () => {
  const examples = loadAllExamples();
  assert.strictEqual(examples.length, 20);
  assert.strictEqual(examples[0].id, '01-hello-components');
  assert.strictEqual(examples[19].id, '20-error-handling-recovery');
});

test('CLI - examplesCommand can copy an example locally via --copy', async () => {
  const destDir = path.join(TMP_DIR, 'copied-ex01');
  await examplesCommand('01', { copy: destDir });

  assert.ok(fs.existsSync(path.join(destDir, 'liquid.example.json')));
  assert.ok(fs.existsSync(path.join(destDir, 'src/App.liq')));
  assert.ok(fs.existsSync(path.join(destDir, 'README.md')));
});

test('CLI - runCLI handles templates and examples list commands cleanly', async () => {
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await runCLI(['templates']);
    await runCLI(['examples']);
    const fullLog = logs.join('\n');
    assert.ok(fullLog.includes('Available Liquid Project Templates'));
    assert.ok(fullLog.includes('Available Liquid Examples'));
  } finally {
    console.log = origLog;
  }
});
