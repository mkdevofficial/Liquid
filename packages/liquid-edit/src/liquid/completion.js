/**
 * Autocomplete Popup Engine
 * Provides context-aware completions for tags, directives, keywords, and signals.
 */

import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD } from '../terminal/screen.js';

const STANDARD_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'button', 'input', 'form',
  'label', 'select', 'option', 'textarea', 'header', 'footer', 'main', 'nav',
  'section', 'article', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th'
];

const LIQUID_DIRECTIVES = [
  '@click', '@click.prevent', '@click.stop', '@keydown.enter', '@keydown.esc',
  '@input', '@change', '@submit.prevent', '$bind', 'class', 'style', 'type'
];

const LIQUID_KEYWORDS = [
  'if', 'else', 'elseif', 'each', 'as', 'slot', 'defineProps', 'signal', 'computed', 'effect'
];

export class CompletionEngine {
  constructor() {
    this.visible = false;
    this.items = [];
    this.selectedIndex = 0;
    this.prefix = '';
    this.onAccept = null;
  }

  show(items, prefix, onAccept) {
    this.items = items;
    this.selectedIndex = 0;
    this.prefix = prefix;
    this.onAccept = onAccept;
    this.visible = items.length > 0;
  }

  hide() {
    this.visible = false;
  }

  /**
   * Suggest completions based on current line and column.
   *
   * @param {import('../text/buffer.js').TextBuffer} buffer
   */
  suggest(buffer) {
    if (buffer.language !== 'liq') {
      this.hide();
      return;
    }

    const lineText = buffer.getLine(buffer.cursor.line);
    const beforeCursor = lineText.slice(0, buffer.cursor.col);
    const wordMatch = beforeCursor.match(/([@$a-zA-Z0-9_-]+)$/);

    if (!wordMatch || wordMatch[1].length < 1) {
      this.hide();
      return;
    }

    const prefix = wordMatch[1];
    let candidates = [];

    if (prefix.startsWith('@')) {
      candidates = LIQUID_DIRECTIVES.filter(d => d.startsWith(prefix));
    } else if (prefix.startsWith('$')) {
      candidates = ['$bind', '$value', '$checked'].filter(d => d.startsWith(prefix));
    } else {
      const q = prefix.toLowerCase();
      candidates = [
        ...LIQUID_KEYWORDS.filter(k => k.startsWith(q)),
        ...STANDARD_TAGS.filter(t => t.startsWith(q))
      ];
    }

    if (candidates.length > 0) {
      this.show(candidates, prefix, (item) => {
        const insertText = item.slice(prefix.length);
        buffer.insertText(insertText);
      });
    } else {
      this.hide();
    }
  }

  handleKey(key) {
    if (!this.visible) return false;

    if (key.name === 'escape') {
      this.hide();
      return true;
    }

    if (key.name === 'up') {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      return true;
    }

    if (key.name === 'down') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      return true;
    }

    if (key.name === 'enter' || key.name === 'tab') {
      const item = this.items[this.selectedIndex];
      this.hide();
      if (item && this.onAccept) {
        this.onAccept(item);
      }
      return true;
    }

    return false;
  }

  render(screen, cursorScreenRow, cursorScreenCol, theme) {
    if (!this.visible || this.items.length === 0) return;

    const width = 24;
    const maxItems = Math.min(6, this.items.length);
    const height = maxItems + 2;

    let top = cursorScreenRow + 1;
    if (top + height >= screen.rows - 2) {
      top = Math.max(1, cursorScreenRow - height);
    }
    const left = Math.min(cursorScreenCol, screen.cols - width - 1);

    const bg = theme.paletteBg;
    const fg = theme.paletteFg;
    const borderFg = theme.paletteBorder;
    const selBg = theme.paletteSelectedBg;
    const selFg = theme.paletteSelectedFg;

    screen.writeString(top, left, '┌' + '─'.repeat(width - 2) + '┐', borderFg, bg);

    for (let i = 0; i < maxItems; i++) {
      const item = this.items[i];
      const row = top + 1 + i;
      const isSel = i === this.selectedIndex;
      const lineBg = isSel ? selBg : bg;
      const lineFg = isSel ? selFg : fg;

      screen.writeString(row, left, '│' + ' '.repeat(width - 2) + '│', borderFg, lineBg);
      screen.writeString(row, left + 2, truncateToWidth(item, width - 4), lineFg, lineBg, isSel ? ATTR_BOLD : 0);
    }

    screen.writeString(top + maxItems + 1, left, '└' + '─'.repeat(width - 2) + '┘', borderFg, bg);
  }
}
