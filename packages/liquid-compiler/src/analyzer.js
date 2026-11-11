/**
 * Analyzer: scope resolution, component resolution, scoped style hashing, warnings.
 */

// Simple deterministic string hash for scope attributes
export function hashString(str) {
  let hash = 5381;
  let i = str.length;
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return (hash >>> 0).toString(36).slice(0, 8);
}

export function analyze(ast, options = {}) {
  const file = options.file || 'Component.liq';
  const warnings = [];
  const referencedComponents = new Set();
  const explicitImports = new Set();

  // Scan explicit imports in logic section
  const logicContent = ast.logic.content || '';
  const importRegex = /import\s+(?:([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:\{([^}]+)\}))\s+from\s+['"][^'"]+['"]/g;
  let match;
  while ((match = importRegex.exec(logicContent)) !== null) {
    if (match[1]) {
      explicitImports.add(match[1].trim());
    }
    if (match[2]) {
      const named = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      for (const n of named) {
        if (n) explicitImports.add(n);
      }
    }
  }

  // Scan local variable / function declarations in logic section
  const declaredLocals = new Set();

  // 1. Destructured declarations: const { a, b: c, d = 1 } = ...
  const destructureRegex = /(?:const|let|var)\s*\{([^}]+)\}/g;
  while ((match = destructureRegex.exec(logicContent)) !== null) {
    const items = match[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const item of items) {
      const name = item.split('=')[0].trim();
      const finalName = name.includes(':') ? name.split(':')[1].trim() : name;
      const clean = finalName.replace(/[^a-zA-Z0-9_$]/g, '');
      if (clean) declaredLocals.add(clean);
    }
  }

  // 2. Standard variable declarations: const X = ..., let Y, etc.
  const varRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = varRegex.exec(logicContent)) !== null) {
    declaredLocals.add(match[1]);
  }

  // 3. Function declarations: function X(...)
  const fnRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = fnRegex.exec(logicContent)) !== null) {
    declaredLocals.add(match[1]);
  }

  // 4. Class declarations: class X
  const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = classRegex.exec(logicContent)) !== null) {
    declaredLocals.add(match[1]);
  }

  // Traverse template
  function visit(node) {
    if (!node) return;

    if (node.type === 'Element') {
      if (node.isComponent) {
        referencedComponents.add(node.tag);
      }
      for (const child of node.children) {
        visit(child);
      }
    } else if (node.type === 'IfBlock') {
      for (const c of node.consequent) visit(c);
      if (node.alternate) {
        if (Array.isArray(node.alternate)) {
          for (const a of node.alternate) visit(a);
        } else {
          visit(node.alternate);
        }
      }
    } else if (node.type === 'EachBlock') {
      if (!node.key) {
        warnings.push({
          message: `'each' block for '${node.collection}' does not have a key expression. Provide a key like '(${node.item}.id)' for optimal reconciliation.`,
          loc: node.loc
        });
      }
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  for (const node of ast.template) {
    visit(node);
  }

  // Components that are referenced but not explicitly imported or declared locally
  const autoImportComponents = [];
  for (const comp of referencedComponents) {
    if (!explicitImports.has(comp) && !declaredLocals.has(comp)) {
      autoImportComponents.push(comp);
    }
  }

  // Generate unique scoped attribute
  const scopeId = hashString(file + (ast.styles.content || '') + (ast.logic.content || ''));
  const scopeAttr = `data-l-${scopeId}`;

  return {
    scopeId,
    scopeAttr,
    referencedComponents: Array.from(referencedComponents),
    autoImportComponents,
    warnings
  };
}
