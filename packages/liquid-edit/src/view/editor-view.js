/**
 * Editor View and Split Pane Renderer
 * Renders syntax-highlighted buffer lines, gutter, line numbers,
 * diagnostic squiggles/markers, indent guides, and selections.
 */

import { truncateToWidth, stringWidth, getGraphemes, graphemeWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_DIM, ATTR_UNDERLINE } from '../terminal/screen.js';

export class EditorView {
  /**
   * @param {import('../highlight/theme.js').Theme} theme
   * @param {import('../highlight/tokenizer.js').SyntaxHighlighter} highlighter
   */
  constructor(theme, highlighter) {
    this.theme = theme;
    this.highlighter = highlighter;
  }

  /**
   * Render an editor pane into a screen region.
   *
   * @param {import('../terminal/screen.js').Screen} screen
   * @param {import('../text/buffer.js').TextBuffer} buffer
   * @param {object} bounds { top, left, width, height }
   * @param {boolean} [isActive=true]
   * @param {Array<object>} [diagnostics=[]]
   */
  renderPane(screen, buffer, bounds, isActive = true, diagnostics = []) {
    const { top, left, width, height } = bounds;
    if (width <= 0 || height <= 0) return;

    const bg = this.theme.editorBg;
    const fg = this.theme.editorFg;
    const lineNrFg = this.theme.lineNrFg;
    const curLineNrFg = this.theme.currentLineNrFg;
    const cursorLineBg = this.theme.cursorLineBg;
    const selectionBg = this.theme.selectionBg;
    const indentGuideFg = this.theme.indentGuideFg;

    // Calculate gutter width
    const totalLines = buffer.lineCount;
    const digits = Math.max(2, String(totalLines).length);
    const gutterWidth = buffer.showLineNumbers ? digits + 3 : 1; // " 1 │ "
    const textWidth = Math.max(1, width - gutterWidth);

    // Keep cursor inside viewport
    if (buffer.cursor.line < buffer.scrollRow) {
      buffer.scrollRow = buffer.cursor.line;
    } else if (buffer.cursor.line >= buffer.scrollRow + height) {
      buffer.scrollRow = buffer.cursor.line - height + 1;
    }

    if (buffer.cursor.col < buffer.scrollCol) {
      buffer.scrollCol = buffer.cursor.col;
    } else if (buffer.cursor.col >= buffer.scrollCol + textWidth) {
      buffer.scrollCol = buffer.cursor.col - textWidth + 1;
    }

    const selectionRange = buffer.getSelectionRange();

    // Map diagnostics by line
    const diagByLine = new Map();
    for (const d of diagnostics) {
      if (!diagByLine.has(d.line)) diagByLine.set(d.line, []);
      diagByLine.get(d.line).push(d);
    }

    for (let r = 0; r < height; r++) {
      const screenRow = top + r;
      const lineIdx = buffer.scrollRow + r;
      const isCursorLine = isActive && lineIdx === buffer.cursor.line;
      const rowBg = isCursorLine ? cursorLineBg : bg;

      // Clear row in pane bounds
      for (let c = 0; c < width; c++) {
        screen.setCell(screenRow, left + c, ' ', fg, rowBg);
      }

      if (lineIdx >= totalLines) {
        // Beyond end of file: draw tilde '~'
        screen.writeString(screenRow, left + 1, '~', lineNrFg, bg, ATTR_DIM);
        continue;
      }

      const lineText = buffer.getLine(lineIdx);
      const lineDiags = diagByLine.get(lineIdx) || [];

      // Render gutter (line number + error marker + separator)
      let gutterText = '';
      let marker = ' ';
      let markerColor = lineNrFg;

      if (lineDiags.length > 0) {
        const hasErr = lineDiags.some(d => d.severity === 'error');
        marker = hasErr ? '✖' : '⚠';
        markerColor = hasErr ? this.theme.errorFg : this.theme.warningFg;
      }

      if (buffer.showLineNumbers) {
        let displayNr = lineIdx + 1;
        if (buffer.relativeLineNumbers && !isCursorLine) {
          displayNr = Math.abs(lineIdx - buffer.cursor.line);
        }
        const nrStr = String(displayNr).padStart(digits, ' ');
        gutterText = `${nrStr} │`;
      } else {
        gutterText = '│';
      }

      screen.writeString(screenRow, left, marker, markerColor, bg, ATTR_BOLD);
      screen.writeString(
        screenRow,
        left + 1,
        gutterText,
        isCursorLine ? curLineNrFg : lineNrFg,
        bg,
        isCursorLine ? ATTR_BOLD : 0
      );

      // Tokenize line for syntax highlighting
      const { tokens } = this.highlighter.tokenizeLine(lineText, buffer.language);

      // Render line text with horizontal scrolling
      let textCol = left + gutterWidth;
      const visibleGraphemes = getGraphemes(lineText);
      let charOffset = 0;
      let tokenIdx = 0;

      for (let gIdx = 0; gIdx < visibleGraphemes.length; gIdx++) {
        const g = visibleGraphemes[gIdx];
        const gLen = g.length;
        const gCol = charOffset;

        charOffset += gLen;

        // Skip chars scrolled off to the left
        if (gCol < buffer.scrollCol) continue;
        const renderCol = textCol + (gCol - buffer.scrollCol);
        if (renderCol >= left + width) break;

        // Advance token index
        while (tokenIdx < tokens.length && gCol >= tokens[tokenIdx].end) {
          tokenIdx++;
        }
        let tokenColor = fg;
        if (tokenIdx < tokens.length && gCol >= tokens[tokenIdx].start) {
          tokenColor = this.theme.syntax[tokens[tokenIdx].type] || fg;
        }

        // Selection styling
        let isSelected = false;
        if (selectionRange) {
          if (lineIdx > selectionRange.start.line && lineIdx < selectionRange.end.line) {
            isSelected = true;
          } else if (lineIdx === selectionRange.start.line && lineIdx === selectionRange.end.line) {
            isSelected = gCol >= selectionRange.start.col && gCol < selectionRange.end.col;
          } else if (lineIdx === selectionRange.start.line) {
            isSelected = gCol >= selectionRange.start.col;
          } else if (lineIdx === selectionRange.end.line) {
            isSelected = gCol < selectionRange.end.col;
          }
        }

        // Diagnostic squiggle on error tokens
        let isErrorUnderline = false;
        if (lineDiags.length > 0) {
          for (const d of lineDiags) {
            if (gCol >= d.col && gCol < d.col + (d.length || 1)) {
              isErrorUnderline = true;
              break;
            }
          }
        }

        const cellBg = isSelected ? selectionBg : rowBg;
        let attrs = 0;
        if (isErrorUnderline) attrs |= ATTR_UNDERLINE;

        screen.setCell(screenRow, renderCol, g, isErrorUnderline ? this.theme.errorFg : tokenColor, cellBg, attrs);
      }

      // Indent guides for empty leading spaces
      if (buffer.showIndentGuides && lineText.startsWith('  ')) {
        for (let ic = 0; ic < lineText.length; ic += 2) {
          if (lineText.slice(ic, ic + 2) !== '  ') break;
          const guideCol = textCol + (ic - buffer.scrollCol);
          if (guideCol >= textCol && guideCol < left + width) {
            const cell = screen.back[screenRow][guideCol];
            if (cell.char === ' ') {
              cell.char = '┊';
              cell.fg = indentGuideFg;
            }
          }
        }
      }
    }

    // Set hardware cursor position if active pane
    if (isActive) {
      const curScreenRow = top + (buffer.cursor.line - buffer.scrollRow);
      const curScreenCol = left + gutterWidth + (buffer.cursor.col - buffer.scrollCol);
      if (
        curScreenRow >= top &&
        curScreenRow < top + height &&
        curScreenCol >= left + gutterWidth &&
        curScreenCol < left + width
      ) {
        screen.setCursorPosition(curScreenRow, curScreenCol, true, 2);
      } else {
        screen.showCursor = false;
      }
    }
  }
}
