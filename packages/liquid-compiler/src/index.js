import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { analyze } from './analyzer.js';
import { transformScopedCSS } from './css.js';
import { generate } from './codegen.js';
import { LiquidSyntaxError, formatExcerpt } from './errors.js';

export { tokenize } from './tokenizer.js';
export { parse } from './parser.js';
export { analyze } from './analyzer.js';
export { transformScopedCSS } from './css.js';
export { generate } from './codegen.js';
export { LiquidSyntaxError, formatExcerpt } from './errors.js';

/**
 * Standalone Liquid compiler API.
 * Compiles a .liq source string into readable ES module JS, scoped CSS, source map, and warnings.
 *
 * @param {string} source
 * @param {object} [options={}]
 * @returns {{ code: string, map: object, css: string, warnings: Array<object>, ast: object }}
 */
export function compile(source, options = {}) {
  const file = options.file || 'Component.liq';

  // 1. Tokenize
  const tokens = tokenize(source, { file, ...options });

  // 2. Parse
  const ast = parse(tokens, { file, source, ...options });

  // 3. Analyze
  const analysis = analyze(ast, { file, ...options });

  // 4. Scoped CSS
  const scopedCSS = transformScopedCSS(ast.styles.content, analysis.scopeAttr);

  // 5. Code generation
  const genResult = generate(ast, analysis, { file, ...options });

  return {
    code: genResult.code,
    map: genResult.map,
    css: scopedCSS,
    warnings: analysis.warnings,
    ast
  };
}
