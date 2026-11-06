/**
 * Command Palette Widget
 * Phone-friendly fuzzy command selector with touch and keyboard interaction.
 */

import { truncateToWidth, padWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_INVERSE, ATTR_DIM } from '../terminal/screen.js';

export class CommandPalette {
  /**
   * @param {import('../commands.js').CommandRegistry} registry
   * @param {import('../theme.js').Theme} theme
   */
  constructor(registry, theme) {
    this.registry = registry;
    this.theme = theme;
    this.visible = false;
    this.query = '';
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.onSelect = null;
    this.onCancel = null;
    this.customItems = null; // optional custom item list (for file finder, etc.)
  }

  open(onSelect, onCancel, customItems = null) {
    this.visible = true;
    this.query = '';
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.onSelect = onSelect;
    this.onCancel = onCancel;
    this.customItems = customItems;
  }

  close() {
    this.visible = false;
    if (this.onCancel) this.onCancel();
  }

  getItems() {
    if (this.customItems) {
      if (!this.query) return this.customItems;
      const q = this.query.toLowerCase();
      return this.customItems.filter(item => {
        const text = `${item.title} ${item.subtitle || ''}`.toLowerCase();
        return text.includes(q);
      });
    }
    return this.registry.search(this.query);
  }

  handleKey(key) {
    if (!this.visible) return false;

    if (key.name === 'escape') {
      this.close();
      return true;
    }

    if (key.name === 'up') {
      const items = this.getItems();
      if (items.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
      }
      return true;
    }

    if (key.name === 'down') {
      const items = this.getItems();
      if (items.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % items.length;
      }
      return true;
    }

    if (key.name === 'enter') {
      const items = this.getItems();
      if (items.length > 0 && this.selectedIndex < items.length) {
        const selected = items[this.selectedIndex];
        this.visible = false;
        if (this.onSelect) this.onSelect(selected);
      } else {
        this.close();
      }
      return true;
    }

    if (key.name === 'backspace') {
      if (this.query.length > 0) {
        this.query = this.query.slice(0, -1);
        this.selectedIndex = 0;
        this.scrollOffset = 0;
      }
      return true;
    }

    if (key.char && !key.ctrl && !key.alt) {
      this.query += key.char;
      this.selectedIndex = 0;
      this.scrollOffset = 0;
      return true;
    }

    return false;
  }

  handleClick(row, col, bounds) {
    if (!this.visible) return false;
    const { top, left, width, height } = bounds;

    if (row < top || row >= top + height || col < left || col >= left + width) {
      // Tap outside palette closes it
      this.close();
      return true;
    }

    // Header / input row is top + 1
    if (row === top + 1) return true;

    // Item rows start at top + 2
    const itemRow = row - (top + 2);
    const items = this.getItems();
    const clickedIdx = this.scrollOffset + itemRow;

    if (clickedIdx >= 0 && clickedIdx < items.length) {
      this.selectedIndex = clickedIdx;
      const selected = items[clickedIdx];
      this.visible = false;
      if (this.onSelect) this.onSelect(selected);
      return true;
    }

    return true;
  }

  render(screen) {
    if (!this.visible) return;

    // Calculate responsive box centered in screen
    const width = Math.min(60, Math.max(34, screen.cols - 4));
    const maxItems = Math.min(8, Math.max(4, screen.rows - 6));
    const height = maxItems + 3; // border + input + items + border

    const top = Math.max(1, Math.floor((screen.rows - height) / 3));
    const left = Math.max(1, Math.floor((screen.cols - width) / 2));

    const bg = this.theme.paletteBg;
    const fg = this.theme.paletteFg;
    const borderFg = this.theme.paletteBorder;
    const highlightBg = this.theme.paletteSelectedBg;
    const highlightFg = this.theme.paletteSelectedFg;

    // Outer border
    for (let r = 0; r < height; r++) {
      const screenRow = top + r;
      for (let c = 0; c < width; c++) {
        screen.setCell(screenRow, left + c, ' ', fg, bg);
      }
    }

    // Top border & title
    const title = ' Command Palette (Tap or Enter to select) ';
    screen.writeString(top, left, '┌' + '─'.repeat(width - 2) + '┐', borderFg, bg);
    screen.writeString(top, left + 2, truncateToWidth(title, width - 4), this.theme.accent, bg, ATTR_BOLD);

    // Search input box
    const prompt = '> ';
    screen.writeString(top + 1, left + 1, prompt, this.theme.accent, bg, ATTR_BOLD);
    const inputText = this.query + '█';
    screen.writeString(top + 1, left + 3, truncateToWidth(inputText, width - 4), fg, bg);

    // Separator line
    screen.writeString(top + 2, left, '├' + '─'.repeat(width - 2) + '┤', borderFg, bg);

    // Items list
    const items = this.getItems();
    const visibleCount = maxItems;

    // Adjust scroll
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + visibleCount) {
      this.scrollOffset = this.selectedIndex - visibleCount + 1;
    }

    for (let i = 0; i < visibleCount; i++) {
      const itemIdx = this.scrollOffset + i;
      const row = top + 3 + i;

      if (itemIdx < items.length) {
        const item = items[itemIdx];
        const isSelected = itemIdx === this.selectedIndex;
        const itemBg = isSelected ? highlightBg : bg;
        const itemFg = isSelected ? highlightFg : fg;

        // Clear item line
        screen.writeString(row, left + 1, ' '.repeat(width - 2), itemFg, itemBg);

        // Category badge or icon
        const cat = item.category ? `[${item.category}] ` : '';
        const catWidth = stringWidth(cat);
        screen.writeString(row, left + 2, cat, this.theme.paletteCategory, itemBg, ATTR_DIM);

        // Title
        const availTitleWidth = width - 4 - catWidth - (item.keybinding ? stringWidth(item.keybinding) + 2 : 0);
        screen.writeString(row, left + 2 + catWidth, truncateToWidth(item.title, Math.max(10, availTitleWidth)), itemFg, itemBg, isSelected ? ATTR_BOLD : 0);

        // Keybinding on right
        if (item.keybinding) {
          const kbStr = item.keybinding;
          const kbCol = left + width - 2 - stringWidth(kbStr);
          screen.writeString(row, kbCol, kbStr, this.theme.paletteKeybinding, itemBg, ATTR_DIM);
        }
      }
    }

    // Bottom border
    screen.writeString(top + height - 1, left, '└' + '─'.repeat(width - 2) + '┘', borderFg, bg);

    return { top, left, width, height };
  }
}
