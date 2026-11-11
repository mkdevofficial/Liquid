import * as acorn from 'acorn';
import { formatExcerpt } from '@mkdevofficial/liquid-compiler';

export class LiquidLinkError extends Error {
  constructor(message, { file = 'bundle.js', line = 1, column = 1, identifier = '', frame = '', source = '' } = {}) {
    super(frame || message);
    this.name = 'LiquidLinkError';
    this.identifier = identifier;
    this.file = file;
    this.line = line;
    this.column = column;
    this.frame = frame;
    this.source = source;
  }
}

export const HOST_GLOBALS_WHITELIST = new Set([
  // ECMAScript standard built-ins
  'Object', 'Function', 'Array', 'Number', 'parseFloat', 'parseInt', 'Infinity', 'NaN', 'undefined',
  'Boolean', 'String', 'Symbol', 'Date', 'Promise', 'RegExp', 'Error', 'AggregateError',
  'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
  'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'DataView',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'JSON', 'Math', 'Reflect', 'Proxy', 'Intl', 'BigInt',
  'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
  'escape', 'unescape', 'eval', 'arguments',
  'globalThis', 'window', 'global', 'self',

  // Console & timers & microtasks
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'setImmediate', 'clearImmediate', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',

  // Liquid Host Bridge & metadata
  '__liquid_native_bridge', '__LIQUID_BUILD_STAMP__', '__LIQUID_SOURCEMAP__',

  // Browser DOM globals (supported for web builds and typeof guards)
  'document', 'navigator', 'location', 'history', 'performance', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MutationObserver',
  'fetch', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
  'WebSocket', 'EventSource', 'alert', 'confirm', 'prompt'
]);

class Scope {
  constructor(parent = null, isFunction = false) {
    this.parent = parent;
    this.isFunction = isFunction;
    this.bindings = new Set();
  }

  addBinding(name) {
    if (name) this.bindings.add(name);
  }

  addVarBinding(name) {
    if (name) {
      let s = this;
      while (s && !s.isFunction && s.parent) {
        s = s.parent;
      }
      if (s) s.bindings.add(name);
    }
  }

  has(name) {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
}

function collectPatternBindings(pattern, scope, isVar = false) {
  if (!pattern) return;
  if (pattern.type === 'Identifier') {
    if (isVar) scope.addVarBinding(pattern.name);
    else scope.addBinding(pattern.name);
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'Property') {
        collectPatternBindings(prop.value, scope, isVar);
      } else if (prop.type === 'RestElement') {
        collectPatternBindings(prop.argument, scope, isVar);
      }
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (const elem of pattern.elements) {
      if (elem) collectPatternBindings(elem, scope, isVar);
    }
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternBindings(pattern.left, scope, isVar);
  } else if (pattern.type === 'RestElement') {
    collectPatternBindings(pattern.argument, scope, isVar);
  }
}

/**
 * Perform lexical scope analysis on bundle JS to detect unresolved identifiers.
 *
 * @param {string} bundleCode - The generated bundle JavaScript code
 * @param {object} [options={}]
 * @param {Array<{ path: string, content: string }>} [options.sourceFiles=[]]
 * @param {'android' | 'web'} [options.target='android']
 * @param {Set<string>} [options.whitelist]
 * @param {boolean} [options.throwOnError=false]
 * @returns {{ ok: boolean, unresolved: Array<object>, errors: Array<object> }}
 */
