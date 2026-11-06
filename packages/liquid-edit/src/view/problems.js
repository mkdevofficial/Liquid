/**
 * Problems / Diagnostics Panel
 * Interactive panel listing compile errors and warnings with tap-to-jump navigation.
 */

import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_DIM } from '../terminal/screen.js';

export class ProblemsPanel {
  /**
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(theme) {
    this.theme = theme;
    this.visible = false;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  toggle() {
    this.visible = !this.visible;
    this.selectedIndex = 0;
  }

  show() {
    this.visible = true;
    this.selectedIndex = 0;
  }

  hide() {
    this.visible = false;
  }

  handleKey(key, diagnostics, onJump) {
    if (!this.visible || diagnostics.length === 0) return false;

    if (key.name === 'escape') {
      this.hide();
      return true;
    }

    if (key.name === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return true;
    }

    if (key.name === 'down') {
      this.selectedIndex = Math.min(diagnostics.length - 1, this.selectedIndex + 1);
      return true;
    }

    if (key.name === 'enter') {
      const prob = diagnostics[this.selectedIndex];
      if (prob) {
        onJump(prob.line, prob.col);
      }
      return true;
    }

    return false;
  }

  handleClick(row, col, diagnostics, onJump, bounds) {
    if (!this.visible) return false;
    const { top, height } = bounds;

    if (row < top || row >= top + height) return false;
    if (row === top) return true; // header

    const probIdx = this.scrollOffset + (row - top - 1);
    if (probIdx >= 0 && probIdx < diagnostics.length) {
      this.selectedIndex = probIdx;
      const prob = diagnostics[probIdx];
      onJump(prob.line, prob.col);
      return true;
    }

    return true;
  }

  render(screen, diagnostics, topRow = Math.floor(screen.rows * 0.65), bottomRow = screen.rows - 2) {
    if (!this.visible) return null;

    const height = bottomRow - topRow;
    const bg = this.theme.paletteBg;
    const fg = this.theme.paletteFg;
    const borderFg = this.theme.paletteBorder;

    // Header bar
    const errCount = diagnostics.filter(d => d.severity === 'error').length;
    const warnCount = diagnostics.filter(d => d.severity === 'warning').length;
    const headerTitle = ` PROBLEMS (${errCount} errors, ${warnCount} warnings) — Tap item to jump `;

    screen.writeString(topRow, 0, '─'.repeat(screen.cols), borderFg, bg);
    screen.writeString(topRow, 2, headerTitle, this.theme.accent, bg, ATTR_BOLD);

    const visibleRows = height - 1;

    // Adjust scroll
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + visibleRows) {
      this.scrollOffset = this.selectedIndex - visibleRows + 1;
    }

    for (let i = 0; i < visibleRows; i++) {
      const row = topRow + 1 + i;
      const probIdx = this.scrollOffset + i;

      screen.writeString(row, 0, ' '.repeat(screen.cols), fg, bg);

      if (probIdx < diagnostics.length) {
        const prob = diagnostics[probIdx];
        const isSel = probIdx === this.selectedIndex;
        const lineBg = isSel ? this.theme.paletteSelectedBg : bg;
        const lineFg = isSel ? this.theme.paletteSelectedFg : fg;

        screen.writeString(row, 0, ' '.repeat(screen.cols), lineFg, lineBg);

        const isErr = prob.severity === 'error';
        const icon = isErr ? '✖ ' : '⚠ ';
        const iconColor = isErr ? this.theme.errorFg : this.theme.warningFg;

        screen.writeString(row, 1, icon, iconColor, lineBg, ATTR_BOLD);

        const posStr = `[${prob.line + 1}:${prob.col + 1}] `;
        screen.writeString(row, 3, posStr, this.theme.paletteCategory, lineBg, ATTR_DIM);

        const posWidth = stringWidth(posStr);
        const availWidth = screen.cols - 4 - posWidth;
        screen.writeString(row, 3 + posWidth, truncateToWidth(prob.message, availWidth), lineFg, lineBg, isSel ? ATTR_BOLD : 0);
      }
    }

    return { top: topRow, height };
  }
}
