/**
 * Liquid Syntax Error with line/column/caret excerpts.
 */
export class LiquidSyntaxError extends Error {
  constructor(message, { file = 'anonymous.liq', line = 1, column = 1, source = '' } = {}) {
    const formatted = formatExcerpt({ message, file, line, column, source });
    super(formatted);
    this.name = 'LiquidSyntaxError';
    this.rawMessage = message;
    this.file = file;
    this.line = line;
    this.column = column;
    this.source = source;
  }
}

export function formatExcerpt({ message, file = 'anonymous.liq', line = 1, column = 1, source = '' }) {
  const lines = source.split(/\r?\n/);
  const targetLineIdx = line - 1;

  const startIdx = Math.max(0, targetLineIdx - 2);
  const endIdx = Math.min(lines.length - 1, targetLineIdx + 2);

  const maxLineNumWidth = String(endIdx + 1).length;

  const header = `\n🫟 Liquid Syntax Error: ${message}\n  --> ${file}:${line}:${column}\n`;
  const gutterPad = ' '.repeat(maxLineNumWidth);

  const excerptLines = [];
  excerptLines.push(`${gutterPad} |`);

  for (let i = startIdx; i <= endIdx; i++) {
    const lineNum = String(i + 1).padStart(maxLineNumWidth, ' ');
    const rawContent = lines[i] ?? '';
    // Display tabs visibly if present
    const displayContent = rawContent.replace(/\t/g, '→   ');
    excerptLines.push(`${lineNum} | ${displayContent}`);

    if (i === targetLineIdx) {
      // Calculate caret position considering expanded tabs
      let caretCol = 0;
      for (let c = 0; c < Math.min(column - 1, rawContent.length); c++) {
        caretCol += rawContent[c] === '\t' ? 4 : 1;
      }
      const caret = ' '.repeat(caretCol) + '^';
      excerptLines.push(`${gutterPad} | ${caret}`);
    }
  }

  excerptLines.push(`${gutterPad} |`);
  return header + excerptLines.join('\n') + '\n';
}
