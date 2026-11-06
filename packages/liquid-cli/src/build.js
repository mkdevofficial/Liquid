import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { compile } from '@mkdevofficial/liquid-compiler';
import { printBanner } from './banner.js';

/**
 * Production build: pure JS packaging, minification, asset hashing, scoped CSS extraction.
 */
export async function buildCommand(options = {}) {
  printBanner('build');
  const startTime = Date.now();
  const rootDir = process.cwd();
  const outDir = path.resolve(rootDir, options.outDir || 'dist');

  // Clean outDir
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  console.log('  Building production bundle...\n');

  // 1. Gather all .liq files and compile them
  const allCss = [];
  const compiledModules = new Map(); // relPath -> compiledJs

  const liqFiles = findFiles(rootDir, '.liq').sort();
  for (const f of liqFiles) {
    const rel = path.relative(rootDir, f).replace(/\\/g, '/');
    const src = fs.readFileSync(f, 'utf8');
    const res = compile(src, { file: rel, runtimeModule: 'liquid' });
    if (res.css) {
      allCss.push(res.css);
    }
    compiledModules.set(normalizePath(rel), res.code);
  }

  // Also read any CSS files from src/
  const cssFiles = findFiles(rootDir, '.css').sort();
  for (const f of cssFiles) {
    const rel = path.relative(rootDir, f).replace(/\\/g, '/');
    if (!rel.startsWith('node_modules') && !rel.startsWith('dist')) {
      allCss.push(fs.readFileSync(f, 'utf8'));
    }
  }

  // 2. Extract and hash Scoped CSS
  const combinedCss = allCss.join('\n');
  const minifiedCss = minifyCSS(combinedCss);
  const cssHash = crypto.createHash('sha256').update(minifiedCss).digest('hex').slice(0, 8);
  const cssFilename = `style.${cssHash}.css`;
  const cssPath = path.join(outDir, 'assets', cssFilename);
  fs.writeFileSync(cssPath, minifiedCss);

  // 3. Bundle Runtime and App code
  // Read runtime code
  const runtimePath = path.resolve(rootDir, 'node_modules/liquid/src/index.js');
  let runtimeCode = '';
  if (fs.existsSync(runtimePath)) {
    runtimeCode = fs.readFileSync(runtimePath, 'utf8');
  }

  // Read main.js entry
  const entryPath = path.join(rootDir, 'src/main.js');
  if (!fs.existsSync(entryPath)) {
    throw new Error('Entry point src/main.js not found');
  }

  // Pack modules into a self-contained production bundle
  const bundleJs = buildProductionBundle({
    entryPath,
    compiledModules,
    rootDir
  });

  const minifiedJs = minifyJS(bundleJs);
  const jsHash = crypto.createHash('sha256').update(minifiedJs).digest('hex').slice(0, 8);
  const jsFilename = `main.${jsHash}.js`;
  const jsPath = path.join(outDir, 'assets', jsFilename);
  fs.writeFileSync(jsPath, minifiedJs);

  // 4. Copy public/ folder if exists
  const publicDir = path.join(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, outDir);
  }

  // 5. Generate production index.html
  const htmlTemplatePath = path.join(rootDir, 'index.html');
  let html = fs.existsSync(htmlTemplatePath)
    ? fs.readFileSync(htmlTemplatePath, 'utf8')
    : '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liquid App</title></head><body><div id="app"></div></body></html>';

  // Remove existing dev scripts/links
  html = html.replace(/<script\s+type="module"[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\s+rel="stylesheet"[^>]*>/gi, '');

  // Inject hashed CSS in <head>
  const cssTag = `<link rel="stylesheet" href="/assets/${cssFilename}">`;
  if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${cssTag}\n</head>`);
  } else {
    html = cssTag + html;
  }

  // Inject hashed JS before </body>
  const jsTag = `<script type="module" src="/assets/${jsFilename}"></script>`;
  if (html.includes('</body>')) {
    html = html.replace('</body>', `  ${jsTag}\n</body>`);
  } else {
    html += jsTag;
  }

  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  const duration = Date.now() - startTime;
  console.log(`  \x1b[32m✔ Built in ${duration}ms\x1b[0m\n`);

  // Report sizes
  reportAsset(path.join(outDir, 'index.html'), outDir);
  reportAsset(cssPath, outDir);
  reportAsset(jsPath, outDir);
  console.log('');

  return {
    outDir,
    cssFile: cssFilename,
    jsFile: jsFilename
  };
}

function resolvePackageDir(pkgName, rootDir) {
  const unscope = pkgName.replace(/^@[^/]+\//, '');
  // Check rootDir and parent directories for node_modules/pkgName
  let cur = rootDir;
  while (cur) {
    let candidate = path.join(cur, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) return candidate;
    candidate = path.join(cur, 'node_modules', unscope);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // Sibling in monorepo
  const cliDir = path.dirname(new URL(import.meta.url).pathname);
  const sibling = path.resolve(cliDir, '../../', unscope);
  if (fs.existsSync(sibling)) return sibling;

  // Fallback relative to liquid-cli package
  const fallback = path.resolve(cliDir, '../../..', 'node_modules', pkgName);
  if (fs.existsSync(fallback)) return fallback;
  const fallbackUnscope = path.resolve(cliDir, '../../..', 'node_modules', unscope);
  if (fs.existsSync(fallbackUnscope)) return fallbackUnscope;
  return null;
}

function buildProductionBundle({ entryPath, compiledModules, rootDir }) {
  const runtimeDir = resolvePackageDir('@mkdevofficial/liquid-runtime', rootDir) || resolvePackageDir('liquid-runtime', rootDir);
  const routerDir = resolvePackageDir('@mkdevofficial/liquid-router', rootDir) || resolvePackageDir('liquid-router', rootDir);

  const signalsCode = fs.readFileSync(path.join(runtimeDir, 'src/signals.js'), 'utf8');
  const domCode = fs.readFileSync(path.join(runtimeDir, 'src/dom.js'), 'utf8');
  const builtinsCode = fs.readFileSync(path.join(runtimeDir, 'src/builtins.js'), 'utf8');
  const routerCode = routerDir && fs.existsSync(path.join(routerDir, 'src/index.js'))
    ? fs.readFileSync(path.join(routerDir, 'src/index.js'), 'utf8')
    : '';

  // Strip exports from runtime and place in bundle
  let combinedRuntime = [
    signalsCode.replace(/export\s+/g, ''),
    domCode.replace(/import\s+[^;]+;/g, '').replace(/export\s+/g, ''),
    builtinsCode.replace(/import\s+[^;]+;/g, '').replace(/export\s+/g, ''),
    routerCode.replace(/import\s+[^;]+;/g, '').replace(/export\s+/g, '')
  ].join('\n');

  // Component definitions
  const componentBlocks = [];
  for (const [relPath, code] of compiledModules.entries()) {
    const compName = getComponentNameFromFile(relPath);
    // Replace imports and exports in component code
    let cleaned = code
      .replace(/import\s+[^;]+;/g, '')
      .replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/, `function ${compName}`)
      .replace(/export\s+default\s+function/, `function ${compName}`);
    componentBlocks.push(cleaned);
  }

  // Gather other .js modules in src/ (e.g. store.js)
  const helperBlocks = [];
  const srcJsFiles = findFiles(path.join(rootDir, 'src'), '.js');
  for (const f of srcJsFiles) {
    const rel = path.relative(rootDir, f);
    if (normalizePath(rel) !== 'src/main.js') {
      const helperCode = fs.readFileSync(f, 'utf8')
        .replace(/import\s+[^;]+;/g, '')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s+let\s+/g, 'let ')
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+default\s+/g, '');
      helperBlocks.push(helperCode);
    }
  }

  // Read entry code
  let entryCode = fs.readFileSync(entryPath, 'utf8')
    .replace(/import\s+[^;]+;/g, '');

  return `
// Liquid Production Runtime
${combinedRuntime}

// Application Helpers & Stores
${helperBlocks.join('\n\n')}

// Compiled Components
${componentBlocks.join('\n\n')}

// Application Entry
${entryCode}
`;
}

function getComponentNameFromFile(filePath) {
  const base = path.basename(filePath, '.liq');
  return base.replace(/[^a-zA-Z0-9_$]/g, '_') || 'Component';
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function findFiles(dir, ext, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, ext, list);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      list.push(full);
    }
  }
  return list;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([\{\}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJS(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function reportAsset(filePath, outDir) {
  const rel = path.relative(outDir, filePath);
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  const gz = zlib.gzipSync(content);

  const sizeKb = (stat.size / 1024).toFixed(2);
  const gzKb = (gz.length / 1024).toFixed(2);

  const padName = rel.padEnd(30, ' ');
  console.log(`  \x1b[90mdist/\x1b[0m\x1b[1m${padName}\x1b[0m ${sizeKb.padStart(6, ' ')} kB \x1b[90m(gzip: ${gzKb} kB)\x1b[0m`);
}
