/**
 * Code Formatter for Liquid (.liq) Documents
 * Normalizes 2-space indentation, cleans trailing spaces, and formats section headers.
 */

export class LiquidFormatter {
  /**
   * Format .liq source code.
   *
   * @param {string} source
   * @returns {string}
   */
  static format(source) {
    if (!source) return '';

    const rawLines = source.split('\n');
    const formattedLines = [];
    let prevWasBlank = false;

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i];

      // Convert any tabs to 2 spaces
      line = line.replace(/\t/g, '  ');

      // Remove trailing whitespace
      line = line.replace(/[ \t]+$/, '');

      // Normalize section headers: --- logic, --- style, --- ui
      const trimmed = line.trim();
      if (trimmed.startsWith('---')) {
        const secMatch = trimmed.match(/^---\s*(logic|js|style|css|ui)/i);
        if (secMatch) {
          const sec = secMatch[1].toLowerCase();
          const canonSec = sec === 'js' ? 'logic' : (sec === 'css' ? 'style' : sec);
          line = `--- ${canonSec}`;
        }
      }

      // Collapse multiple consecutive blank lines into at most one
      const isBlank = line.trim().length === 0;
      if (isBlank) {
        if (!prevWasBlank) {
          formattedLines.push('');
          prevWasBlank = true;
        }
      } else {
        formattedLines.push(line);
        prevWasBlank = false;
      }
    }

    // Ensure single trailing newline
    while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
      formattedLines.pop();
    }
    formattedLines.push('');

    return formattedLines.join('\n');
  }
}
