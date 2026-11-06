/**
 * Mobile / Phone Quick-Action Bar
 * On-screen touch row for high-frequency commands when Ctrl/Alt combos are awkward.
 */

import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD } from '../terminal/screen.js';

export class QuickActionBar {
  /**
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(theme) {
    this.theme = theme;

    this.actions = [
      { id: 'file.save', label: '💾 Save', short: '💾', command: 'file.save' },
      { id: 'edit.undo', label: '↩ Undo', short: '↩', command: 'edit.undo' },
      { id: 'edit.redo', label: '↪ Redo', short: '↪', command: 'edit.redo' },
      { id: 'search.find', label: '🔍 Find', short: '🔍', command: 'search.find' },
      { id: 'help.palette', label: '⚡ Cmd', short: '⚡', command: 'help.palette' },
      { id: 'edit.dedent', label: '« Out', short: '«', command: 'edit.dedent' },
      { id: 'edit.indent', label: '» In', short: '»', command: 'edit.indent' },
      { id: 'edit.comment', label: '// Com', short: '//', command: 'edit.comment' },
      { id: 'liquid.dev', label: '🫟 Liq', short: '🫟', command: 'liquid.dev' }
    ];
  }

  render(screen) {
    const row = screen.rows - 1;
    const bg = this.theme.quickActionBarBg;
    const fg = this.theme.quickActionBarFg;
    const border = this.theme.quickActionBorder;

    screen.writeString(row, 0, ' '.repeat(screen.cols), fg, bg);

    const isNarrow = screen.cols < 55;
    let curCol = 0;

    for (let i = 0; i < this.actions.length; i++) {
      if (curCol >= screen.cols - 2) break;

      const action = this.actions[i];
      const text = isNarrow ? ` ${action.short} ` : ` ${action.label} `;
      const btnWidth = stringWidth(text);

      if (curCol + btnWidth > screen.cols) break;

      screen.writeString(row, curCol, text, fg, bg, ATTR_BOLD);
      curCol += btnWidth;

      if (curCol < screen.cols) {
        screen.writeString(row, curCol, '│', border, bg);
        curCol += 1;
      }
    }
  }

  handleClick(row, col, screen, editor) {
    if (row !== screen.rows - 1) return false;

    const isNarrow = screen.cols < 55;
    let curCol = 0;

    for (const action of this.actions) {
      const text = isNarrow ? ` ${action.short} ` : ` ${action.label} `;
      const btnWidth = stringWidth(text);

      if (col >= curCol && col < curCol + btnWidth) {
        editor.executeCommand(action.command);
        return true;
      }

      curCol += btnWidth + 1; // +1 for separator
    }

    return false;
  }
}
