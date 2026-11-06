/**
 * Live Liquid Diagnostics Engine
 * Runs liquid-compiler debounced off the typing hot path, extracting
 * compile errors and warnings with exact line and column locations.
 */

import { compile } from '@mkdevofficial/liquid-compiler';
import { checkIndentationHealth } from '../text/indent.js';

export class DiagnosticsEngine {
  constructor() {
    this.timer = null;
    this.debounceMs = 120;
    this.cache = new Map(); // filePath -> Array<Diagnostic>
  }

  /**
   * Run diagnostics on buffer content.
   *
   * @param {import('../text/buffer.js').TextBuffer} buffer
   * @param {(diagnostics: Array<object>) => void} onResult
   */
  check(buffer, onResult) {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (buffer.language !== 'liq') {
      this.cache.set(buffer.filePath, []);
      onResult([]);
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      const diagnostics = this._runCompileCheck(buffer);
      this.cache.set(buffer.filePath, diagnostics);
      onResult(diagnostics);
    }, this.debounceMs);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  _runCompileCheck(buffer) {
    const diagnostics = [];
    const text = buffer.getText();
    const lines = buffer.getLines();

    // 1. First-pass check: Check for tabs in indentation
    const indentHealth = checkIndentationHealth(lines);
    if (indentHealth.hasTabs) {
      for (const lineNr of indentHealth.mixedLines) {
        diagnostics.push({
          line: lineNr - 1, // 0-based
          col: 0,
          length: 2,
          message: 'Tab characters in indentation are rejected by Liquid compiler. Use 2 spaces.',
          severity: 'error',
          source: 'liquid'
        });
      }
    }

    // 2. Full compiler compile pass
    try {
      const result = compile(text, { filename: buffer.fileName });

      // Collect compiler warnings
      if (result.warnings && Array.isArray(result.warnings)) {
        for (const w of result.warnings) {
          diagnostics.push({
            line: Math.max(0, (w.line || 1) - 1),
            col: Math.max(0, (w.column || 1) - 1),
            length: 1,
            message: w.message || String(w),
            severity: 'warning',
            source: 'liquid'
          });
        }
      }
    } catch (err) {
      const line = Math.max(0, (err.line || 1) - 1);
      const col = Math.max(0, (err.column || 1) - 1);
      const cleanMsg = (err.message || String(err))
        .replace(/\x1b\[[0-9;]*m/g, '') // strip ANSI color codes
        .split('\n')[0]
        .replace(/^🫟\s*/, '')
        .trim();

      diagnostics.push({
        line,
        col,
        length: 1,
        message: cleanMsg,
        severity: 'error',
        source: 'liquid'
      });
    }

    return diagnostics;
  }

  get(filePath) {
    return this.cache.get(filePath) || [];
  }
}
