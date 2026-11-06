/**
 * Terminal Input Sequence Parser
 * Handles CSI/SS3, SGR Mouse, Bracketed Paste, Lone Esc timing,
 * and Termux touch keyboard extra-keys.
 */

import { EventEmitter } from 'node:events';

export class InputParser extends EventEmitter {
  constructor() {
    super();
    this.buffer = '';
    this.escTimer = null;
    this.escTimeoutMs = 40;
    this.inBracketedPaste = false;
    this.pasteBuffer = '';
  }

  /**
   * Process raw incoming string or buffer chunk from stdin.
   *
   * @param {string | Buffer} data
   */
  feed(data) {
    const chunk = typeof data === 'string' ? data : data.toString('utf8');
    this.buffer += chunk;
    this._processBuffer();
  }

  _processBuffer() {
    // If in bracketed paste mode, consume until \x1b[201~
    if (this.inBracketedPaste) {
      const pasteEndIdx = this.buffer.indexOf('\x1b[201~');
      if (pasteEndIdx !== -1) {
        this.pasteBuffer += this.buffer.slice(0, pasteEndIdx);
        this.buffer = this.buffer.slice(pasteEndIdx + 6);
        this.inBracketedPaste = false;
        this.emit('paste', this.pasteBuffer);
        this.pasteBuffer = '';
      } else {
        this.pasteBuffer += this.buffer;
        this.buffer = '';
        return;
      }
    }

    while (this.buffer.length > 0) {
      // Check for bracketed paste start
      if (this.buffer.startsWith('\x1b[200~')) {
        this.buffer = this.buffer.slice(6);
        this.inBracketedPaste = true;
        this.pasteBuffer = '';
        this._processBuffer();
        return;
      }

      // Check for SGR Mouse reporting: \x1b[<btn;col;row(M|m)
      const mouseMatch = this.buffer.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (mouseMatch) {
        this.buffer = this.buffer.slice(mouseMatch[0].length);
        const btnCode = parseInt(mouseMatch[1], 10);
        const col = parseInt(mouseMatch[2], 10) - 1; // 1-based to 0-based
        const row = parseInt(mouseMatch[3], 10) - 1;
        const isRelease = mouseMatch[4] === 'm';

        this._handleMouseEvent(btnCode, col, row, isRelease);
        continue;
      }

      // Check for Focus In/Out: \x1b[I, \x1b[O
      if (this.buffer.startsWith('\x1b[I')) {
        this.buffer = this.buffer.slice(3);
        this.emit('focus', true);
        continue;
      }
      if (this.buffer.startsWith('\x1b[O')) {
        this.buffer = this.buffer.slice(3);
        this.emit('focus', false);
        continue;
      }

      // Check if buffer starts with ESC
      if (this.buffer[0] === '\x1b') {
        if (this.buffer.length === 1) {
          // Lone ESC or start of sequence: wait briefly
          if (!this.escTimer) {
            this.escTimer = setTimeout(() => {
              this.escTimer = null;
              if (this.buffer === '\x1b') {
                this.buffer = '';
                this.emit('key', { name: 'escape', ctrl: false, alt: false, shift: false, raw: '\x1b' });
              }
            }, this.escTimeoutMs);
          }
          return; // wait for next chunk or timeout
        }

        // Cancel ESC timer since more bytes arrived
        if (this.escTimer) {
          clearTimeout(this.escTimer);
          this.escTimer = null;
        }

        // Try parsing full escape sequence
        const seqParsed = this._parseEscapeSequence();
        if (seqParsed) continue;

        // If sequence is incomplete (e.g. starts with \x1b[ but end is missing), wait for more data
        if (
          this.buffer.startsWith('\x1b[') ||
          this.buffer.startsWith('\x1bO') ||
          this.buffer.startsWith('\x1b]')
        ) {
          if (this.buffer.length < 16) {
            return; // Wait for rest of sequence
          }
        }

        // Unrecognized escape: treat as Alt + next char or lone escape
        this.buffer = this.buffer.slice(1);
        const nextChar = this.buffer[0];
        if (nextChar) {
          this.buffer = this.buffer.slice(1);
          this.emit('key', {
            name: nextChar.toLowerCase(),
            char: nextChar,
            ctrl: false,
            alt: true,
            shift: nextChar >= 'A' && nextChar <= 'Z',
            raw: '\x1b' + nextChar
          });
        } else {
          this.emit('key', { name: 'escape', ctrl: false, alt: false, shift: false, raw: '\x1b' });
        }
        continue;
      }

      // Control characters
      const charCode = this.buffer.charCodeAt(0);

      // Enter / Return
      if (charCode === 13 || charCode === 10) {
        this.buffer = this.buffer.slice(1);
        this.emit('key', { name: 'enter', ctrl: false, alt: false, shift: false, raw: '\n' });
        continue;
      }

      // Tab
      if (charCode === 9) {
        this.buffer = this.buffer.slice(1);
        this.emit('key', { name: 'tab', ctrl: false, alt: false, shift: false, raw: '\t' });
        continue;
      }

      // Backspace: 127 (DEL) or 8 (BS)
      if (charCode === 127 || charCode === 8) {
        this.buffer = this.buffer.slice(1);
        this.emit('key', { name: 'backspace', ctrl: false, alt: false, shift: false, raw: '\x7f' });
        continue;
      }

      // Ctrl + Key: 1 to 26 (Ctrl-A to Ctrl-Z) except Tab (9), LF (10), CR (13)
      if (charCode >= 1 && charCode <= 26) {
        this.buffer = this.buffer.slice(1);
        const letter = String.fromCharCode(96 + charCode); // 1 -> 'a'
        this.emit('key', { name: letter, ctrl: true, alt: false, shift: false, raw: String.fromCharCode(charCode) });
        continue;
      }

      // Regular characters (including UTF-8 multibyte characters and emoji)
      const char = this.buffer[0];
      this.buffer = this.buffer.slice(1);
      this.emit('key', {
        name: char,
        char,
        ctrl: false,
        alt: false,
        shift: char >= 'A' && char <= 'Z',
        raw: char
      });
    }
  }

