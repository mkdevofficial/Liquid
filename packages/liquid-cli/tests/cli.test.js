import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createCommand } from '../src/create.js';
import { checkCommand } from '../src/check.js';
import { buildCommand } from '../src/build.js';
import { getNetworkUrls } from '../src/network.js';

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

test('CLI - getNetworkUrls generates local and LAN addresses', () => {
  const { localUrl, networkUrls } = getNetworkUrls(3000, '0.0.0.0');
  assert.strictEqual(localUrl, 'http://localhost:3000/');
  assert.ok(Array.isArray(networkUrls));
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
