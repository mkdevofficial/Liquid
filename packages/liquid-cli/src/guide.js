import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { printBanner } from './banner.js';
import { printServerUrls } from './network.js';
import { buildCommand } from './build.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

/**
 * Launch the official interactive Liquid documentation & error diagnosis server.
 * Default port: 4000.
 */
export async function guideCommand(options = {}) {
  printBanner('guide');

  const port = options.port || 4000;
  const host = options.host || '0.0.0.0';

  const cliDir = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = process.cwd();

  // Candidate locations for the guide static bundle
  const candidates = [
    path.resolve(cliDir, '../guide-dist'),
    path.resolve(cliDir, '../../../apps/learn-liquid/dist'),
    path.resolve(rootDir, 'apps/learn-liquid/dist'),
    path.resolve(rootDir, 'dist')
  ];

  let distDir = candidates.find(dir => fs.existsSync(path.join(dir, 'index.html')));

  // If not built yet, check if learn-liquid source exists in monorepo and auto-build it
  if (!distDir) {
    const srcCandidates = [
      path.resolve(cliDir, '../../../apps/learn-liquid'),
      path.resolve(rootDir, 'apps/learn-liquid')
    ];
    const appDir = srcCandidates.find(dir => fs.existsSync(path.join(dir, 'src/main.js')));
    if (appDir) {
      console.log('  \x1b[90mBuilding official documentation bundle...\x1b[0m');
      const prevCwd = process.cwd();
      try {
        process.chdir(appDir);
        await buildCommand({ outDir: 'dist' });
        distDir = path.join(appDir, 'dist');
      } finally {
        process.chdir(prevCwd);
      }
    }
  }

  if (!distDir || !fs.existsSync(distDir)) {
    console.error('  \x1b[31mError: Liquid Guide documentation bundle not found.\x1b[0m');
    console.error('  Please ensure apps/learn-liquid is built or guide-dist is present.\n');
    process.exitCode = 1;
    return;
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${host}:${port}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // If launched with --play, redirect root navigation to the gamified arena
    if (options.play && (pathname === '/' || pathname === '')) {
      res.writeHead(302, { 'Location': '/#/play' });
      res.end();
      return;
    }

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(distDir, pathname);

    // Fallback to index.html for SPA client-side routing
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      printServerUrls({ port, host });
      if (options.play) {
        console.log(`  \x1b[36m➜\x1b[0m  \x1b[1;33m🎮 Play Arena:\x1b[0m  \x1b[36;1mhttp://localhost:${port}/#/play\x1b[0m`);
        console.log(`  \x1b[35m➜\x1b[0m  \x1b[1mErrors:\x1b[0m        \x1b[35mhttp://localhost:${port}/#/errors\x1b[0m`);
        console.log('  \x1b[32m✔ Gamified Microlearning arena launched! Earn XP and conquer Seasons.\x1b[0m\n');
      } else {
        console.log(`  \x1b[33m➜\x1b[0m  \x1b[1m🎮 Play Arena:\x1b[0m  \x1b[33mhttp://localhost:${port}/#/play\x1b[0m`);
        console.log(`  \x1b[35m➜\x1b[0m  \x1b[1mErrors:\x1b[0m        \x1b[35mhttp://localhost:${port}/#/errors\x1b[0m`);
        console.log('  \x1b[90mServing official guide & error catalog. Press Ctrl+C to stop.\x1b[0m\n');
      }
      resolve(server);
    });
  });
}
