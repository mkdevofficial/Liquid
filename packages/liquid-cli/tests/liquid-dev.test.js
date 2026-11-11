import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { WebSocket } from 'ws';
import { devCommand, installLiquidDevApp } from '../src/dev.js';
import { renderQRAscii } from '../src/qr.js';

function fetchRaw(port, rawPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: rawPath,
      method: 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchUrl(url, headers = {}) {
  const parsed = new URL(url);
  return fetchRaw(parsed.port, parsed.pathname + parsed.search, headers);
}

test('Liquid Dev - QR code ASCII matrix generation', () => {
  const qr = renderQRAscii('liquid://dev?url=http%3A%2F%2F127.0.0.1%3A3000&token=testtoken');
  assert.ok(qr.length > 50, 'QR output should have substantial character length');
  assert.ok(qr.includes('█'), 'QR output should contain block character');
});

test('Liquid Dev - installLiquidDevApp copies APK to /sdcard', () => {
  installLiquidDevApp();
  if (fs.existsSync('/sdcard/Download')) {
    assert.ok(fs.existsSync('/sdcard/Download/liquid-dev.apk'), 'APK should be copied to /sdcard/Download/liquid-dev.apk');
    assert.ok(fs.statSync('/sdcard/Download/liquid-dev.apk').size > 500000, 'APK size should be > 500KB');
  }
});

test('Liquid Dev - Dev server endpoints, security, and WebSocket protocol', async () => {
  const exampleDir = path.resolve('examples/todo-counter-app');
  const prevCwd = process.cwd();
  let server = null;
  const testPort = 3991;
  const testToken = 'devtest123';

  try {
    process.chdir(exampleDir);
    server = await devCommand({ port: testPort, host: '127.0.0.1', token: testToken });
    const baseUrl = `http://127.0.0.1:${server.activePort}`;

    // 1. Health check: GET /status (unauthenticated)
    const statusRes = await fetchUrl(`${baseUrl}/status`);
    assert.strictEqual(statusRes.statusCode, 200);
    const statusJson = JSON.parse(statusRes.data);
    assert.strictEqual(statusJson.status, 'ok');
    assert.strictEqual(statusJson.server, 'liquid-dev');
    assert.ok(statusJson.buildId, 'Should have buildId');

    // 2. GET /manifest.json without token -> 401
    const unauthManifest = await fetchUrl(`${baseUrl}/manifest.json`);
    assert.strictEqual(unauthManifest.statusCode, 401);

    // 3. GET /manifest.json with invalid token -> 401
    const badTokenManifest = await fetchUrl(`${baseUrl}/manifest.json?token=wrongtoken`);
    assert.strictEqual(badTokenManifest.statusCode, 401);

    // 4. GET /manifest.json with valid query token -> 200
    const validManifest = await fetchUrl(`${baseUrl}/manifest.json?token=${testToken}`);
    assert.strictEqual(validManifest.statusCode, 200);
    const manifestJson = JSON.parse(validManifest.data);
    assert.strictEqual(manifestJson.runtimeVersion, '1.0');
    assert.strictEqual(manifestJson.entry, 'bundle.js');
    assert.ok(manifestJson.name);

    // 5. GET /manifest.json with Bearer token header -> 200
    const bearerManifest = await fetchUrl(`${baseUrl}/manifest.json`, {
      'Authorization': `Bearer ${testToken}`
    });
    assert.strictEqual(bearerManifest.statusCode, 200);

    // 6. GET /bundle.js without token -> 401
    const unauthBundle = await fetchUrl(`${baseUrl}/bundle.js`);
    assert.strictEqual(unauthBundle.statusCode, 401);

    // 7. GET /bundle.js with valid token -> 200
    const validBundle = await fetchUrl(`${baseUrl}/bundle.js?token=${testToken}`);
    assert.strictEqual(validBundle.statusCode, 200);
    assert.ok(validBundle.headers['content-type'].includes('application/javascript'));
    assert.ok(validBundle.data.length > 100);

    // 8. GET /bundle.js.map with valid token -> 200
    const validMap = await fetchUrl(`${baseUrl}/bundle.js.map?token=${testToken}`);
    assert.strictEqual(validMap.statusCode, 200);

    // 9. Path traversal protection on /assets/* -> 403 Forbidden
    const traversalRes = await fetchRaw(server.activePort, `/assets/../../package.json?token=${testToken}`);
    assert.strictEqual(traversalRes.statusCode, 403);

    // 10. WebSocket Handshake without token -> rejected
    const wsFailPromise = new Promise((resolve) => {
      const wsBad = new WebSocket(`ws://127.0.0.1:${server.activePort}/ws?token=badtoken`);
      wsBad.on('error', () => resolve('error'));
      wsBad.on('close', () => resolve('close'));
    });
    const wsFailResult = await wsFailPromise;
    assert.ok(wsFailResult === 'error' || wsFailResult === 'close');

    // 11. WebSocket protocol: hello -> hello-ack
    const wsSuccessPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${server.activePort}/ws?token=${testToken}`);
      let helloAckReceived = false;

      ws.on('open', () => {
        // Send hello
        ws.send(JSON.stringify({
          type: 'hello',
          protocolVersion: 1,
          device: {
            model: 'TestDevice',
            androidVersion: '14',
            runtimeVersion: '1.0'
          }
        }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'hello-ack') {
          assert.strictEqual(msg.protocolVersion, 1);
          assert.strictEqual(msg.status, 'ok');
          assert.strictEqual(msg.serverVersion, '1.0.0');
          helloAckReceived = true;

          // Send a log message
          ws.send(JSON.stringify({
            type: 'log',
            protocolVersion: 1,
            level: 'log',
            args: ['Test log message from test device']
          }));

          // Send request-reload
          ws.send(JSON.stringify({
            type: 'request-reload',
            protocolVersion: 1
          }));
        } else if (msg.type === 'reload') {
          assert.strictEqual(msg.protocolVersion, 1);
          assert.ok(msg.buildId);
          ws.close();
          resolve(true);
        }
      });

      ws.on('error', reject);
    });

    const wsDone = await wsSuccessPromise;
    assert.strictEqual(wsDone, true);

  } finally {
    if (server) server.close();
    process.chdir(prevCwd);
  }
});