  _parseEscapeSequence() {
    const b = this.buffer;

    // Shift-Tab: \x1b[Z
    if (b.startsWith('\x1b[Z')) {
      this.buffer = b.slice(3);
      this.emit('key', { name: 'tab', ctrl: false, alt: false, shift: true, raw: '\x1b[Z' });
      return true;
    }

    // CSI arrows and simple keys
    const csiSimple = {
      '\x1b[A': 'up',
      '\x1b[B': 'down',
      '\x1b[C': 'right',
      '\x1b[D': 'left',
      '\x1b[H': 'home',
      '\x1b[F': 'end',
      '\x1bOA': 'up',
      '\x1bOB': 'down',
      '\x1bOC': 'right',
      '\x1bOD': 'left',
      '\x1bOH': 'home',
      '\x1bOF': 'end'
    };

    for (const [seq, name] of Object.entries(csiSimple)) {
      if (b.startsWith(seq)) {
        this.buffer = b.slice(seq.length);
        this.emit('key', { name, ctrl: false, alt: false, shift: false, raw: seq });
        return true;
      }
    }

    // Tilde sequences: \x1b[1~ to \x1b[6~, etc.
    const tildeMatch = b.match(/^\x1b\[(\d+)(?:;(\d+))?~/);
    if (tildeMatch) {
      this.buffer = b.slice(tildeMatch[0].length);
      const code = parseInt(tildeMatch[1], 10);
      const mod = tildeMatch[2] ? parseInt(tildeMatch[2], 10) : 1;
      const { ctrl, alt, shift } = this._decodeModifier(mod);

      let name = '';
      switch (code) {
        case 1: name = 'home'; break;
        case 2: name = 'insert'; break;
        case 3: name = 'delete'; break;
        case 4: name = 'end'; break;
        case 5: name = 'pageup'; break;
        case 6: name = 'pagedown'; break;
        case 7: name = 'home'; break;
        case 8: name = 'end'; break;
        case 11: name = 'f1'; break;
        case 12: name = 'f2'; break;
        case 13: name = 'f3'; break;
        case 14: name = 'f4'; break;
        case 15: name = 'f5'; break;
        case 17: name = 'f6'; break;
        case 18: name = 'f7'; break;
        case 19: name = 'f8'; break;
        case 20: name = 'f9'; break;
        case 21: name = 'f10'; break;
        case 23: name = 'f11'; break;
        case 24: name = 'f12'; break;
        default: name = `fn_${code}`; break;
      }

      this.emit('key', { name, ctrl, alt, shift, raw: tildeMatch[0] });
      return true;
    }

    // Arrow with modifiers: \x1b[1;2A (Shift+Up), \x1b[1;5A (Ctrl+Up), etc.
    const modArrowMatch = b.match(/^\x1b\[1;(\d+)([ABCDHF])/);
    if (modArrowMatch) {
      this.buffer = b.slice(modArrowMatch[0].length);
      const mod = parseInt(modArrowMatch[1], 10);
      const keyLetter = modArrowMatch[2];
      const { ctrl, alt, shift } = this._decodeModifier(mod);

      const nameMap = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end' };
      const name = nameMap[keyLetter] || 'unknown';

      this.emit('key', { name, ctrl, alt, shift, raw: modArrowMatch[0] });
      return true;
    }

    return false;
  }

  _decodeModifier(mod) {
    // 2=Shift, 3=Alt, 4=Shift+Alt, 5=Ctrl, 6=Shift+Ctrl, 7=Alt+Ctrl, 8=Shift+Alt+Ctrl
    return {
      shift: Boolean(mod === 2 || mod === 4 || mod === 6 || mod === 8),
      alt: Boolean(mod === 3 || mod === 4 || mod === 7 || mod === 8),
      ctrl: Boolean(mod === 5 || mod === 6 || mod === 7 || mod === 8)
    };
  }

  _handleMouseEvent(btnCode, col, row, isRelease) {
    let action = 'press';
    let button = 'left';
    let shift = false;
    let alt = false;
    let ctrl = false;

    if (btnCode & 4) shift = true;
    if (btnCode & 8) alt = true;
    if (btnCode & 16) ctrl = true;

    const baseBtn = btnCode & 0x03;
    const isMotion = Boolean(btnCode & 32);
    const isWheel = Boolean(btnCode & 64);

    if (isWheel) {
      // Scroll wheel
      action = (btnCode & 1) ? 'wheeldown' : 'wheelup';
    } else if (isMotion) {
      action = 'drag';
      if (baseBtn === 0) button = 'left';
      else if (baseBtn === 1) button = 'middle';
      else if (baseBtn === 2) button = 'right';
    } else if (isRelease) {
      action = 'release';
    } else {
      action = 'press';
      if (baseBtn === 0) button = 'left';
      else if (baseBtn === 1) button = 'middle';
      else if (baseBtn === 2) button = 'right';
    }

    this.emit('mouse', {
      action,
      button,
      col,
      row,
      shift,
      alt,
      ctrl
    });
  }
}
