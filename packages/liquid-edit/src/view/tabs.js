/**
 * Tab Bar Widget
 * Handles multiple open buffers, active tab indicator, dirty status, and close buttons.
 */

import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD } from '../terminal/screen.js';

export class TabBar {
  /**
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(theme) {
    this.theme = theme;
  }

  render(screen, buffers, activeIndex, row = 1) {
    const bg = this.theme.tabBarBg;
    screen.writeString(row, 0, ' '.repeat(screen.cols), this.theme.editorFg, bg);

    if (buffers.length === 0) {
      screen.writeString(row, 2, '[No Open Files]', this.theme.tabInactiveFg, bg);
      return;
    }

    let curCol = 0;
    for (let i = 0; i < buffers.length; i++) {
      if (curCol >= screen.cols - 4) break;

      const buf = buffers[i];
      const isActive = i === activeIndex;
      const tabBg = isActive ? this.theme.tabActiveBg : this.theme.tabInactiveBg;
      const tabFg = isActive ? this.theme.tabActiveFg : this.theme.tabInactiveFg;

      const dirtyMark = buf.isDirty() ? ' ●' : '';
      const closeBtn = ' ×';
      const maxNameLen = Math.min(20, Math.max(8, Math.floor((screen.cols - curCol) / (buffers.length - i))));
      const title = truncateToWidth(buf.fileName, maxNameLen);

      const tabText = ` ${title}${dirtyMark}${closeBtn} `;
      screen.writeString(row, curCol, tabText, tabFg, tabBg, isActive ? ATTR_BOLD : 0);

      curCol += stringWidth(tabText);
      // Small separator
      screen.writeString(row, curCol, '│', this.theme.paletteBorder, bg);
      curCol += 1;
    }
  }

  handleClick(row, col, buffers, activeIndex, onSelectTab, onCloseTab, targetRow = 1) {
    if (row !== targetRow) return false;

    let curCol = 0;
    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      const dirtyMark = buf.isDirty() ? ' ●' : '';
      const closeBtn = ' ×';
      const maxNameLen = Math.min(20, 8);
      const title = truncateToWidth(buf.fileName, maxNameLen);
      const tabText = ` ${title}${dirtyMark}${closeBtn} `;
      const tabWidth = stringWidth(tabText);

      if (col >= curCol && col < curCol + tabWidth) {
        // Check if clicked the '×' close button (last 3 chars)
        const closeStart = curCol + tabWidth - 3;
        if (col >= closeStart) {
          onCloseTab(i);
        } else {
          onSelectTab(i);
        }
        return true;
      }

      curCol += tabWidth + 1;
    }

    return false;
  }
}
