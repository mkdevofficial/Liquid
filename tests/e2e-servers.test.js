import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import http from 'node:http';
import { devCommand } from '../packages/liquid-cli/src/dev.js';
import { previewCommand } from '../packages/liquid-cli/src/preview.js';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

test('E2E - Dev server serves index.html and compiles .liq on the fly', async () => {
  const exampleDir = path.resolve('examples/todo-counter-app');
  const prevCwd = process.cwd();
  let server;

  try {
    process.chdir(exampleDir);
    server = await devCommand({ port: 3456, host: '127.0.0.1' });

    // 1. Fetch index.html
    const indexRes = await fetchUrl('http://127.0.0.1:3456/');
    assert.strictEqual(indexRes.statusCode, 200);
    assert.ok(indexRes.data.includes('__liquid_hmr'));
    assert.ok(indexRes.data.includes('/src/main.js'));

    // 2. Fetch compiled .liq component
    const liqRes = await fetchUrl('http://127.0.0.1:3456/src/App.liq');
    assert.strictEqual(liqRes.statusCode, 200);
    assert.ok(liqRes.headers['content-type'].includes('application/javascript'));
    assert.ok(liqRes.data.includes('export default function App'));
    assert.ok(liqRes.data.includes('liq-style-'));

    // 3. Fetch module liquid
    const modRes = await fetchUrl('http://127.0.0.1:3456/@modules/liquid');
    assert.strictEqual(modRes.statusCode, 200);
    assert.ok(modRes.data.includes('liquid-runtime'));
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});

test('E2E - Preview server serves production build assets', async () => {
  const exampleDir = path.resolve('examples/todo-counter-app');
  const prevCwd = process.cwd();
  let server;

  try {
    process.chdir(exampleDir);
    server = await previewCommand({ port: 4567, host: '127.0.0.1' });

    const res = await fetchUrl('http://127.0.0.1:4567/');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.data.includes('/assets/main.'));
    assert.ok(res.data.includes('/assets/style.'));
  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});
