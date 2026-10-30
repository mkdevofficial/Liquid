import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { printBanner } from './banner.js';
import { printServerUrls } from './network.js';

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
 * Preview the production build locally.
 */
export async function previewCommand(options = {}) {
  printBanner('preview');

  const rootDir = process.cwd();
  const distDir = path.resolve(rootDir, options.outDir || 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('  \x1b[31mError: Production directory "dist" not found.\x1b[0m');
    console.error('  Run "liquid build" first before previewing.\n');
    process.exitCode = 1;
    return;
  }

  const port = options.port || 4173;
  const host = options.host || '0.0.0.0';

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(distDir, pathname);

    // If file doesn't exist, try index.html for SPA client-side routing!
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
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, host, () => {
    printServerUrls({ port, host });
    console.log('  \x1b[90mServing production build. Press Ctrl+C to stop.\x1b[0m\n');
  });

  return server;
}
