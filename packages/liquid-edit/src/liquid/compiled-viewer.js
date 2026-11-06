/**
 * Compiled Output Viewer for Liquid Components
 * Compiles the active .liq file live and displays generated JS and extracted CSS.
 */

import { compile } from '@mkdevofficial/liquid-compiler';

export class CompiledViewer {
  constructor() {
    this.visible = false;
    this.mode = 'js'; // 'js' | 'css'
    this.lastCompiledJs = '';
    this.lastCompiledCss = '';
    this.error = null;
  }

  toggle() {
    this.visible = !this.visible;
  }

  update(buffer) {
    if (!this.visible || buffer.language !== 'liq') return;

    try {
      const res = compile(buffer.getText(), { filename: buffer.fileName });
      this.lastCompiledJs = res.code || '// No JS emitted';
      this.lastCompiledCss = res.css || '/* No scoped CSS emitted */';
      this.error = null;
    } catch (err) {
      this.error = err.message || String(err);
    }
  }

  getLines() {
    if (this.error) {
      return [`// Compile Error:`, ...this.error.split('\n')];
    }
    const content = this.mode === 'css' ? this.lastCompiledCss : this.lastCompiledJs;
    return content.split('\n');
  }
}
