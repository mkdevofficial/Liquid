import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePackageDir(pkgName, rootDir) {
  const unscope = pkgName.replace(/^@[^/]+\//, '');
  // Sibling in monorepo
  const sibling = path.resolve(__dirname, '../../..', unscope);
  if (fs.existsSync(sibling)) return sibling;

  const pkgSibling = path.resolve(__dirname, '../..', unscope);
  if (fs.existsSync(pkgSibling)) return pkgSibling;

  // Check rootDir and parents
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
