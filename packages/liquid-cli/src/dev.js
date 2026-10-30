import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { compile, LiquidSyntaxError } from 'liquid-compiler';
import { printBanner } from './banner.js';
import { printServerUrls } from './network.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.liq': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

/**
 * Start the Liquid development server with fast compilation and hot reload.
 */
export async function devCommand(options = {}) {
  printBanner('dev');

  const rootDir = process.cwd();

  // Load config if available
  let config = {};
  const configPath = path.join(rootDir, 'liquid.config.js');
  if (fs.existsSync(configPath)) {
    try {
      const mod = await import(`file://${configPath}`);
      config = mod.default || {};
    } catch (e) {
      console.warn('  \x1b[33mWarning:\x1b[0m Could not load liquid.config.js:', e.message);
    }
  }

  const port = options.port || config.port || 3000;
  const host = options.host || config.host || '0.0.0.0';

  const sseClients = new Set();

  // Watch files for changes
  const watcher = setupWatcher(rootDir, () => {
    for (const client of sseClients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'reload', timestamp: Date.now() })}\n\n`);
      } catch (e) {
        sseClients.delete(client);
      }
    }
  });

  const server = http.createServer((req, res) => {
    handleRequest(req, res, { rootDir, sseClients });
  });

  server.on('close', () => {
    if (watcher && typeof watcher.close === 'function') {
      try { watcher.close(); } catch (e) {}
    }
    for (const client of sseClients) {
      try { client.end(); } catch (e) {}
    }
    sseClients.clear();
  });

  server.listen(port, host, () => {
    printServerUrls({ port, host });
    console.log('  \x1b[90mPress Ctrl+C to stop the server\x1b[0m\n');
  });

  return server;
}

function handleRequest(req, res, { rootDir, sseClients }) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. SSE HMR endpoint
  if (pathname === '/__liquid_hmr') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. Resolve bare imports: e.g. /@modules/liquid or rewrite imports
  if (pathname.startsWith('/@modules/')) {
    const pkgName = pathname.slice('/@modules/'.length);
    handleModuleRequest(pkgName, res, rootDir);
    return;
  }

  // 3. Root URL -> index.html
  if (pathname === '/' || pathname === '/index.html') {
    serveIndexHtml(rootDir, res);
    return;
  }

  // 4. File in rootDir, public/, or node_modules/
  let filePath = path.join(rootDir, pathname);

  if (!fs.existsSync(filePath)) {
    // Check public/
    const publicPath = path.join(rootDir, 'public', pathname);
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    }
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${pathname}`);
    return;
  }

  // If requesting a .liq file: compile on the fly!
  if (filePath.endsWith('.liq')) {
    serveCompiledLiq(filePath, rootDir, res);
    return;
  }

  // If requesting a .js file: rewrite bare imports (e.g. from 'liquid')
  if (filePath.endsWith('.js')) {
    serveJavaScript(filePath, res);
    return;
  }

  // Static assets
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function serveIndexHtml(rootDir, res) {
  const htmlPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('index.html not found in project root.');
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Inject HMR client
  const hmrScript = `
  <script type="module">
    const es = new EventSource('/__liquid_hmr');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'reload') {
        const overlay = document.getElementById('liquid-error-overlay');
        if (overlay) overlay.remove();
        window.location.reload();
      }
    };
  </script>
  `;

  html = html.replace('</head>', `${hmrScript}\n</head>`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveCompiledLiq(filePath, rootDir, res) {
  const relPath = path.relative(rootDir, filePath);
  const source = fs.readFileSync(filePath, 'utf8');

  try {
    const compiled = compile(source, {
      file: relPath,
      runtimeModule: '/@modules/liquid'
    });

    let js = compiled.code;

    // Rewrite bare imports
    js = rewriteBareImports(js);

    // Inject scoped CSS into document head
    if (compiled.css) {
      const cssInjection = `
if (typeof document !== 'undefined') {
  const _styleId = "liq-style-${compiled.ast.scopeId || 'default'}";
  let _styleEl = document.getElementById(_styleId);
  if (!_styleEl) {
    _styleEl = document.createElement("style");
    _styleEl.id = _styleId;
    document.head.appendChild(_styleEl);
  }
  _styleEl.textContent = ${JSON.stringify(compiled.css)};
}
`;
      js = cssInjection + '\n' + js;
    }

    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(js);
  } catch (err) {
    // Print in terminal
    console.error('\n' + (err.message || String(err)));

    // Return browser error overlay
    const overlayHtml = renderErrorOverlayHtml(err, relPath);
    const overlayJs = `
const _existing = document.getElementById('liquid-error-overlay');
if (_existing) _existing.remove();
const _overlay = document.createElement('div');
_overlay.id = 'liquid-error-overlay';
_overlay.innerHTML = ${JSON.stringify(overlayHtml)};
document.body.appendChild(_overlay);
export default function() { return null; }
`;
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(overlayJs);
  }
}

function serveJavaScript(filePath, res) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = rewriteBareImports(content);
  res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
  res.end(content);
}

function resolvePackageDir(pkgName, rootDir) {
  let cur = rootDir;
  while (cur) {
    const candidate = path.join(cur, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const fallback = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..', 'node_modules', pkgName);
  if (fs.existsSync(fallback)) return fallback;
  return null;
}

function handleModuleRequest(pkgName, res, rootDir) {
  try {
    let basePkg = pkgName;
    let subPath = 'src/index.js';

    if (pkgName.includes('/')) {
      const parts = pkgName.split('/');
      basePkg = parts[0];
      subPath = parts.slice(1).join('/');
    }

    const pkgDir = resolvePackageDir(basePkg, rootDir);
    if (pkgDir) {
      let resolvedPath = path.join(pkgDir, subPath);
      if (!fs.existsSync(resolvedPath) && fs.existsSync(path.join(pkgDir, 'src/index.js'))) {
        resolvedPath = path.join(pkgDir, 'src/index.js');
      }

      if (fs.existsSync(resolvedPath)) {
        let code = fs.readFileSync(resolvedPath, 'utf8');
        code = rewriteBareImports(code);
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(code);
        return;
      }
    }
  } catch (e) {}

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(`Cannot resolve module ${pkgName}`);
}

function rewriteBareImports(code) {
  return code.replace(
    /from\s+['"](liquid|liquid-runtime|liquid-router|liquid-compiler)(?:\/([^'"]+))?['"]/g,
    (match, pkg, sub) => {
      const target = sub ? `${pkg}/${sub}` : pkg;
      return `from '/@modules/${target}'`;
    }
  );
}

function renderErrorOverlayHtml(err, file) {
  const rawMsg = err.rawMessage || err.message || 'Syntax Error';
  const line = err.line || 1;
  const col = err.column || 1;
  const excerpt = err.source ? escapeHtml(err.message) : '';

  return `
  <div style="position:fixed;inset:0;background:rgba(15,23,42,0.95);color:#f8fafc;z-index:999999;padding:2rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;overflow:auto;">
    <div style="max-width:800px;margin:0 auto;background:#1e293b;border:1px solid #ef4444;border-radius:10px;padding:1.5rem;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.5);">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
        <span style="font-size:1.5rem;">🫟</span>
        <h2 style="color:#ef4444;margin:0;font-size:1.25rem;">Liquid Compilation Error</h2>
      </div>
      <p style="color:#cbd5e1;margin-bottom:0.5rem;"><strong>File:</strong> ${escapeHtml(file)}:${line}:${col}</p>
      <p style="color:#f87171;font-weight:bold;margin-bottom:1rem;">${escapeHtml(rawMsg)}</p>
      <pre style="background:#0f172a;padding:1rem;border-radius:6px;overflow-x:auto;color:#e2e8f0;line-height:1.5;">${excerpt}</pre>
    </div>
  </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setupWatcher(rootDir, onChange) {
  let debounceTimer = null;
  const trigger = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onChange, 80);
  };

  try {
    return fs.watch(rootDir, { recursive: true }, (event, filename) => {
      if (!filename) return;
      if (filename.includes('node_modules') || filename.includes('.git') || filename.includes('dist')) {
        return;
      }
      trigger();
    });
  } catch (err) {
    // Fallback if recursive watch not supported
    const srcDir = path.join(rootDir, 'src');
    if (fs.existsSync(srcDir)) {
      return fs.watch(srcDir, { recursive: true }, trigger);
    }
  }
}
