import path from 'node:path';
import fs from 'node:fs';
import { PieceTable } from './piece-table.js';
import { HistoryManager } from './history.js';
import { SearchEngine } from './search.js';
import { getLeadingWhitespace, getCommentSyntax, checkIndentationHealth } from './indent.js';
import { getGraphemes, stringWidth } from '../terminal/unicode.js';

export class TextBuffer {
  /**
   * @param {string} [initialText='']
   * @param {string} [filePath='untitled']
   */
  constructor(initialText = '', filePath = 'untitled') {
    this.table = new PieceTable(initialText);
    this.history = new HistoryManager();
    this.filePath = filePath;
    this.fileName = path.basename(filePath);
    this.language = this.detectLanguage(filePath);

    // Cursor position in (0-based) text coordinates
    this.cursor = { line: 0, col: 0 };
    // Preferred visual column when moving up/down across lines of different lengths
    this.preferredCol = 0;

    // Selection
    this.selectionAnchor = null; // { line, col } or null when no selection
    this.isSelecting = false;

    // Display options
    this.tabSize = 2;
    this.softWrap = false;
    this.readOnly = false;
    this.showLineNumbers = true;
    this.relativeLineNumbers = false;
    this.showIndentGuides = true;

    // Scroll viewport offsets
    this.scrollRow = 0;
    this.scrollCol = 0;

    // Last modified time for external modification detection
    this.lastMtimeMs = 0;
    this.recoveryFilePath = null;
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.liq': return 'liq';
      case '.js':
      case '.mjs':
      case '.cjs': return 'javascript';
      case '.ts':
      case '.mts':
      case '.cts': return 'typescript';
      case '.jsx': return 'javascript';
      case '.tsx': return 'typescript';
      case '.json': return 'json';
      case '.css': return 'css';
      case '.html':
      case '.htm': return 'html';
      case '.md':
      case '.markdown': return 'markdown';
      case '.sh':
      case '.bash': return 'shell';
      case '.py': return 'python';
      case '.yml':
      case '.yaml': return 'yaml';
      default: return 'plaintext';
    }
  }

  get length() {
    return this.table.length;
  }

  get cursorLine() {
    return this.cursor.line;
  }

  get cursorCol() {
    return this.cursor.col;
  }

  get lineCount() {
    return this.table.getLineCount();
  }

  getLine(idx) {
    return this.table.getLine(idx);
  }

  getLines() {
    return this.table.getLines();
  }

  getText() {
    return this.table.getText();
  }

  isDirty() {
    return this.history.isDirty();
  }

  // --- Selection handling ---

  hasSelection() {
    if (!this.selectionAnchor) return false;
    return this.selectionAnchor.line !== this.cursor.line || this.selectionAnchor.col !== this.cursor.col;
  }

  clearSelection() {
    this.selectionAnchor = null;
  }

  startSelection() {
    if (!this.selectionAnchor) {
      this.selectionAnchor = { ...this.cursor };
    }
  }

  getSelectionRange() {
    if (!this.hasSelection()) return null;
    const a = this.selectionAnchor;
    const b = this.cursor;

    if (a.line < b.line || (a.line === b.line && a.col <= b.col)) {
      return { start: { ...a }, end: { ...b } };
    }
    return { start: { ...b }, end: { ...a } };
  }

  getSelectedText() {
    const range = this.getSelectionRange();
    if (!range) return '';

    const startOff = this.table.positionToOffset(range.start.line, range.start.col);
    const endOff = this.table.positionToOffset(range.end.line, range.end.col);
    return this.table.getSlice(startOff, endOff - startOff);
  }

  deleteSelection() {
    const range = this.getSelectionRange();
    if (!range) return false;

    const startOff = this.table.positionToOffset(range.start.line, range.start.col);
    const endOff = this.table.positionToOffset(range.end.line, range.end.col);
    const len = endOff - startOff;

    if (len > 0) {
      const deletedText = this.table.getSlice(startOff, len);
      this.table.delete(startOff, len);
      this.history.record('delete', startOff, deletedText, { ...this.cursor }, { ...range.start });
      this.cursor = { ...range.start };
      this.preferredCol = this.cursor.col;
    }

    this.clearSelection();
    return true;
  }

  selectAll() {
    this.selectionAnchor = { line: 0, col: 0 };
    const lastLine = Math.max(0, this.lineCount - 1);
    const lastCol = this.getLine(lastLine).length;
    this.cursor = { line: lastLine, col: lastCol };
    this.preferredCol = lastCol;
  }

  // --- Cursor movement ---

  setCursor(line, col, keepSelection = false) {
    if (keepSelection) {
      this.startSelection();
    } else {
      this.clearSelection();
    }

    const maxLine = Math.max(0, this.lineCount - 1);
    this.cursor.line = Math.max(0, Math.min(line, maxLine));
    const lineLen = (this.getLine(this.cursor.line) || '').length;
    this.cursor.col = Math.max(0, Math.min(col, lineLen));
    this.preferredCol = this.cursor.col;
  }

  moveCursorLeft(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else if (this.hasSelection()) {
      const range = this.getSelectionRange();
      this.cursor = { ...range.start };
      this.clearSelection();
      this.preferredCol = this.cursor.col;
      return;
    }

    if (this.cursor.col > 0) {
      // Step back by one grapheme
      const lineText = this.getLine(this.cursor.line);
      const graphemes = getGraphemes(lineText.slice(0, this.cursor.col));
      const lastG = graphemes[graphemes.length - 1];
      this.cursor.col -= (lastG ? lastG.length : 1);
    } else if (this.cursor.line > 0) {
      this.cursor.line--;
      this.cursor.col = this.getLine(this.cursor.line).length;
    }
    this.preferredCol = this.cursor.col;
  }

  moveCursorRight(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else if (this.hasSelection()) {
      const range = this.getSelectionRange();
      this.cursor = { ...range.end };
      this.clearSelection();
      this.preferredCol = this.cursor.col;
      return;
    }

    const lineText = this.getLine(this.cursor.line);
    if (this.cursor.col < lineText.length) {
      // Step forward by one grapheme
      const remaining = lineText.slice(this.cursor.col);
      const graphemes = getGraphemes(remaining);
      const nextG = graphemes[0];
      this.cursor.col += (nextG ? nextG.length : 1);
    } else if (this.cursor.line < this.lineCount - 1) {
      this.cursor.line++;
      this.cursor.col = 0;
    }
    this.preferredCol = this.cursor.col;
  }

  moveCursorUp(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else this.clearSelection();

    if (this.cursor.line > 0) {
      this.cursor.line--;
      const lineLen = this.getLine(this.cursor.line).length;
      this.cursor.col = Math.min(this.preferredCol, lineLen);
    }
  }

  moveCursorDown(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else this.clearSelection();

    if (this.cursor.line < this.lineCount - 1) {
      this.cursor.line++;
      const lineLen = this.getLine(this.cursor.line).length;
      this.cursor.col = Math.min(this.preferredCol, lineLen);
    }
  }

  moveCursorToLineStart(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else this.clearSelection();

    const lineText = this.getLine(this.cursor.line);
    const leadingWs = getLeadingWhitespace(lineText).length;

    // Toggle between first non-whitespace character and col 0
    if (this.cursor.col === leadingWs) {
      this.cursor.col = 0;
    } else {
      this.cursor.col = leadingWs;
    }
    this.preferredCol = this.cursor.col;
  }

  moveCursorToLineEnd(keepSelection = false) {
    if (keepSelection) this.startSelection();
    else this.clearSelection();

    this.cursor.col = this.getLine(this.cursor.line).length;
    this.preferredCol = this.cursor.col;
  }

  // --- Text editing primitives ---

  insertText(text) {
    if (this.readOnly || !text) return;

    if (this.hasSelection()) {
      this.deleteSelection();
    }

    const curPos = { ...this.cursor };
    const offset = this.table.positionToOffset(this.cursor.line, this.cursor.col);
    this.table.insert(offset, text);

    const nextOffset = offset + text.length;
    const nextPos = this.table.offsetToPosition(nextOffset);
    this.cursor = { ...nextPos };
    this.preferredCol = this.cursor.col;

    this.history.record('insert', offset, text, curPos, nextPos);
  }

  deleteChar(direction = 'back') {
    if (this.readOnly) return;

    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    if (direction === 'back') {
      if (this.cursor.col === 0 && this.cursor.line === 0) return;

      const curPos = { ...this.cursor };
      let delOffset = 0;
      let delLen = 0;

      if (this.cursor.col > 0) {
        // Delete previous grapheme cluster
        const lineText = this.getLine(this.cursor.line);
        const graphemes = getGraphemes(lineText.slice(0, this.cursor.col));
        const lastG = graphemes[graphemes.length - 1];
        delLen = lastG ? lastG.length : 1;
        delOffset = this.table.positionToOffset(this.cursor.line, this.cursor.col - delLen);
      } else {
        // Delete newline merging with previous line
        delOffset = this.table.positionToOffset(this.cursor.line, 0) - 1;
        delLen = 1;
      }

      const deletedText = this.table.getSlice(delOffset, delLen);
      this.table.delete(delOffset, delLen);

      const nextPos = this.table.offsetToPosition(delOffset);
      this.cursor = { ...nextPos };
      this.preferredCol = this.cursor.col;

      this.history.record('delete', delOffset, deletedText, curPos, nextPos);
    } else {
      // Forward delete
      const offset = this.table.positionToOffset(this.cursor.line, this.cursor.col);
      if (offset >= this.table.length) return;

      const lineText = this.getLine(this.cursor.line);
      let delLen = 1;
      if (this.cursor.col < lineText.length) {
        const remaining = lineText.slice(this.cursor.col);
        const graphemes = getGraphemes(remaining);
        delLen = graphemes[0] ? graphemes[0].length : 1;
      }

      const curPos = { ...this.cursor };
      const deletedText = this.table.getSlice(offset, delLen);
      this.table.delete(offset, delLen);

      this.history.record('delete', offset, deletedText, curPos, curPos);
    }
  }

  // --- Smart Indentation & Language Operations ---

  smartEnter() {
    if (this.readOnly) return;
    const lineText = this.getLine(this.cursor.line);
    const beforeCursor = lineText.slice(0, this.cursor.col);
    const currentIndent = getLeadingWhitespace(beforeCursor);

    let extraIndent = '';
    const trimmedBefore = beforeCursor.trim();

    // In .liq or JS/TS: increase indent after opening brace or Liquid blocks
    if (
      trimmedBefore.endsWith('{') ||
      trimmedBefore.endsWith('(') ||
      trimmedBefore.endsWith('[') ||
      trimmedBefore.startsWith('if ') ||
      trimmedBefore.startsWith('else') ||
      trimmedBefore.startsWith('each ') ||
      trimmedBefore.startsWith('--- logic') ||
      trimmedBefore.startsWith('--- style') ||
      trimmedBefore.startsWith('--- ui') ||
      (this.language === 'liq' && /^[a-zA-Z0-9_#.-]+$/.test(trimmedBefore))
    ) {
      extraIndent = '  ';
    }

    this.insertText('\n' + currentIndent + extraIndent);
  }

  smartBackspace() {
    if (this.readOnly) return;
    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    const lineText = this.getLine(this.cursor.line);
    const beforeCursor = lineText.slice(0, this.cursor.col);

    // If cursor is on leading spaces and at an indent boundary (multiple of 2), dedent by 2 spaces
    if (/^[ ]+$/.test(beforeCursor) && this.cursor.col >= 2) {
      const dedentLen = this.cursor.col % 2 === 0 ? 2 : 1;
      const offset = this.table.positionToOffset(this.cursor.line, this.cursor.col - dedentLen);
      const curPos = { ...this.cursor };
      this.table.delete(offset, dedentLen);
      this.cursor.col -= dedentLen;
      this.preferredCol = this.cursor.col;
      this.history.record('delete', offset, ' '.repeat(dedentLen), curPos, { ...this.cursor });
      return;
    }

    this.deleteChar('back');
  }

  indentSelection(dedent = false) {
    if (this.readOnly) return;

    const range = this.getSelectionRange();
    const startLine = range ? range.start.line : this.cursor.line;
    const endLine = range ? range.end.line : this.cursor.line;

    for (let l = startLine; l <= endLine; l++) {
      const lineText = this.getLine(l);
      const lineStartOff = this.table.positionToOffset(l, 0);

      if (!dedent) {
        // Add 2 spaces
        this.table.insert(lineStartOff, '  ');
        this.history.record('insert', lineStartOff, '  ', { line: l, col: 0 }, { line: l, col: 2 });
      } else {
        // Remove up to 2 leading spaces
        let removeCount = 0;
        if (lineText.startsWith('  ')) removeCount = 2;
        else if (lineText.startsWith(' ') || lineText.startsWith('\t')) removeCount = 1;

        if (removeCount > 0) {
          const removed = lineText.slice(0, removeCount);
          this.table.delete(lineStartOff, removeCount);
          this.history.record('delete', lineStartOff, removed, { line: l, col: removeCount }, { line: l, col: 0 });
        }
      }
    }

    // Adjust cursor position
    if (range) {
      const shift = dedent ? -2 : 2;
      this.cursor.col = Math.max(0, this.cursor.col + shift);
      if (this.selectionAnchor) {
        this.selectionAnchor.col = Math.max(0, this.selectionAnchor.col + shift);
      }
    } else {
      this.cursor.col = Math.max(0, this.cursor.col + (dedent ? -2 : 2));
    }
    this.preferredCol = this.cursor.col;
  }

  moveLine(direction = 1) {
    if (this.readOnly) return;
    const targetLine = this.cursor.line + direction;
    if (targetLine < 0 || targetLine >= this.lineCount) return;

    const curLine = this.cursor.line;
    const lines = this.getLines();
    const currentText = lines[curLine];
    const targetText = lines[targetLine];

    // Swap lines
    const minLine = Math.min(curLine, targetLine);
    const startOffset = this.table.positionToOffset(minLine, 0);
    const totalLen = currentText.length + targetText.length + 1; // +1 for newline between them

    const newCombined = direction > 0
      ? `${targetText}\n${currentText}`
      : `${currentText}\n${targetText}`;

    const oldSlice = this.table.getSlice(startOffset, totalLen);
    this.table.delete(startOffset, totalLen);
    this.table.insert(startOffset, newCombined);

    this.cursor.line = targetLine;
    this.history.record('delete', startOffset, oldSlice, { line: curLine, col: this.cursor.col }, { line: targetLine, col: this.cursor.col });
    this.history.record('insert', startOffset, newCombined, { line: curLine, col: this.cursor.col }, { line: targetLine, col: this.cursor.col });
  }

  duplicateLine() {
    if (this.readOnly) return;
    const lineText = this.getLine(this.cursor.line);
    const offset = this.table.positionToOffset(this.cursor.line, lineText.length);
    this.table.insert(offset, '\n' + lineText);

    this.history.record('insert', offset, '\n' + lineText, { ...this.cursor }, { line: this.cursor.line + 1, col: this.cursor.col });
    this.cursor.line++;
  }

  toggleComment() {
    if (this.readOnly) return;
    const comment = getCommentSyntax(this.language);
    const range = this.getSelectionRange();
    const startLine = range ? range.start.line : this.cursor.line;
    const endLine = range ? range.end.line : this.cursor.line;

    // Check if all lines are commented
    let allCommented = true;
    for (let l = startLine; l <= endLine; l++) {
      const line = this.getLine(l).trim();
      if (line.length > 0 && !line.startsWith(comment.line)) {
        allCommented = false;
        break;
      }
    }

    for (let l = startLine; l <= endLine; l++) {
      const lineText = this.getLine(l);
      const ws = getLeadingWhitespace(lineText);
      const lineOffset = this.table.positionToOffset(l, 0);

      if (allCommented) {
        // Uncomment
        const rest = lineText.slice(ws.length);
        if (rest.startsWith(comment.line)) {
          let remLen = comment.line.length;
          if (rest[remLen] === ' ') remLen++;
          this.table.delete(lineOffset + ws.length, remLen);
        }
      } else {
        // Comment
        const prefix = comment.line + ' ';
        this.table.insert(lineOffset + ws.length, prefix);
      }
    }
  }

  // --- Auto-close pairs ---

  handleAutoClosePair(char) {
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    const closingChars = new Set([')', ']', '}', '"', "'", '`']);

    // If typing a closing char and next char is that closing char, step over it
    if (closingChars.has(char)) {
      const line = this.getLine(this.cursor.line) || '';
      if (line[this.cursor.col] === char) {
        this.moveCursorRight();
        return true;
      }
    }

    if (pairs[char]) {
      this.insertText(char + pairs[char]);
      this.moveCursorLeft();
      return true;
    }
    return false;
  }

  undo() {
    if (this.readOnly) return null;
    const pos = this.history.undo(this.table);
    if (pos) {
      this.cursor = { ...pos };
      this.preferredCol = this.cursor.col;
      this.clearSelection();
    }
    return pos;
  }

  redo() {
    if (this.readOnly) return null;
    const pos = this.history.redo(this.table);
    if (pos) {
      this.cursor = { ...pos };
      this.preferredCol = this.cursor.col;
      this.clearSelection();
    }
    return pos;
  }

  // --- File I/O & Safety ---

  static loadFromFile(filePath) {
    const absPath = path.resolve(filePath);
    let content = '';
    let mtime = 0;

    if (fs.existsSync(absPath)) {
      content = fs.readFileSync(absPath, 'utf8');
      const stats = fs.statSync(absPath);
      mtime = stats.mtimeMs;
    }

    const buf = new TextBuffer(content, absPath);
    buf.lastMtimeMs = mtime;
    buf.history.markSaved();
    return buf;
  }

  save(targetPath = this.filePath) {
    const absPath = path.resolve(targetPath);
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const text = this.getText();
    const tmpPath = `${absPath}.tmp.${Date.now()}`;

    // Atomic write: write to temp file then rename
    fs.writeFileSync(tmpPath, text, 'utf8');
    fs.renameSync(tmpPath, absPath);

    this.filePath = absPath;
    this.fileName = path.basename(absPath);
    this.language = this.detectLanguage(absPath);

    const stats = fs.statSync(absPath);
    this.lastMtimeMs = stats.mtimeMs;
    this.history.markSaved();

    // Clean up recovery file if any
    if (this.recoveryFilePath && fs.existsSync(this.recoveryFilePath)) {
      try { fs.unlinkSync(this.recoveryFilePath); } catch {}
      this.recoveryFilePath = null;
    }

    return true;
  }

  saveRecovery(recoveryDir) {
    if (!this.isDirty()) return;
    if (!fs.existsSync(recoveryDir)) {
      fs.mkdirSync(recoveryDir, { recursive: true });
    }
    const safeName = this.filePath.replace(/[^a-zA-Z0-9_-]/g, '_');
    const recFile = path.join(recoveryDir, `${safeName}.recovery~`);
    fs.writeFileSync(recFile, this.getText(), 'utf8');
    this.recoveryFilePath = recFile;
  }
}
