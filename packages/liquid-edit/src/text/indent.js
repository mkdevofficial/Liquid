/**
 * Indentation and Language Comment Helpers
 */

/**
 * Get the leading whitespace of a line.
 *
 * @param {string} line
 * @returns {string}
 */
export function getLeadingWhitespace(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : '';
}

/**
 * Get indent level (count of 2-space increments).
 *
 * @param {string} line
 * @returns {number}
 */
export function getIndentSpacesCount(line) {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ') count++;
    else if (line[i] === '\t') count += 2;
    else break;
  }
  return count;
}

/**
 * Determine comment syntax for a language.
 *
 * @param {string} language
 * @returns {{ line: string, blockStart?: string, blockEnd?: string }}
 */
export function getCommentSyntax(language) {
  switch (language) {
    case 'liq':
    case 'javascript':
    case 'typescript':
    case 'json':
    case 'c':
    case 'cpp':
      return { line: '//' };
    case 'html':
    case 'xml':
      return { line: '<!--', blockStart: '<!--', blockEnd: '-->' };
    case 'css':
      return { line: '/*', blockStart: '/*', blockEnd: '*/' };
    case 'shell':
    case 'bash':
    case 'python':
    case 'yaml':
    case 'toml':
      return { line: '#' };
    default:
      return { line: '//' };
  }
}

/**
 * Check a buffer for mixed tabs and spaces or tab indentations.
 * Liquid compiler strictly rejects tabs in indentation.
 *
 * @param {string[]} lines
 * @returns {{ hasTabs: boolean, mixedLines: number[] }}
 */
export function checkIndentationHealth(lines) {
  let hasTabs = false;
  const mixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const ws = getLeadingWhitespace(lines[i]);
    if (ws.includes('\t')) {
      hasTabs = true;
      mixedLines.push(i + 1); // 1-based line number
    }
  }

  return { hasTabs, mixedLines };
}
