/**
 * Status Bar Widget
 * Displays position, diagnostics counts, encoding, file type, and mode.
 */

import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_DIM } from '../terminal/screen.js';

export class StatusBar {
  /**
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(theme) {
    this.theme = theme;
  }

  render(screen, buffer, diagnostics = [], mode = 'INSERT') {
    const row = screen.rows - 2; // Row immediately above bottom quick-action bar
    const bg = this.theme.statusBarBg;
    const fg = this.theme.statusBarFg;

    screen.writeString(row, 0, ' '.repeat(screen.cols), fg, bg);

    if (!buffer) {
      screen.writeString(row, 1, 'liquid-edit', this.theme.statusBarAccent, bg, ATTR_BOLD);
      return;
    }

    // Left segment: Mode badge
    const modeBadge = ` ${mode} `;
    screen.writeString(row, 0, modeBadge, this.theme.editorBg, this.theme.statusBarAccent, ATTR_BOLD);

    let curCol = stringWidth(modeBadge) + 1;

    // Diagnostics counts
    const errors = diagnostics.filter(d => d.severity === 'error').length;
    const warnings = diagnostics.filter(d => d.severity === 'warning').length;

    if (errors > 0) {
      const errStr = `✖ ${errors} `;
      screen.writeString(row, curCol, errStr, this.theme.errorFg, bg, ATTR_BOLD);
      curCol += stringWidth(errStr);
    }
    if (warnings > 0) {
      const warnStr = `⚠ ${warnings} `;
      screen.writeString(row, curCol, warnStr, this.theme.warningFg, bg, ATTR_BOLD);
      curCol += stringWidth(warnStr);
    }
    if (errors === 0 && warnings === 0 && buffer.language === 'liq') {
      const okStr = `✔ 0 `;
      screen.writeString(row, curCol, okStr, this.theme.syntax.string, bg);
      curCol += stringWidth(okStr);
    }

    // Right segment: Line/Col, encoding, language
    const lineCol = `Ln ${buffer.cursor.line + 1}, Col ${buffer.cursor.col + 1}`;
    const langStr = buffer.language.toUpperCase();
    const rightInfo = screen.cols >= 50
      ? ` ${langStr}  UTF-8  LF  ${lineCol} `
      : ` ${langStr}  ${lineCol} `;

    const rightCol = Math.max(curCol, screen.cols - stringWidth(rightInfo));
    screen.writeString(row, rightCol, rightInfo, fg, bg);
  }

  handleClick(row, col, screen, onToggleProblems) {
    if (row !== screen.rows - 2) return false;
    // If clicked around the diagnostics area (left side cols 8 to 22), toggle problems panel
    if (col >= 8 && col <= 24) {
      onToggleProblems();
      return true;
    }
    return false;
  }
}
