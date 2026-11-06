/**
 * Component Outline and Document Symbols Generator for .liq files
 */

export class OutlineGenerator {
  /**
   * Extract outline symbols from a buffer.
   *
   * @param {import('../text/buffer.js').TextBuffer} buffer
   * @returns {Array<{ name: string, type: string, line: number }>}
   */
  static getSymbols(buffer) {
    const lines = buffer.getLines();
    const symbols = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Section headers
      if (trimmed.startsWith('---')) {
        const secMatch = trimmed.match(/^---\s*(logic|js|style|css|ui)/i);
        if (secMatch) {
          symbols.push({ name: `Section: ${secMatch[1]}`, type: 'section', line: i });
        }
        continue;
      }

      // defineProps
      if (trimmed.includes('defineProps')) {
        const propMatch = trimmed.match(/defineProps\s*\(\s*\{([^}]*)\}/);
        if (propMatch) {
          symbols.push({ name: `Props: ${propMatch[1].trim()}`, type: 'prop', line: i });
        } else {
          symbols.push({ name: 'defineProps()', type: 'prop', line: i });
        }
        continue;
      }

      // Signals and computeds
      const sigMatch = trimmed.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(signal|computed)\s*\(/);
      if (sigMatch) {
        symbols.push({ name: `${sigMatch[2]}: ${sigMatch[1]}`, type: 'signal', line: i });
        continue;
      }

      // Functions
      const fnMatch = trimmed.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
      if (fnMatch) {
        symbols.push({ name: `fn ${fnMatch[1]}()`, type: 'function', line: i });
        continue;
      }

      // Components in template
      const compMatch = trimmed.match(/^([A-Z][a-zA-Z0-9_]*)/);
      if (compMatch) {
        symbols.push({ name: `<${compMatch[1]}>`, type: 'component', line: i });
        continue;
      }
    }

    return symbols;
  }
}