export function checkBundleLinking(bundleCode, options = {}) {
  const target = options.target || 'android';
  const whitelist = options.whitelist || HOST_GLOBALS_WHITELIST;
  const sourceFiles = options.sourceFiles || [];

  let ast;
  try {
    ast = acorn.parse(bundleCode, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true
    });
  } catch (err) {
    // If syntax error is due to module statements (import/export), retry with sourceType: 'module'
    if (err.message && err.message.includes('sourceType: module')) {
      try {
        ast = acorn.parse(bundleCode, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          locations: true
        });
      } catch (modErr) {
        err = modErr;
      }
    }

    if (!ast) {
      const errorInfo = {
        file: 'bundle.js',
        line: err.loc?.line || 1,
        column: err.loc?.column || 1,
        identifier: '',
        message: `Bundle parse error: ${err.message}`,
        frame: formatExcerpt({
          message: err.message,
          code: 'LQ-LINK-SYNTAX',
          file: 'bundle.js',
          line: err.loc?.line || 1,
          column: err.loc?.column || 1,
          source: bundleCode
        })
      };
      if (options.throwOnError) {
        throw new LiquidLinkError(errorInfo.message, errorInfo);
      }
      return { ok: false, unresolved: [], errors: [errorInfo] };
    }
  }

  let currentScope = new Scope(null, true);
  const allReferences = [];

  function traverse(node, parentNode) {
    if (!node || typeof node !== 'object') return;
    let createdScope = false;

    // Scope creation
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      if (node.type === 'FunctionDeclaration' && node.id) {
        currentScope.addVarBinding(node.id.name);
      }
      currentScope = new Scope(currentScope, true);
      createdScope = true;
      if (node.type === 'FunctionExpression' && node.id) {
        currentScope.addBinding(node.id.name);
      }
      for (const param of node.params) {
        collectPatternBindings(param, currentScope, false);
      }
    } else if (
      node.type === 'BlockStatement' ||
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'SwitchStatement'
    ) {
      currentScope = new Scope(currentScope, false);
      createdScope = true;
    } else if (node.type === 'CatchClause') {
      currentScope = new Scope(currentScope, false);
      createdScope = true;
      if (node.param) collectPatternBindings(node.param, currentScope, false);
    } else if (node.type === 'ClassDeclaration') {
      if (node.id) currentScope.addBinding(node.id.name);
    } else if (node.type === 'VariableDeclaration') {
      const isVar = node.kind === 'var';
      for (const decl of node.declarations) {
        collectPatternBindings(decl.id, currentScope, isVar);
      }
    }

    // Reference checking
    if (node.type === 'Identifier') {
      let isRef = true;
      if (!parentNode) {
        isRef = true;
      } else if (parentNode.type === 'VariableDeclarator' && parentNode.id === node) {
        isRef = false;
      } else if (parentNode.type === 'FunctionDeclaration' && parentNode.id === node) {
        isRef = false;
      } else if (parentNode.type === 'FunctionExpression' && parentNode.id === node) {
        isRef = false;
      } else if (parentNode.type === 'ClassDeclaration' && parentNode.id === node) {
        isRef = false;
      } else if (parentNode.type === 'ClassExpression' && parentNode.id === node) {
        isRef = false;
      } else if (parentNode.type === 'MemberExpression' && parentNode.property === node && !parentNode.computed) {
        isRef = false;
      } else if (parentNode.type === 'Property' && parentNode.key === node && !parentNode.computed) {
        isRef = false;
      } else if (parentNode.type === 'MethodDefinition' && parentNode.key === node && !parentNode.computed) {
        isRef = false;
      } else if (parentNode.type === 'CatchClause' && parentNode.param === node) {
        isRef = false;
      } else if (parentNode.type === 'LabeledStatement' && parentNode.label === node) {
        isRef = false;
      } else if ((parentNode.type === 'BreakStatement' || parentNode.type === 'ContinueStatement') && parentNode.label === node) {
        isRef = false;
      }

      if (isRef) {
        allReferences.push({
          name: node.name,
          scope: currentScope,
          line: node.loc?.start?.line || 1,
          column: (node.loc?.start?.column ?? 0) + 1
        });
      }
    }

    // Traverse AST children
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c === 'object' && c.type) traverse(c, node);
        }
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child, node);
      }
    }

    if (createdScope) {
      currentScope = currentScope.parent;
    }
  }

  traverse(ast, null);

  // Filter unresolved references
  const unresolvedMap = new Map();
  for (const ref of allReferences) {
    if (!ref.scope.has(ref.name) && !whitelist.has(ref.name)) {
      if (!unresolvedMap.has(ref.name)) {
        unresolvedMap.set(ref.name, ref);
      }
    }
  }

  const unresolved = Array.from(unresolvedMap.values());
  if (unresolved.length === 0) {
    return { ok: true, unresolved: [], errors: [] };
  }

  // Map unresolved identifiers back to original source files
  const errors = [];
  for (const item of unresolved) {
    const origLoc = findIdentifierInSourceFiles(item.name, sourceFiles);
    const file = origLoc ? origLoc.file : 'bundle.js';
    const line = origLoc ? origLoc.line : item.line;
    const column = origLoc ? origLoc.column : item.column;
    const sourceContent = origLoc ? origLoc.content : bundleCode;

    const message = `Unresolved identifier "${item.name}" for ${target} target. Did you forget to import or define it?`;
    const frame = formatExcerpt({
      message,
      code: 'LQ-LINK-UNDEF',
      file,
      line,
      column,
      source: sourceContent
    });

    errors.push({
      identifier: item.name,
      file,
      line,
      column,
      message,
      frame,
      source: sourceContent
    });
  }

  if (options.throwOnError && errors.length > 0) {
    const first = errors[0];
    throw new LiquidLinkError(first.message, first);
  }

  return { ok: false, unresolved, errors };
}

function findIdentifierInSourceFiles(name, sourceFiles) {
  if (!sourceFiles || sourceFiles.length === 0) return null;

  // Regex to match whole word identifier
  const re = new RegExp(`\\b${escapeRegExp(name)}\\b`);

  for (const sf of sourceFiles) {
    if (!sf.content) continue;
    const lines = sf.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(re);
      if (match && match.index !== undefined) {
        return {
          file: sf.path,
          line: i + 1,
          column: match.index + 1,
          content: sf.content
        };
      }
    }
  }
  return null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
