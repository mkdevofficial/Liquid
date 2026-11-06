/**
 * Undo / Redo History Manager
 * Supports typing burst coalescing and transaction grouping.
 */

export class HistoryManager {
  /**
   * @param {number} [maxHistory=1000]
   * @param {number} [coalesceTimeoutMs=800]
   */
  constructor(maxHistory = 1000, coalesceTimeoutMs = 800) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
    this.coalesceTimeoutMs = coalesceTimeoutMs;
    this.lastActionTime = 0;
    this.lastActionType = null;
    this.savedVersion = 0;
    this.currentVersion = 0;
  }

  /**
   * Push an edit action onto the undo stack.
   *
   * @param {'insert' | 'delete'} type
   * @param {number} offset
   * @param {string} text
   * @param {{ line: number, col: number }} cursorBefore
   * @param {{ line: number, col: number }} cursorAfter
   */
  record(type, offset, text, cursorBefore, cursorAfter) {
    const now = Date.now();
    this.redoStack.length = 0; // Clear redo on new edit
    this.currentVersion++;

    // Try coalescing single-character typing bursts
    if (
      this.undoStack.length > 0 &&
      this.lastActionType === type &&
      now - this.lastActionTime < this.coalesceTimeoutMs &&
      text.length === 1 &&
      text !== '\n'
    ) {
      const top = this.undoStack[this.undoStack.length - 1];

      if (type === 'insert' && top.type === 'insert') {
        // Appending to previous insertion
        if (top.offset + top.text.length === offset) {
          top.text += text;
          top.cursorAfter = { ...cursorAfter };
          this.lastActionTime = now;
          return;
        }
      } else if (type === 'delete' && top.type === 'delete') {
        // Backspacing previous character
        if (offset + text.length === top.offset) {
          top.text = text + top.text;
          top.offset = offset;
          top.cursorAfter = { ...cursorAfter };
          this.lastActionTime = now;
          return;
        }
      }
    }

    this.undoStack.push({
      type,
      offset,
      text,
      cursorBefore: { ...cursorBefore },
      cursorAfter: { ...cursorAfter },
      timestamp: now
    });

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.lastActionTime = now;
    this.lastActionType = type;
  }

  /**
   * Undo last action on piece table.
   *
   * @param {import('./piece-table.js').PieceTable} table
   * @returns {{ line: number, col: number } | null} New cursor position or null
   */
  undo(table) {
    if (this.undoStack.length === 0) return null;

    const action = this.undoStack.pop();
    this.redoStack.push(action);
    this.currentVersion--;
    this.lastActionType = null; // break coalescing

    if (action.type === 'insert') {
      table.delete(action.offset, action.text.length);
      return action.cursorBefore;
    } else if (action.type === 'delete') {
      table.insert(action.offset, action.text);
      return action.cursorAfter;
    }

    return null;
  }

  /**
   * Redo previously undone action.
   *
   * @param {import('./piece-table.js').PieceTable} table
   * @returns {{ line: number, col: number } | null} New cursor position or null
   */
  redo(table) {
    if (this.redoStack.length === 0) return null;

    const action = this.redoStack.pop();
    this.undoStack.push(action);
    this.currentVersion++;
    this.lastActionType = null;

    if (action.type === 'insert') {
      table.insert(action.offset, action.text);
      return action.cursorAfter;
    } else if (action.type === 'delete') {
      table.delete(action.offset, action.text.length);
      return action.cursorBefore;
    }

    return null;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  markSaved() {
    this.savedVersion = this.currentVersion;
  }

  isDirty() {
    return this.savedVersion !== this.currentVersion;
  }
}
