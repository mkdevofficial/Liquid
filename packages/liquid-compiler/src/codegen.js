import { SourceMapGenerator } from './sourcemap.js';

/**
 * Generate readable ES module code from Liquid AST and Analysis.
 */
export function generate(ast, analysis, options = {}) {
  const file = options.file || 'Component.liq';
  const componentName = options.name || getComponentNameFromFile(file);
  const runtimeModule = options.runtimeModule || 'liquid';
  const scopeAttr = analysis.scopeAttr;

  const mapGen = new SourceMapGenerator({
    file: `${componentName}.js`,
    sourceFile: file
  });

  const imports = [];
  const autoImports = [];
  const bodyLines = [];
  let varCounter = 0;

  function nextVar(prefix = '_v') {
    return `${prefix}${varCounter++}`;
  }

  // Runtime helper tracking
  const usedRuntimeHelpers = new Set(['element', 'text']);

  // Separate logic into top-level imports and component body
  const rawLogic = ast.logic.content || '';
  const logicLines = rawLogic.split(/\r?\n/);
  const userImports = [];
  const userBody = [];

  for (let idx = 0; idx < logicLines.length; idx++) {
    const line = logicLines[idx];
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      userImports.push(line);
    } else {
      userBody.push({ text: line, lineNum: ast.logic.line + idx });
    }
  }

  // Handle auto-imported components
  if (options.resolveComponent) {
    for (const comp of analysis.autoImportComponents) {
      const resolved = options.resolveComponent(comp, file);
      if (resolved) {
        autoImports.push(resolved);
      }
    }
  } else {
    for (const comp of analysis.autoImportComponents) {
      autoImports.push(`import ${comp} from './${comp}.liq';`);
    }
  }

  // Generate DOM tree code
  const rootVar = '_root';
  bodyLines.push(`  const ${rootVar} = [];`);

  for (const node of ast.template) {
    generateNode(node, rootVar, true);
  }

  bodyLines.push(`  return ${rootVar}.length === 1 ? ${rootVar}[0] : ${rootVar};`);

  // Build final code
  const outputLines = [];

  // 1. Runtime imports
  outputLines.push(`import { ${Array.from(usedRuntimeHelpers).join(', ')} } from '${runtimeModule}';`);

  // 2. User & Auto imports
  if (userImports.length > 0) {
    outputLines.push(userImports.join('\n'));
  }
  if (autoImports.length > 0) {
    outputLines.push(autoImports.join('\n'));
  }

  outputLines.push('');

  // 3. Component function definition
  const funcHeaderLine = outputLines.length + 1;
  outputLines.push(`export default function ${componentName}(props = {}, context = {}) {`);

  // Inject props accessor helper
  outputLines.push(`  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }`);

  // User logic body
  for (const item of userBody) {
    const genLine = outputLines.length + 1;
    outputLines.push(`  ${item.text}`);
    if (item.text.trim()) {
      mapGen.addMapping({
        generatedLine: genLine,
        generatedColumn: 2,
        originalLine: item.lineNum,
        originalColumn: 1
      });
    }
  }

  outputLines.push('');

  // UI DOM creation body
  for (const line of bodyLines) {
    outputLines.push(line);
  }

  outputLines.push('}');

  const finalCode = outputLines.join('\n');
  const sourceMap = mapGen.generate();

  return {
    code: finalCode,
    map: sourceMap
  };

  /**
   * Helper to recursively generate node creation instructions.
   */
  function generateNode(node, parentVar, isRoot = false) {
    if (!node) return;

    if (node.type === 'Text') {
      generateTextNode(node, parentVar, isRoot);
    } else if (node.type === 'Element') {
      if (node.isComponent) {
        generateComponentNode(node, parentVar, isRoot);
      } else {
        generateElementNode(node, parentVar, isRoot);
      }
    } else if (node.type === 'IfBlock') {
      generateIfBlock(node, parentVar, isRoot);
    } else if (node.type === 'EachBlock') {
      generateEachBlock(node, parentVar, isRoot);
    } else if (node.type === 'Slot') {
      generateSlotNode(node, parentVar, isRoot);
    }
  }

  function generateTextNode(node, parentVar, isRoot) {
    // If text has only one static raw part
    if (node.parts.length === 1 && node.parts[0].type === 'raw') {
      const tVar = nextVar('_t');
      bodyLines.push(`  const ${tVar} = text(${JSON.stringify(node.parts[0].value)});`);
      appendOrPush(parentVar, tVar, isRoot);
      return;
    }

    // Dynamic text parts
    for (const part of node.parts) {
      const tVar = nextVar('_t');
      if (part.type === 'raw') {
        bodyLines.push(`  const ${tVar} = text(${JSON.stringify(part.value)});`);
      } else {
        usedRuntimeHelpers.add('bindText');
        bodyLines.push(`  const ${tVar} = text('');`);
        bodyLines.push(`  bindText(${tVar}, () => (${part.value}));`);
      }
      appendOrPush(parentVar, tVar, isRoot);
    }
  }

  function generateElementNode(node, parentVar, isRoot) {
    const elVar = nextVar('_el');
    const classList = node.classes.length > 0 ? JSON.stringify(node.classes) : 'null';
    bodyLines.push(`  const ${elVar} = element(${JSON.stringify(node.tag)}, ${JSON.stringify(scopeAttr)}, ${classList});`);

    if (node.id) {
      bodyLines.push(`  ${elVar}.id = ${JSON.stringify(node.id)};`);
    }

    // Static and dynamic attributes
    for (const attr of node.attributes) {
      if (attr.isBoolean) {
        bodyLines.push(`  ${elVar}.setAttribute(${JSON.stringify(attr.name)}, '');`);
      } else if (!attr.isDynamic) {
        bodyLines.push(`  ${elVar}.setAttribute(${JSON.stringify(attr.name)}, ${JSON.stringify(attr.value)});`);
      } else {
        usedRuntimeHelpers.add('bindAttr');
        bodyLines.push(`  bindAttr(${elVar}, ${JSON.stringify(attr.name)}, () => (${attr.value}));`);
      }
    }

    // Event listeners
    for (const ev of node.events) {
      usedRuntimeHelpers.add('listen');
      const mods = ev.modifiers.length > 0 ? JSON.stringify(ev.modifiers) : '[]';
      // If handler is an expression with parentheses or assignment, wrap in function
      const handlerExpr = /[\(\)=]/.test(ev.handler) && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ev.handler)
        ? `(e) => { ${ev.handler}; }`
        : ev.handler;
      bodyLines.push(`  listen(${elVar}, ${JSON.stringify(ev.name)}, ${handlerExpr}, ${mods});`);
    }

    // Two-way bindings
    for (const bind of node.bindings) {
      usedRuntimeHelpers.add('bindInput');
      bodyLines.push(`  bindInput(${elVar}, ${bind.target}, ${JSON.stringify(bind.prop)});`);
    }

    // Children
    for (const child of node.children) {
      generateNode(child, elVar, false);
    }

    appendOrPush(parentVar, elVar, isRoot);
  }

  function generateComponentNode(node, parentVar, isRoot) {
    usedRuntimeHelpers.add('append');
    const compVar = nextVar('_c');
    const propsObj = [];

    for (const attr of node.attributes) {
      const val = attr.isDynamic ? attr.value : JSON.stringify(attr.value);
      propsObj.push(`${JSON.stringify(attr.name)}: ${val}`);
    }

    // Default slot content if children exist
    if (node.children.length > 0) {
      const slotChildrenVar = nextVar('_slot');
      const slotBody = [];
      slotBody.push(`() => {`);
      slotBody.push(`  const ${slotChildrenVar} = [];`);

      // Temporary redirect
      const origBodyLines = bodyLines;
      const subLines = [];
      // Replace bodyLines temporarily
      // We will generate children into subLines
      generateSubtreeInto(node.children, slotChildrenVar, subLines);
      slotBody.push(...subLines.map(l => '  ' + l));
      slotBody.push(`  return ${slotChildrenVar};`);
      slotBody.push(`}`);

      propsObj.push(`default: ${slotBody.join('\n')}`);
    }

    bodyLines.push(`  const ${compVar} = ${node.tag}({ ${propsObj.join(', ')} });`);
    if (isRoot) {
      bodyLines.push(`  if (Array.isArray(${compVar})) ${parentVar}.push(...${compVar}); else if (${compVar}) ${parentVar}.push(${compVar});`);
    } else {
      bodyLines.push(`  if (Array.isArray(${compVar})) append(${parentVar}, ...${compVar}); else if (${compVar}) append(${parentVar}, ${compVar});`);
    }
  }

  function generateIfBlock(node, parentVar, isRoot) {
    usedRuntimeHelpers.add('createIfBlock');
    usedRuntimeHelpers.add('append');
    const anchorVar = nextVar('_anchor');
    bodyLines.push(`  const ${anchorVar} = document.createComment('if');`);
    appendOrPush(parentVar, anchorVar, isRoot);

    const thenNodesVar = nextVar('_thenNodes');
    const thenSubLines = [];
    generateSubtreeInto(node.consequent, thenNodesVar, thenSubLines);

    let elseSubLines = null;
    let elseNodesVar = null;
    if (node.alternate) {
      elseNodesVar = nextVar('_elseNodes');
      elseSubLines = [];
      const altNodes = Array.isArray(node.alternate) ? node.alternate : [node.alternate];
      generateSubtreeInto(altNodes, elseNodesVar, elseSubLines);
    }

    const thenFn = `() => {\n    const ${thenNodesVar} = [];\n${thenSubLines.map(l => '    ' + l).join('\n')}\n    return ${thenNodesVar};\n  }`;
    const elseFn = elseSubLines
      ? `() => {\n    const ${elseNodesVar} = [];\n${elseSubLines.map(l => '    ' + l).join('\n')}\n    return ${elseNodesVar};\n  }`
      : 'null';

    bodyLines.push(`  createIfBlock(${anchorVar}, () => (${node.test}), ${thenFn}, ${elseFn});`);
  }

  function generateEachBlock(node, parentVar, isRoot) {
    usedRuntimeHelpers.add('createEachBlock');
    usedRuntimeHelpers.add('append');
    const anchorVar = nextVar('_anchor');
    bodyLines.push(`  const ${anchorVar} = document.createComment('each');`);
    appendOrPush(parentVar, anchorVar, isRoot);

    const itemArg = node.item;
    const indexArg = node.index || '_idx';
    const keyExpr = node.key ? `(${itemArg}, ${indexArg}) => (${node.key})` : `(${itemArg}, ${indexArg}) => ${indexArg}`;

    const eachNodesVar = nextVar('_eachNodes');
    const eachSubLines = [];
    generateSubtreeInto(node.children, eachNodesVar, eachSubLines);

    // Create item proxy so item.prop, item(), and primitive {item} both work cleanly!
    const itemProxySetup = `    const ${itemArg} = new Proxy(${itemArg}Sig, {
      get(target, prop) {
        if (prop === 'isSignal') return true;
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
          return () => target();
        }
        const val = target();
        return typeof val === 'object' && val !== null ? val[prop] : val;
      },
      apply(target) { return target(); }
    });
    const ${indexArg} = new Proxy(${indexArg}Sig, {
      apply(target) { return target(); },
      get(target, prop) {
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
        return target[prop];
      }
    });`;

    bodyLines.push(`  createEachBlock(${anchorVar}, () => (${node.collection}), ${keyExpr}, (${itemArg}Sig, ${indexArg}Sig) => {
${itemProxySetup}
    const ${eachNodesVar} = [];
${eachSubLines.map(l => '    ' + l).join('\n')}
    return ${eachNodesVar};
  });`);
  }

  function generateSlotNode(node, parentVar, isRoot) {
    usedRuntimeHelpers.add('createSlot');
    usedRuntimeHelpers.add('append');
    const slotVar = nextVar('_slot');
    const slotName = node.name ? JSON.stringify(node.name) : "'default'";
    let fallbackFn = 'null';

    if (node.fallback.length > 0) {
      const fbVar = nextVar('_fb');
      const fbLines = [];
      generateSubtreeInto(node.fallback, fbVar, fbLines);
      fallbackFn = `() => {\n    const ${fbVar} = [];\n${fbLines.map(l => '    ' + l).join('\n')}\n    return ${fbVar};\n  }`;
    }

    bodyLines.push(`  const ${slotVar} = createSlot(props, ${slotName}, ${fallbackFn});`);
    if (isRoot) {
      bodyLines.push(`  ${parentVar}.push(...${slotVar});`);
    } else {
      bodyLines.push(`  append(${parentVar}, ...${slotVar});`);
    }
  }

  function generateSubtreeInto(nodes, containerVar, lineBuffer) {
    for (const n of nodes) {
      generateSubNode(n, containerVar, true, lineBuffer);
    }
  }

  function generateSubNode(n, parent, isRootSub, buf) {
    if (!n) return;
    if (n.type === 'Text') {
      if (n.parts.length === 1 && n.parts[0].type === 'raw') {
        const tVar = nextVar('_t');
        buf.push(`const ${tVar} = text(${JSON.stringify(n.parts[0].value)});`);
        if (isRootSub) {
          buf.push(`${parent}.push(${tVar});`);
        } else {
          buf.push(`${parent}.appendChild(${tVar});`);
        }
      } else {
        for (const p of n.parts) {
          const tVar = nextVar('_t');
          if (p.type === 'raw') {
            buf.push(`const ${tVar} = text(${JSON.stringify(p.value)});`);
          } else {
            usedRuntimeHelpers.add('bindText');
            buf.push(`const ${tVar} = text('');`);
            buf.push(`bindText(${tVar}, () => (${p.value}));`);
          }
          if (isRootSub) {
            buf.push(`${parent}.push(${tVar});`);
          } else {
            buf.push(`${parent}.appendChild(${tVar});`);
          }
        }
      }
    } else if (n.type === 'Element') {
      if (n.isComponent) {
        usedRuntimeHelpers.add('append');
        const compVar = nextVar('_c');
        const propsObj = [];
        for (const attr of n.attributes) {
          const val = attr.isDynamic ? attr.value : JSON.stringify(attr.value);
          propsObj.push(`${JSON.stringify(attr.name)}: ${val}`);
        }
        buf.push(`const ${compVar} = ${n.tag}({ ${propsObj.join(', ')} });`);
        buf.push(`if (Array.isArray(${compVar})) ${parent}.push(...${compVar}); else if (${compVar}) ${parent}.push(${compVar});`);
      } else {
        const elVar = nextVar('_el');
        const classList = n.classes.length > 0 ? JSON.stringify(n.classes) : 'null';
        buf.push(`const ${elVar} = element(${JSON.stringify(n.tag)}, ${JSON.stringify(scopeAttr)}, ${classList});`);
        if (n.id) buf.push(`${elVar}.id = ${JSON.stringify(n.id)};`);

        for (const attr of n.attributes) {
          if (attr.isBoolean) {
            buf.push(`${elVar}.setAttribute(${JSON.stringify(attr.name)}, '');`);
          } else if (!attr.isDynamic) {
            buf.push(`${elVar}.setAttribute(${JSON.stringify(attr.name)}, ${JSON.stringify(attr.value)});`);
          } else {
            usedRuntimeHelpers.add('bindAttr');
            buf.push(`bindAttr(${elVar}, ${JSON.stringify(attr.name)}, () => (${attr.value}));`);
          }
        }
        for (const ev of n.events) {
          usedRuntimeHelpers.add('listen');
          const mods = ev.modifiers.length > 0 ? JSON.stringify(ev.modifiers) : '[]';
          const handlerExpr = /[\(\)=]/.test(ev.handler) && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ev.handler)
            ? `(e) => { ${ev.handler}; }`
            : ev.handler;
          buf.push(`listen(${elVar}, ${JSON.stringify(ev.name)}, ${handlerExpr}, ${mods});`);
        }
        for (const bind of n.bindings) {
          usedRuntimeHelpers.add('bindInput');
          buf.push(`bindInput(${elVar}, ${bind.target}, ${JSON.stringify(bind.prop)});`);
        }
        for (const child of n.children) {
          const childBuf = [];
          generateSubNode(child, elVar, false, childBuf);
          buf.push(...childBuf);
        }
        if (isRootSub) {
          buf.push(`${parent}.push(${elVar});`);
        } else {
          buf.push(`${parent}.appendChild(${elVar});`);
        }
      }
    } else if (n.type === 'IfBlock') {
      usedRuntimeHelpers.add('createIfBlock');
      const anchorVar = nextVar('_anchor');
      buf.push(`const ${anchorVar} = document.createComment('if');`);
      if (isRootSub) {
        buf.push(`${parent}.push(${anchorVar});`);
      } else {
        buf.push(`${parent}.appendChild(${anchorVar});`);
      }
      const thenNodesVar = nextVar('_thenNodes');
      const thenSub = [];
      generateSubtreeInto(n.consequent, thenNodesVar, thenSub);
      let elseSub = null;
      let elseNodesVar = null;
      if (n.alternate) {
        elseNodesVar = nextVar('_elseNodes');
        const altNodes = Array.isArray(n.alternate) ? n.alternate : [n.alternate];
        elseSub = [];
        generateSubtreeInto(altNodes, elseNodesVar, elseSub);
      }
      const thenFn = `() => {\n      const ${thenNodesVar} = [];\n${thenSub.map(l => '      ' + l).join('\n')}\n      return ${thenNodesVar};\n    }`;
      const elseFn = elseSub
        ? `() => {\n      const ${elseNodesVar} = [];\n${elseSub.map(l => '      ' + l).join('\n')}\n      return ${elseNodesVar};\n    }`
        : 'null';
      buf.push(`createIfBlock(${anchorVar}, () => (${n.test}), ${thenFn}, ${elseFn});`);
    } else if (n.type === 'EachBlock') {
      usedRuntimeHelpers.add('createEachBlock');
      const anchorVar = nextVar('_anchor');
      buf.push(`const ${anchorVar} = document.createComment('each');`);
      if (isRootSub) {
        buf.push(`${parent}.push(${anchorVar});`);
      } else {
        buf.push(`${parent}.appendChild(${anchorVar});`);
      }
      const itemArg = n.item;
      const indexArg = n.index || '_idx';
      const keyExpr = n.key ? `(${itemArg}, ${indexArg}) => (${n.key})` : `(${itemArg}, ${indexArg}) => ${indexArg}`;
      const eachNodesVar = nextVar('_eachNodes');
      const eachSub = [];
      generateSubtreeInto(n.children, eachNodesVar, eachSub);

      const itemProxySetup = `      const ${itemArg} = new Proxy(${itemArg}Sig, {
        get(target, prop) {
          if (prop === 'isSignal') return true;
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
            return () => target();
          }
          const val = target();
          return typeof val === 'object' && val !== null ? val[prop] : val;
        },
        apply(target) { return target(); }
      });
      const ${indexArg} = new Proxy(${indexArg}Sig, {
      apply(target) { return target(); },
      get(target, prop) {
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
        return target[prop];
      }
    });`;

      buf.push(`createEachBlock(${anchorVar}, () => (${n.collection}), ${keyExpr}, (${itemArg}Sig, ${indexArg}Sig) => {
${itemProxySetup}
      const ${eachNodesVar} = [];
${eachSub.map(l => '      ' + l).join('\n')}
      return ${eachNodesVar};
    });`);
    }
  }

  function appendOrPush(parent, childVar, isRoot) {
    if (isRoot) {
      bodyLines.push(`  ${parent}.push(${childVar});`);
    } else {
      bodyLines.push(`  ${parent}.appendChild(${childVar});`);
    }
  }
}

function getComponentNameFromFile(filePath) {
  const base = filePath.split(/[/\\]/).pop().replace(/\.liq$/, '');
  return base.replace(/[^a-zA-Z0-9_$]/g, '_') || 'Component';
}
