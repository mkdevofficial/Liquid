import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export function resolvePackageDir(pkgName, rootDir) {
  const unscope = pkgName.replace(/^@[^/]+\//, '');

  // 1. Monorepo development: check sibling packages relative to liquid-cli
  const monorepoSibling1 = path.resolve(__dirname, '../../..', unscope);
  if (fs.existsSync(path.join(monorepoSibling1, 'package.json'))) return monorepoSibling1;

  const monorepoSibling2 = path.resolve(__dirname, '../..', unscope);
  if (fs.existsSync(path.join(monorepoSibling2, 'package.json'))) return monorepoSibling2;

  // 2. Check local project's own node_modules (only in rootDir, avoid stale parent traversal)
  if (rootDir) {
    const localCandidates = [
      path.join(rootDir, 'node_modules', pkgName),
      path.join(rootDir, 'node_modules', `@mkdevofficial/${unscope}`),
      path.join(rootDir, 'node_modules', unscope)
    ];
    for (const cand of localCandidates) {
      if (fs.existsSync(path.join(cand, 'package.json'))) {
        if (!pkgName.includes('runtime') || fs.existsSync(path.join(cand, 'src/renderer.js'))) {
          return cand;
        }
      }
    }
  }

  // 3. Resolve from liquid-cli's own dependencies via Node resolver
  try {
    const entry = require.resolve(pkgName);
    let dir = path.dirname(entry);
    while (dir && dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
  } catch {}

  // 4. Check CLI's own node_modules directory
  const cliNodeModules = [
    path.resolve(__dirname, '../node_modules', pkgName),
    path.resolve(__dirname, '../node_modules/@mkdevofficial', unscope),
    path.resolve(__dirname, '../node_modules', unscope)
  ];
  for (const cand of cliNodeModules) {
    if (fs.existsSync(path.join(cand, 'package.json'))) return cand;
  }

  // 5. Fallback relative to CLI directory
  const globalCandidates = [
    path.resolve(__dirname, '../../', unscope),
    path.resolve(__dirname, '../..', pkgName),
    path.resolve(__dirname, '../../..', 'node_modules', pkgName),
    path.resolve(__dirname, '../../..', 'node_modules/@mkdevofficial', unscope)
  ];
  for (const cand of globalCandidates) {
    if (fs.existsSync(path.join(cand, 'package.json'))) {
      if (!pkgName.includes('runtime') || fs.existsSync(path.join(cand, 'src/renderer.js'))) {
        return cand;
      }
    }
  }

  return null;
}

export function cleanCode(code) {
  return code
    .replace(/import\s+[\s\S]*?['"][^'"]+['"]\s*;?/g, '')
    .replace(/^\s*export\s+default\s+function\s+([a-zA-Z0-9_$]+)/gm, 'function $1')
    .replace(/^\s*export\s+default\s+function\s*\(/gm, 'function (')
    .replace(/^\s*export\s+(function|const|let|var|class)\s+/gm, '$1 ')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

export function processUserImports(code) {
  return code
    .replace(/import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*;?/g, (match, specifiers) => {
      specifiers = specifiers.trim();
      if (specifiers.startsWith('* as ')) {
        const alias = specifiers.slice(5).trim();
        return `const ${alias} = (typeof liquid !== 'undefined' ? liquid : globalThis.liquid || {});`;
      }
      if (!specifiers.startsWith('{')) {
        // default import e.g. import App from './App.liq'
        const parts = specifiers.split(',');
        const defaultName = parts[0].trim();
        const statements = [];
        if (defaultName && defaultName !== 'liquid' && !/^[A-Z]/.test(defaultName)) {
          statements.push(`const ${defaultName} = (typeof ${defaultName} !== 'undefined' ? ${defaultName} : (globalThis.${defaultName} || {}));`);
        }
        if (parts[1]) {
          const namedPart = parts.slice(1).join(',').replace(/^[\s\{]+|[\s\}]+$/g, '');
          const items = namedPart.split(',').map(s => s.trim()).filter(Boolean);
          for (const item of items) {
            if (item.includes(' as ')) {
              const [orig, alias] = item.split(/\s+as\s+/);
              statements.push(`const ${alias.trim()} = ${orig.trim()};`);
            }
          }
        }
        return statements.join('\n');
      }

      // Named imports e.g. import { a, b as c } from '...'
      const inside = specifiers.replace(/^\{|\}$/g, '').trim();
      const items = inside.split(',').map(s => s.trim()).filter(Boolean);
      const statements = [];
      for (const item of items) {
        if (item.includes(' as ')) {
          const [orig, alias] = item.split(/\s+as\s+/);
          statements.push(`const ${alias.trim()} = ${orig.trim()};`);
        }
      }
      return statements.join('\n');
    })
    .replace(/import\s+['"][^'"]+['"]\s*;?/g, '')
    .replace(/^\s*export\s+default\s+function\s+([a-zA-Z0-9_$]+)/gm, 'function $1')
    .replace(/^\s*export\s+default\s+function\s*\(/gm, 'function App(')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/gm, (m, kind, name) => `${kind} ${name} = globalThis.${name} =`)
    .replace(/^\s*export\s+(const|let|var)\s+/gm, '$1 ')
    .replace(/^\s*export\s+function\s+([a-zA-Z0-9_$]+)/gm, (m, name) => `function ${name}`)
    .replace(/^\s*export\s+class\s+([a-zA-Z0-9_$]+)/gm, (m, name) => `class ${name}`)
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

/**
 * Returns the unified Liquid runtime code (signals, renderer, android-renderer, dom, builtins, router, compiler-errors).
 * All exports are declared locally in scope and assigned to globalThis and globalThis.liquid.
 */
export function getUnifiedRuntimeBundle(rootDir = process.cwd(), { target = 'android', excludeCompilerStub = false } = {}) {
  const runtimeDir = resolvePackageDir('@mkdevofficial/liquid-runtime', rootDir) ||
                     path.resolve(__dirname, '../../liquid-runtime');
  const routerDir = resolvePackageDir('@mkdevofficial/liquid-router', rootDir) ||
                    path.resolve(__dirname, '../../liquid-router');
  const compilerDir = resolvePackageDir('@mkdevofficial/liquid-compiler', rootDir) ||
                      path.resolve(__dirname, '../../liquid-compiler');

  const signalsCode = fs.readFileSync(path.join(runtimeDir, 'src/signals.js'), 'utf8');
  const rendererCode = fs.readFileSync(path.join(runtimeDir, 'src/renderer.js'), 'utf8');
  const androidRendererCode = fs.readFileSync(path.join(runtimeDir, 'src/android-renderer.js'), 'utf8');
  const domCode = fs.readFileSync(path.join(runtimeDir, 'src/dom.js'), 'utf8');
  const builtinsCode = fs.readFileSync(path.join(runtimeDir, 'src/builtins.js'), 'utf8');
  const routerCode = routerDir && fs.existsSync(path.join(routerDir, 'src/index.js'))
    ? fs.readFileSync(path.join(routerDir, 'src/index.js'), 'utf8')
    : '';

  const errorCodesCode = compilerDir && fs.existsSync(path.join(compilerDir, 'src/error-codes.js'))
    ? fs.readFileSync(path.join(compilerDir, 'src/error-codes.js'), 'utf8')
    : '';
  const errorsCode = compilerDir && fs.existsSync(path.join(compilerDir, 'src/errors.js'))
    ? fs.readFileSync(path.join(compilerDir, 'src/errors.js'), 'utf8')
    : '';

  // Minimal stub for compile in runtime bundles if not full compiler
  const compilerStub = excludeCompilerStub ? '' : `
function compile(source, options) {
  if (typeof globalThis !== 'undefined' && globalThis.__liquid_compiler) {
    return globalThis.__liquid_compiler.compile(source, options);
  }
  return { code: source, css: '', map: null };
}
`;

  const publicExportNames = [
    // Signals
    'signal', 'computed', 'effect', 'untrack', 'batch', 'onMount', 'onDestroy',
    'createScope', 'getActiveSubscriber', 'getCurrentScope',
    // Renderer
    'Renderer', 'getRenderer', 'setRenderer',
    // Android Renderer
    'AndroidBatchRenderer', 'AndroidNode', 'TAG_TO_PRIMITIVE',
    'TYPE_VIEW', 'TYPE_TEXT', 'TYPE_BUTTON', 'TYPE_INPUT', 'TYPE_IMAGE', 'TYPE_SCROLL',
    'OP_CREATE_NODE', 'OP_CREATE_TEXT', 'OP_SET_STYLE', 'OP_SET_TEXT', 'OP_SET_PROP',
    'OP_INSERT', 'OP_REMOVE', 'OP_LISTEN', 'OP_UNLISTEN',
    // DOM Renderer
    'DOMRenderer', 'element', 'text', 'comment', 'insert', 'remove', 'append',
    'setStyle', 'listen', 'bindText', 'bindAttr', 'bindInput', 'bindStyle',
    'createIfBlock', 'createEachBlock', 'createSlot', 'mount',
    // Builtins
    'createStore', 'head',
    // Router
    'createRouter', 'matchRoute', 'parseQuery',
    // Compiler & Errors
    'LiquidSyntaxError', 'formatExcerpt', 'ERROR_CODES', 'getError', 'getAllErrors', 'searchErrors'
  ];

  if (!excludeCompilerStub) {
    publicExportNames.push('compile');
  }

  const globalAssignments = `
// Expose all public exports on globalThis and globalThis.liquid
const liquid = {
  ${publicExportNames.join(',\n  ')}
};
if (typeof globalThis !== 'undefined') {
  globalThis.liquid = liquid;
  ${publicExportNames.map(name => `globalThis.${name} = ${name};`).join('\n  ')}
}
`;

  return [
    '// --- Liquid Core Signals ---',
    cleanCode(signalsCode),
    '// --- Liquid Core Renderer ---',
    cleanCode(rendererCode),
    '// --- Liquid Android Native Renderer ---',
    cleanCode(androidRendererCode),
    '// --- Liquid DOM Operations ---',
    cleanCode(domCode),
    '// --- Liquid Builtins (createStore, head) ---',
    cleanCode(builtinsCode),
    '// --- Liquid Router ---',
    cleanCode(routerCode),
    '// --- Liquid Error Codes & Diagnostic Helpers ---',
    cleanCode(errorCodesCode),
    cleanCode(errorsCode),
    compilerStub,
    globalAssignments
  ].join('\n\n');
}
