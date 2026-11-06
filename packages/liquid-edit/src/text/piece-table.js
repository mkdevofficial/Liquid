/**
 * Piece Table Text Buffer
 * High performance text buffer for files up to 10MB+.
 * All operations (insert, delete, line indexing) are non-destructive to original buffer.
 */

export class PieceTable {
  /**
   * @param {string} [initialText='']
   */
  constructor(initialText = '') {
    this.orig = initialText;
    this.add = '';
    this.pieces = [];

    if (initialText.length > 0) {
      this.pieces.push({
        buf: 'orig',
        start: 0,
        len: initialText.length,
        lines: this._countLines(initialText)
      });
    }

    this._length = initialText.length;
    this._lineOffsets = null;
    this._linesCache = null;
    this._version = 0;
  }

  get length() {
    return this._length;
  }

  get version() {
    return this._version;
  }

  _countLines(str) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) === 10) count++; // '\n'
    }
    return count;
  }

  _invalidate() {
    this._lineOffsets = null;
    this._linesCache = null;
    this._version++;
  }

  _updateLineCacheOnInsert(offset, text) {
    if (this._linesCache && this._lineOffsets && !text.includes('\n')) {
      const pos = this.offsetToPosition(offset);
      const oldLine = this._linesCache[pos.line] || '';
      this._linesCache[pos.line] = oldLine.slice(0, pos.col) + text + oldLine.slice(pos.col);
      for (let i = pos.line + 1; i < this._lineOffsets.length; i++) {
        this._lineOffsets[i] += text.length;
      }
      this._version++;
    } else {
      this._invalidate();
    }
  }

  _updateLineCacheOnDelete(offset, length, deletedText) {
    if (this._linesCache && this._lineOffsets && !deletedText.includes('\n')) {
      const pos = this.offsetToPosition(offset);
      const oldLine = this._linesCache[pos.line] || '';
      this._linesCache[pos.line] = oldLine.slice(0, pos.col) + oldLine.slice(pos.col + length);
      for (let i = pos.line + 1; i < this._lineOffsets.length; i++) {
        this._lineOffsets[i] -= length;
      }
      this._version++;
    } else {
      this._invalidate();
    }
  }

  /**
   * Insert text at character offset.
   *
   * @param {number} offset
   * @param {string} text
   */
  insert(offset, text) {
    if (!text) return;
    offset = Math.max(0, Math.min(offset, this._length));

    const addStart = this.add.length;
    this.add += text;
    const newPiece = {
      buf: 'add',
      start: addStart,
      len: text.length,
      lines: this._countLines(text)
    };

    if (this.pieces.length === 0) {
      this.pieces.push(newPiece);
      this._length = text.length;
      this._updateLineCacheOnInsert(offset, text);
      return;
    }

    let curOffset = 0;
    let idx = 0;

    while (idx < this.pieces.length) {
      const p = this.pieces[idx];
      const nextOffset = curOffset + p.len;

      if (offset === curOffset) {
        // Insert right before piece
        this.pieces.splice(idx, 0, newPiece);
        this._length += text.length;
        this._updateLineCacheOnInsert(offset, text);
        return;
      }

      if (offset > curOffset && offset < nextOffset) {
        // Split piece into left and right
        const leftLen = offset - curOffset;
        const rightLen = p.len - leftLen;

        const leftText = this._getPieceText(p, 0, leftLen);
        const rightText = this._getPieceText(p, leftLen, rightLen);

        const leftPiece = {
          buf: p.buf,
          start: p.start,
          len: leftLen,
          lines: this._countLines(leftText)
        };
        const rightPiece = {
          buf: p.buf,
          start: p.start + leftLen,
          len: rightLen,
          lines: this._countLines(rightText)
        };

        this.pieces.splice(idx, 1, leftPiece, newPiece, rightPiece);
        this._length += text.length;
        this._updateLineCacheOnInsert(offset, text);
        return;
      }

      curOffset = nextOffset;
      idx++;
    }

    // Insert at end
    this.pieces.push(newPiece);
    this._length += text.length;
    this._updateLineCacheOnInsert(offset, text);
  }

  /**
   * Delete length characters starting at offset.
   *
   * @param {number} offset
   * @param {number} length
   */
  delete(offset, length) {
    if (length <= 0 || this._length === 0) return;
    offset = Math.max(0, Math.min(offset, this._length));
    length = Math.min(length, this._length - offset);
    if (length <= 0) return;

    const deletedText = this.getSlice(offset, length);
    const delEnd = offset + length;
    const newPieces = [];
    let curOffset = 0;

    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      const pStart = curOffset;
      const pEnd = curOffset + p.len;
      curOffset = pEnd;

      if (pEnd <= offset || pStart >= delEnd) {
        // Completely outside deletion range
        newPieces.push(p);
      } else {
        // Intersects deletion range
        if (pStart < offset) {
          // Keep left part
          const keepLen = offset - pStart;
          const keepText = this._getPieceText(p, 0, keepLen);
          newPieces.push({
            buf: p.buf,
            start: p.start,
            len: keepLen,
            lines: this._countLines(keepText)
          });
        }
        if (pEnd > delEnd) {
          // Keep right part
          const skipLen = delEnd - pStart;
          const keepLen = pEnd - delEnd;
          const keepText = this._getPieceText(p, skipLen, keepLen);
          newPieces.push({
            buf: p.buf,
            start: p.start + skipLen,
            len: keepLen,
            lines: this._countLines(keepText)
          });
        }
      }
    }

    this.pieces = newPieces;
    this._length -= length;
    this._updateLineCacheOnDelete(offset, length, deletedText);
  }

  _getPieceText(p, relStart, len) {
    const s = p.start + relStart;
    const e = s + len;
    return p.buf === 'orig' ? this.orig.slice(s, e) : this.add.slice(s, e);
  }

  /**
   * Get entire buffer as string.
   *
   * @returns {string}
   */
  getText() {
    let out = '';
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      out += p.buf === 'orig'
        ? this.orig.slice(p.start, p.start + p.len)
        : this.add.slice(p.start, p.start + p.len);
    }
    return out;
  }

  /**
   * Get slice of text.
   *
   * @param {number} start
   * @param {number} length
   * @returns {string}
   */
  getSlice(start, length) {
    if (length <= 0 || this._length === 0) return '';
    start = Math.max(0, Math.min(start, this._length));
    length = Math.min(length, this._length - start);
    if (length <= 0) return '';

    const end = start + length;
    let curOffset = 0;
    let out = '';

    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      const pEnd = curOffset + p.len;

      if (pEnd > start && curOffset < end) {
        const segStart = Math.max(0, start - curOffset);
        const segEnd = Math.min(p.len, end - curOffset);
        out += this._getPieceText(p, segStart, segEnd - segStart);
      }

      curOffset = pEnd;
      if (curOffset >= end) break;
    }

    return out;
  }

  /**
   * Rebuild lines array and starting offsets cache.
   */
  _buildLineCache() {
    this._linesCache = this.getText().split('\n');
    this._lineOffsets = new Array(this._linesCache.length);
    let cur = 0;
    for (let i = 0; i < this._linesCache.length; i++) {
      this._lineOffsets[i] = cur;
      cur += this._linesCache[i].length + 1;
    }
  }

  /**
   * Get all lines as array of strings (cached).
   *
   * @returns {string[]}
   */
  getLines() {
    if (!this._linesCache) {
      this._buildLineCache();
    }
    return this._linesCache;
  }

  _getLineOffsets() {
    if (!this._linesCache || !this._lineOffsets) {
      this._buildLineCache();
    }
    return this._lineOffsets;
  }

  /**
   * Get total number of lines (at least 1).
   *
   * @returns {number}
   */
  getLineCount() {
    return this.getLines().length;
  }

  /**
   * Get text of a specific line (0-indexed).
   *
   * @param {number} lineIndex
   * @returns {string}
   */
  getLine(lineIndex) {
    const lines = this.getLines();
    if (lineIndex < 0 || lineIndex >= lines.length) return '';
    return lines[lineIndex];
  }

  /**
   * Convert character offset to 0-based { line, col }.
   *
   * @param {number} offset
   * @returns {{ line: number, col: number }}
   */
  offsetToPosition(offset) {
    offset = Math.max(0, Math.min(offset, this._length));
    const offsets = this._getLineOffsets();

    let low = 0;
    let high = offsets.length - 1;
    let line = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (offsets[mid] <= offset) {
        line = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const col = offset - offsets[line];
    return { line, col };
  }

  /**
   * Convert 0-based { line, col } to character offset.
   *
   * @param {number} line
   * @param {number} col
   * @returns {number}
   */
  positionToOffset(line, col) {
    const lines = this.getLines();
    const offsets = this._getLineOffsets();
    line = Math.max(0, Math.min(line, lines.length - 1));
    const lineText = lines[line] || '';
    col = Math.max(0, Math.min(col, lineText.length));
    return offsets[line] + col;
  }

  /**
   * Clone table state for fast undo snapshot or branching.
   *
   * @returns {PieceTable}
   */
  clone() {
    const copy = new PieceTable();
    copy.orig = this.orig;
    copy.add = this.add;
    copy.pieces = this.pieces.map(p => ({ ...p }));
    copy._length = this._length;
    copy._version = this._version;
    return copy;
  }
}
