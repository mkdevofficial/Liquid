/**
 * Double-buffered Terminal Screen Grid with Differential Updating
 * Supports 24-bit Truecolor, 256-color fallback, synchronized output,
 * alternate screen buffer, and virtual mode for automated testing.
 */

import { codePointWidth, graphemeWidth, getGraphemes, stringWidth } from './unicode.js';

export const ATTR_NONE = 0;
export const ATTR_BOLD = 1;
export const ATTR_DIM = 2;
export const ATTR_ITALIC = 4;
export const ATTR_UNDERLINE = 8;
export const ATTR_INVERSE = 16;
export const ATTR_STRIKETHROUGH = 32;

/**
 * Convert RGB hex '#rrggbb' to ANSI truecolor escape.
 */
export function hexToRgb(hex) {
  if (!hex || hex === 'none' || hex === 'default') return null;
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export class ScreenCell {
  constructor(char = ' ', fg = null, bg = null, attrs = ATTR_NONE) {
    this.char = char;
    this.fg = fg; // '#rrggbb' or null
    this.bg = bg;
    this.attrs = attrs;
    this.width = 1; // 1 or 2 (or 0 for trailing half of wide char)
  }

  equals(other) {
    if (!other) return false;
    return (
      this.char === other.char &&
      this.fg === other.fg &&
      this.bg === other.bg &&
      this.attrs === other.attrs &&
      this.width === other.width
    );
  }

  copyFrom(other) {
    this.char = other.char;
    this.fg = other.fg;
    this.bg = other.bg;
    this.attrs = other.attrs;
    this.width = other.width;
  }
}

export class Screen {
  /**
   * @param {number} [rows=24]
   * @param {number} [cols=80]
   * @param {object} [options={}]
   * @param {boolean} [options.virtual=false]
   */
  constructor(rows = 24, cols = 80, options = {}) {
    this.rows = Math.max(1, rows);
    this.cols = Math.max(1, cols);
    this.virtual = Boolean(options.virtual);
    this.outStream = options.outStream || (this.virtual ? null : process.stdout);

    this.front = this._createGrid(this.rows, this.cols);
    this.back = this._createGrid(this.rows, this.cols);

    this.cursorRow = 0;
    this.cursorCol = 0;
    this.showCursor = true;
    this.cursorShape = 2; // 2=block, 6=bar, 4=underline

    // Capabilities
    this.hasTruecolor = !process.env.NO_COLOR && (
      Boolean(process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') ||
      process.env.TERM?.includes('xterm') ||
      process.env.TERM?.includes('alacritty') ||
      process.env.TERM?.includes('kitty') ||
      process.env.TERM?.includes('screen') ||
      process.env.TERM?.includes('tmux') ||
      process.env.TERM_PROGRAM === 'vscode' ||
      Boolean(process.env.TERMUX_VERSION) ||
      true // default to truecolor in modern terminals
    );

    this.inAlternateScreen = false;
  }

  _createGrid(rows, cols) {
    const grid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(cols);
      for (let c = 0; c < cols; c++) {
        grid[r][c] = new ScreenCell(' ', null, null, ATTR_NONE);
      }
    }
    return grid;
  }

  resize(rows, cols) {
    rows = Math.max(1, rows);
    cols = Math.max(1, cols);
    if (this.rows === rows && this.cols === cols) return;

    this.rows = rows;
    this.cols = cols;
    this.front = this._createGrid(rows, cols);
    this.back = this._createGrid(rows, cols);
  }

  clear() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.back[r][c];
        cell.char = ' ';
        cell.fg = null;
        cell.bg = null;
        cell.attrs = ATTR_NONE;
        cell.width = 1;
      }
    }
  }

  setCell(row, col, char, fg = null, bg = null, attrs = ATTR_NONE) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    const cell = this.back[row][col];
    cell.char = char;
    cell.fg = fg;
    cell.bg = bg;
    cell.attrs = attrs;
    cell.width = graphemeWidth(char);

    // If wide char (width 2), mark the following cell as trailing half
    if (cell.width === 2 && col + 1 < this.cols) {
      const nextCell = this.back[row][col + 1];
      nextCell.char = '';
      nextCell.fg = fg;
      nextCell.bg = bg;
      nextCell.attrs = attrs;
      nextCell.width = 0;
    }
  }

  writeString(row, col, str, fg = null, bg = null, attrs = ATTR_NONE, maxCol = this.cols) {
    if (row < 0 || row >= this.rows || col >= this.cols) return 0;
    const graphemes = getGraphemes(str);
    let curCol = col;

    for (const g of graphemes) {
      if (curCol >= maxCol || curCol >= this.cols) break;
      const gw = g === '\t' ? 2 : graphemeWidth(g);
      if (gw === 2 && curCol + 1 >= maxCol) {
        // Can't fit wide char in remaining single column
        break;
      }

      this.setCell(row, curCol, g, fg, bg, attrs);
      curCol += gw;
    }

    return curCol - col;
  }

  setCursorPosition(row, col, visible = true, shape = 2) {
    this.cursorRow = Math.max(0, Math.min(row, this.rows - 1));
    this.cursorCol = Math.max(0, Math.min(col, this.cols - 1));
    this.showCursor = visible;
    this.cursorShape = shape;
  }

  /**
   * Enter raw mode and alternate screen.
   */
  start() {
    if (this.virtual) return;

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Alternate screen + clear + enable bracketed paste + enable SGR mouse tracking
    // \x1b[?1049h: alternate screen
    // \x1b[?2004h: bracketed paste mode
    // \x1b[?1000h: basic mouse click tracking
    // \x1b[?1002h: button-event tracking (motion while pressed)
    // \x1b[?1006h: SGR extended mouse coordinates
    // \x1b[?25l: hide cursor during init
    const setupSeq = '\x1b[?1049h\x1b[?2004h\x1b[?1000h\x1b[?1002h\x1b[?1006h\x1b[?25l';
    this.outStream.write(setupSeq);
    this.inAlternateScreen = true;
  }

  /**
   * Restore terminal cleanly to initial state.
   */
  stop() {
    if (this.virtual) return;

    // Show cursor, disable mouse, disable bracketed paste, exit alternate screen, reset style
    const cleanupSeq = '\x1b[0m\x1b[?25h\x1b[?1006l\x1b[?1002l\x1b[?1000l\x1b[?2004l\x1b[?1049l';
    try {
      this.outStream.write(cleanupSeq);
    } catch {}

    if (process.stdin.setRawMode) {
      try { process.stdin.setRawMode(false); } catch {}
    }
    try { process.stdin.pause(); } catch {}
    this.inAlternateScreen = false;
  }

  /**
   * Render differential updates from `back` to `front`.
   * Returns generated ANSI string.
   */
  flush() {
    let buf = '';

    // Synchronized update start (BSU)
    buf += '\x1b[?2025h';
    // Hide cursor during buffer output
    buf += '\x1b[?25l';

    let lastFg = null;
    let lastBg = null;
    let lastAttrs = ATTR_NONE;

    function applyStyle(cell) {
      let s = '';
      if (cell.attrs !== lastAttrs) {
        s += '\x1b[0m'; // reset all
        lastFg = null;
        lastBg = null;
        lastAttrs = cell.attrs;

        if (cell.attrs & ATTR_BOLD) s += '\x1b[1m';
        if (cell.attrs & ATTR_DIM) s += '\x1b[2m';
        if (cell.attrs & ATTR_ITALIC) s += '\x1b[3m';
        if (cell.attrs & ATTR_UNDERLINE) s += '\x1b[4m';
        if (cell.attrs & ATTR_INVERSE) s += '\x1b[7m';
        if (cell.attrs & ATTR_STRIKETHROUGH) s += '\x1b[9m';
      }

      if (cell.fg !== lastFg) {
        if (!cell.fg) {
          s += '\x1b[39m'; // default fg
        } else {
          const rgb = hexToRgb(cell.fg);
          if (rgb) s += `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
        }
        lastFg = cell.fg;
      }

      if (cell.bg !== lastBg) {
        if (!cell.bg) {
          s += '\x1b[49m'; // default bg
        } else {
          const rgb = hexToRgb(cell.bg);
          if (rgb) s += `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
        }
        lastBg = cell.bg;
      }

      return s;
    }

    for (let r = 0; r < this.rows; r++) {
      let rowMoved = false;

      for (let c = 0; c < this.cols; c++) {
        const backCell = this.back[r][c];
        const frontCell = this.front[r][c];

        if (!backCell.equals(frontCell)) {
          // If we haven't positioned cursor on this row segment, jump to it
          if (!rowMoved) {
            buf += `\x1b[${r + 1};${c + 1}H`;
            rowMoved = true;
          }

          buf += applyStyle(backCell);
          buf += backCell.char;

          frontCell.copyFrom(backCell);
        } else {
          rowMoved = false; // gap in changes requires new cursor jump
        }
      }
    }

    // Reset style after render
    buf += '\x1b[0m';

    // Position cursor at user's cursor position
    buf += `\x1b[${this.cursorRow + 1};${this.cursorCol + 1}H`;
    // Cursor shape (\x1b[2 q = block, \x1b[6 q = bar)
    buf += `\x1b[${this.cursorShape} q`;
    // Show cursor if enabled
    if (this.showCursor) {
      buf += '\x1b[?25h';
    }

    // Synchronized update end (ESU)
    buf += '\x1b[?2025l';

    if (!this.virtual && this.outStream) {
      this.outStream.write(buf);
    }

    return buf;
  }

  /**
   * Get virtual text of screen row for assertion testing.
   *
   * @param {number} row
   * @returns {string}
   */
  getVirtualRow(row) {
    if (row < 0 || row >= this.rows) return '';
    let str = '';
    for (let c = 0; c < this.cols; c++) {
      str += this.front[row][c].char;
    }
    return str;
  }
}
