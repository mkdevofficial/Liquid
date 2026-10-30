import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { compile, LiquidSyntaxError } from 'liquid-compiler';
import { printBanner } from './banner.js';
import { printServerUrls } from './network.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.liq': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

/**
 * Start the Liquid development server with fast compilation, hot reload,
 * real-time request logging, and phone-friendly in-browser runtime error overlay.
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

function logRequest(req, res, pathname, startTime) {
  const duration = Math.max(1, Math.round(performance.now() - startTime));
  const status = res.statusCode;
  const statusColor = status >= 500 ? '\x1b[31m'
    : status >= 400 ? '\x1b[33m'
    : status >= 300 ? '\x1b[34m'
    : '\x1b[32m';
  const now = new Date().toLocaleTimeString();
  console.log(`  \x1b[90m${now}\x1b[0m \x1b[1m${req.method}\x1b[0m ${pathname} ${statusColor}${status}\x1b[0m \x1b[90m${duration}ms\x1b[0m`);
}

function handleRequest(req, res, { rootDir, sseClients }) {
  const startTime = performance.now();
  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Hook finish event for request logging
  res.on('finish', () => {
    if (pathname !== '/__liquid_hmr') {
      logRequest(req, res, pathname, startTime);
    }
  });

  // 1. SSE HMR endpoint
  if (pathname === '/__liquid_hmr') {
    logRequest(req, { statusCode: 200 }, pathname, startTime);
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

  // 2. Resolve bare imports: e.g. /@modules/liquid/src/index.js
  if (pathname.startsWith('/@modules/')) {
    const pkgRequest = pathname.slice('/@modules/'.length);
    handleModuleRequest(pkgRequest, res, rootDir);
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
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${pathname}`);
    return;
  }

  // If requesting a .liq file: compile on the fly!
  if (filePath.endsWith('.liq')) {
    serveCompiledLiq(filePath, rootDir, res);
    return;
  }

  // If requesting a .js / .mjs file: rewrite bare imports
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
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
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('index.html not found in project root.');
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // 1. Native Import Map to resolve bare specifiers in any modern browser
  const importMap = `
  <script type="importmap">
  {
    "imports": {
      "liquid": "/@modules/liquid/src/index.js",
      "liquid/": "/@modules/liquid/",
      "liquid-runtime": "/@modules/liquid-runtime/src/index.js",
      "liquid-runtime/": "/@modules/liquid-runtime/",
      "liquid-router": "/@modules/liquid-router/src/index.js",
      "liquid-router/": "/@modules/liquid-router/",
      "liquid-compiler": "/@modules/liquid-compiler/src/index.js",
      "liquid-compiler/": "/@modules/liquid-compiler/"
    }
  }
  </script>`;

  // 2. Dev server client: HMR, in-browser runtime error overlay, and mount timeout watchdog
  // Note: Plain <script> (not type="module") ensures listeners are active synchronously before any module loads!
  const devClientScript = `
  <script>
    // HMR EventSource connection
    const es = new EventSource('/__liquid_hmr');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'reload') {
        const overlay = document.getElementById('liquid-error-overlay');
        if (overlay) overlay.remove();
        window.location.reload();
      }
    };

    // Global sourcemap store for .liq files
    window.__liquid_sourcemaps = window.__liquid_sourcemaps || {};
    window.__liquid_sources = window.__liquid_sources || {};

    // VLQ SourceMap decoder to map generated JS stack frames back to .liq lines
    const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    function decodeVLQ(str) {
      const result = [];
      let shift = 0, value = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const index = BASE64_CHARS.indexOf(char);
        if (index === -1) continue;
        const hasContinuation = (index & 32) !== 0;
        const digit = index & 31;
        value += digit << shift;
        shift += 5;
        if (!hasContinuation) {
          const isNegative = (value & 1) === 1;
          result.push(isNegative ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      return result;
    }

    function parseSourceMap(map) {
      if (!map || !map.mappings) return [];
      const lines = map.mappings.split(';');
      let prevGenCol = 0, prevOrigLine = 0, prevOrigCol = 0, prevSource = 0;
      const decoded = [];

      for (let genLineIdx = 0; genLineIdx < lines.length; genLineIdx++) {
        const lineStr = lines[genLineIdx];
        if (!lineStr) continue;
        prevGenCol = 0;
        const segments = lineStr.split(',');
        for (const seg of segments) {
          if (!seg) continue;
          const vals = decodeVLQ(seg);
          prevGenCol += vals[0];
          if (vals.length > 1) {
            prevSource += (vals[1] || 0);
            prevOrigLine += (vals[2] || 0);
            prevOrigCol += (vals[3] || 0);
            decoded.push({
              genLine: genLineIdx + 1,
              genCol: prevGenCol,
              origLine: prevOrigLine + 1,
              origCol: prevOrigCol + 1
            });
          }
        }
      }
      return decoded;
    }

    function mapStackLocation(fileUrl, genLine, genCol) {
      for (const [filePath, map] of Object.entries(window.__liquid_sourcemaps)) {
        if (fileUrl.includes(filePath) || filePath.includes(fileUrl)) {
          const mappings = parseSourceMap(map);
          let best = null;
          for (const m of mappings) {
            if (m.genLine === genLine) {
              if (!best || Math.abs(m.genCol - genCol) < Math.abs(best.genCol - genCol)) {
                best = m;
              }
            }
          }
          if (best) {
            return {
              file: filePath,
              line: best.origLine,
              col: best.origCol,
              source: window.__liquid_sources[filePath] || ''
            };
          }
          return { file: filePath, line: genLine, col: genCol, source: window.__liquid_sources[filePath] || '' };
        }
      }
      return null;
    }

    function showRuntimeErrorOverlay(title, message, stack) {
      let existing = document.getElementById('liquid-error-overlay');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'liquid-error-overlay';
        existing.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.96);color:#f8fafc;z-index:9999999;padding:1.5rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;overflow:auto;-webkit-overflow-scrolling:touch;';
        document.body ? document.body.appendChild(existing) : document.documentElement.appendChild(existing);
      }

      // Try to extract .liq file location from stack
      let mappedInfo = null;
      const stackLines = (stack || '').split('\\n');
      for (const line of stackLines) {
        const match = line.match(/(https?:\\/\\/[^:\\s]+|\\/[^:\\s]+\\.liq):(\\d+):(\\d+)/);
        if (match) {
          const url = match[1];
          const gLine = parseInt(match[2], 10);
          const gCol = parseInt(match[3], 10);
          mappedInfo = mapStackLocation(url, gLine, gCol);
          if (mappedInfo) break;
        }
      }

      let locationText = '';
      let codeExcerpt = '';
      if (mappedInfo) {
        locationText = mappedInfo.file + ':' + mappedInfo.line + ':' + mappedInfo.col;
        if (mappedInfo.source) {
          const lines = mappedInfo.source.split('\\n');
          const target = mappedInfo.line - 1;
          const start = Math.max(0, target - 2);
          const end = Math.min(lines.length - 1, target + 2);
          const snippet = [];
          for (let i = start; i <= end; i++) {
            const prefix = i === target ? ' > ' : '   ';
            const num = String(i + 1).padStart(4, ' ');
            snippet.push(prefix + num + ' | ' + lines[i]);
          }
          codeExcerpt = snippet.join('\\n');
        }
      }

      const safeTitle = String(title).replace(/</g, '&lt;');
      const safeMsg = String(message).replace(/</g, '&lt;');
      const safeLoc = locationText ? String(locationText).replace(/</g, '&lt;') : '';
      const safeExcerpt = codeExcerpt ? String(codeExcerpt).replace(/</g, '&lt;') : '';
      const safeStack = String(stack || '').replace(/</g, '&lt;');

      existing.innerHTML = \`
        <div style="max-width:850px;margin:0 auto;background:#1e293b;border:2px solid #ef4444;border-radius:12px;padding:1.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;border-bottom:1px solid #334155;padding-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span style="font-size:1.5rem;">🫟</span>
              <h2 style="color:#ef4444;margin:0;font-size:1.2rem;font-weight:700;">\${safeTitle}</h2>
            </div>
            <button onclick="document.getElementById('liquid-error-overlay').remove()" style="background:#334155;color:#e2e8f0;border:none;padding:0.35rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.875rem;">Close</button>
          </div>
          \${safeLoc ? '<p style="color:#94a3b8;font-size:0.95rem;margin:0.5rem 0;"><strong>Source:</strong> <span style="color:#38bdf8;">' + safeLoc + '</span></p>' : ''}
          <div style="background:#0f172a;border-left:4px solid #ef4444;padding:0.75rem 1rem;border-radius:4px;margin:1rem 0;color:#fca5a5;font-weight:600;font-size:1rem;word-break:break-word;">
            \${safeMsg}
          </div>
          \${safeExcerpt ? '<div style="margin:1rem 0;"><div style="color:#94a3b8;font-size:0.85rem;margin-bottom:0.25rem;">.liq Source Context:</div><pre style="background:#0f172a;padding:1rem;border-radius:8px;overflow-x:auto;color:#e2e8f0;line-height:1.5;font-size:0.875rem;border:1px solid #334155;">' + safeExcerpt + '</pre></div>' : ''}
          <div style="margin-top:1rem;">
            <div style="color:#94a3b8;font-size:0.85rem;margin-bottom:0.25rem;">Stack Trace:</div>
            <pre style="background:#0f172a;padding:1rem;border-radius:8px;overflow-x:auto;color:#cbd5e1;line-height:1.5;font-size:0.8rem;border:1px solid #334155;max-height:220px;">\${safeStack}</pre>
          </div>
        </div>
      \`;
    }

    // Capture uncaught exceptions and script errors
    window.addEventListener('error', (event) => {
      const err = event.error;
      const target = event.target;
      if (target && target.tagName === 'SCRIPT') {
        showRuntimeErrorOverlay(
          'Liquid Module Load Error',
          'Failed to load module script: ' + (target.src || event.message),
          'Check that the file exists and that all module specifiers resolve successfully.'
        );
        return;
      }
      showRuntimeErrorOverlay(
        'Liquid Runtime Error',
        err ? (err.message || String(err)) : event.message,
        err ? (err.stack || '') : ''
      );
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      showRuntimeErrorOverlay(
        'Liquid Unhandled Promise Rejection',
        reason ? (reason.message || String(reason)) : 'Unhandled Promise Rejection',
        reason ? (reason.stack || '') : ''
      );
    });

    // Watchdog: If page mounts nothing within 2 seconds, show diagnostic
    setTimeout(() => {
      const app = document.getElementById('app');
      const overlay = document.getElementById('liquid-error-overlay');
      if (!overlay && app && app.childNodes.length === 0) {
        const diag = document.createElement('div');
        diag.id = 'liquid-mount-watchdog';
        diag.style.cssText = 'position:fixed;bottom:1.5rem;left:1.5rem;right:1.5rem;max-width:650px;margin:0 auto;background:#1e293b;border:2px solid #f59e0b;color:#f8fafc;padding:1.25rem;border-radius:10px;font-family:system-ui,sans-serif;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);z-index:99999;';
        diag.innerHTML = \`
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <span style="font-size:1.5rem;">🫟</span>
            <strong style="color:#fbbf24;font-size:1.1rem;">Liquid Diagnostic: #app has not mounted content</strong>
          </div>
          <p style="color:#cbd5e1;font-size:0.9rem;margin:0.25rem 0 0.75rem 0;line-height:1.4;">
            The entry target <code style="background:#0f172a;padding:0.15rem 0.4rem;border-radius:4px;color:#38bdf8;">&lt;div id="app"&gt;</code> is still empty after 2 seconds.
          </p>
          <ul style="color:#94a3b8;font-size:0.85rem;margin:0;padding-left:1.25rem;line-height:1.4;">
            <li>Ensure <code style="color:#e2e8f0;">src/main.js</code> calls <code style="color:#e2e8f0;">mount(App, document.getElementById('app'))</code>.</li>
            <li>Check terminal request logs to verify that all module imports returned HTTP 200.</li>
          </ul>
        \`;
        document.body ? document.body.appendChild(diag) : document.documentElement.appendChild(diag);

        // Auto-remove diagnostic if content gets mounted later
        const observer = new MutationObserver(() => {
          if (app.childNodes.length > 0) {
            diag.remove();
            observer.disconnect();
          }
        });
        observer.observe(app, { childList: true });
      }
    }, 2000);
  </script>
  `;

  // Inject import map first, then dev client script before </head>
  html = html.replace('</head>', `${importMap}\n${devClientScript}\n</head>`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveCompiledLiq(filePath, rootDir, res) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const source = fs.readFileSync(filePath, 'utf8');

  try {
    const compiled = compile(source, {
      file: relPath,
      runtimeModule: '/@modules/liquid/src/index.js'
    });

    let js = compiled.code;

    // Rewrite any bare imports in the component's logic section
    js = rewriteBareImports(js);

    // Register sourcemap and source on window for client-side stack mapping
    const sourcemapSnippet = `
if (typeof window !== 'undefined') {
  window.__liquid_sourcemaps = window.__liquid_sourcemaps || {};
  window.__liquid_sourcemaps[${JSON.stringify(relPath)}] = ${JSON.stringify(compiled.map)};
  window.__liquid_sources = window.__liquid_sources || {};
  window.__liquid_sources[${JSON.stringify(relPath)}] = ${JSON.stringify(source)};
}
`;
    js = sourcemapSnippet + '\n' + js;

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

    // Append inline source map
    if (compiled.map) {
      const mapBase64 = Buffer.from(JSON.stringify(compiled.map)).toString('base64');
      js += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}\n`;
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

  // Monorepo support: check sibling packages relative to liquid-cli
  const cliDir = path.dirname(new URL(import.meta.url).pathname);
  const siblingPkg = path.resolve(cliDir, '../../', pkgName);
  if (fs.existsSync(siblingPkg)) return siblingPkg;

  // Fallback relative to cli node_modules
  const fallback = path.resolve(cliDir, '../../..', 'node_modules', pkgName);
  if (fs.existsSync(fallback)) return fallback;

  return null;
}

function handleModuleRequest(pkgRequest, res, rootDir) {
  try {
    let basePkg = pkgRequest;
    let subPath = '';

    if (pkgRequest.includes('/')) {
      const parts = pkgRequest.split('/');
      basePkg = parts[0];
      subPath = parts.slice(1).join('/');
    }

    const pkgDir = resolvePackageDir(basePkg, rootDir);
    if (pkgDir) {
      let resolvedPath = null;
      let fileRelToPkg = '';

      if (!subPath || subPath === '') {
        // Find package entry
        const entryCandidates = ['src/index.js', 'index.js'];
        for (const cand of entryCandidates) {
          const p = path.join(pkgDir, cand);
          if (fs.existsSync(p)) {
            resolvedPath = p;
            fileRelToPkg = cand;
            break;
          }
        }
      } else {
        const direct = path.join(pkgDir, subPath);
        const withSrc = path.join(pkgDir, 'src', subPath);
        const withExt = path.join(pkgDir, `${subPath}.js`);
        const withSrcExt = path.join(pkgDir, 'src', `${subPath}.js`);

        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
          resolvedPath = direct;
          fileRelToPkg = subPath;
        } else if (fs.existsSync(withSrc) && fs.statSync(withSrc).isFile()) {
          resolvedPath = withSrc;
          fileRelToPkg = `src/${subPath}`;
        } else if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
          resolvedPath = withExt;
          fileRelToPkg = `${subPath}.js`;
        } else if (fs.existsSync(withSrcExt) && fs.statSync(withSrcExt).isFile()) {
          resolvedPath = withSrcExt;
          fileRelToPkg = `src/${subPath}.js`;
        }
      }

      if (resolvedPath && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        let code = fs.readFileSync(resolvedPath, 'utf8');

        // 1. Rewrite bare imports to /@modules/<pkg>/...
        code = rewriteBareImports(code);

        // 2. Rewrite relative imports within the module to absolute /@modules/<basePkg>/<resolved>
        const fileDir = path.dirname(fileRelToPkg).replace(/\\/g, '/');
        code = code.replace(
          /(from|import)\s+['"](\.[^'"]+)['"]/g,
          (match, keyword, rel) => {
            const relClean = rel.endsWith('.js') ? rel : `${rel}.js`;
            const resolvedRel = path.posix.normalize(path.posix.join(fileDir, relClean));
            return `${keyword} '/@modules/${basePkg}/${resolvedRel}'`;
          }
        );

        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(code);
        return;
      }
    }
  } catch (e) {}

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`Cannot resolve module ${pkgRequest}`);
}

export function rewriteBareImports(code) {
  if (typeof code !== 'string') return code;

  // Rewrite from 'liquid', from 'liquid-runtime', etc.
  return code.replace(
    /(from|import)\s+['"](liquid|liquid-runtime|liquid-router|liquid-compiler)(?:\/([^'"]+))?['"]/g,
    (match, keyword, pkg, sub) => {
      let target;
      if (pkg === 'liquid') {
        if (!sub) {
          target = 'liquid/src/index.js';
        } else if (sub === 'runtime') {
          target = 'liquid-runtime/src/index.js';
        } else if (sub === 'router') {
          target = 'liquid-router/src/index.js';
        } else if (sub === 'compiler') {
          target = 'liquid-compiler/src/index.js';
        } else {
          target = `liquid/${sub}`;
        }
      } else {
        if (!sub) {
          target = `${pkg}/src/index.js`;
        } else {
          target = `${pkg}/${sub}`;
        }
      }
      return `${keyword} '/@modules/${target}'`;
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
