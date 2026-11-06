/**
 * File Explorer Sidebar
 * Responsive tree view with collapsible folders, file icons, touch selection,
 * and auto-hide overlay behavior on narrow mobile screens.
 */

import fs from 'node:fs';
import path from 'node:path';
import { truncateToWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_DIM } from '../terminal/screen.js';

export class Sidebar {
  /**
   * @param {string} rootDir
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(rootDir, theme) {
    this.rootDir = path.resolve(rootDir);
    this.theme = theme;
    this.visible = false;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.width = 22; // default docked width

    this.expandedDirs = new Set([this.rootDir]);
    this.entries = []; // Flat list of visible tree nodes
    this.refresh();
  }

  toggle() {
    this.visible = !this.visible;
    if (this.visible) this.refresh();
  }

  show() {
    this.visible = true;
    this.refresh();
  }

  hide() {
    this.visible = false;
  }

  refresh() {
    this.entries = [];
    this._readDirRecursive(this.rootDir, 0);
    if (this.selectedIndex >= this.entries.length) {
      this.selectedIndex = Math.max(0, this.entries.length - 1);
    }
  }

  _readDirRecursive(dirPath, depth) {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const item of items) {
        if (item.name.startsWith('.') && item.name !== '.liq' && item.name !== '.editorconfig') continue;
        if (item.name === 'node_modules' || item.name === 'dist') continue;

        const fullPath = path.join(dirPath, item.name);
        const isDir = item.isDirectory();
        const isExpanded = this.expandedDirs.has(fullPath);

        this.entries.push({
          name: item.name,
          fullPath,
          isDir,
          isExpanded,
          depth
        });

        if (isDir && isExpanded) {
          this._readDirRecursive(fullPath, depth + 1);
        }
      }
    } catch {}
  }

  getFileIcon(entry) {
    if (entry.isDir) {
      return entry.isExpanded ? '📂 ' : '📁 ';
    }
    const ext = path.extname(entry.name).toLowerCase();
    switch (ext) {
      case '.liq': return '🫟 ';
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx': return '📄 ';
      case '.json': return '⚙️ ';
      case '.css': return '🎨 ';
      case '.html': return '🌐 ';
      case '.md': return '📝 ';
      default: return '  ';
    }
  }

  handleKey(key, editor) {
    if (!this.visible) return false;

    if (key.name === 'escape') {
      this.hide();
      return true;
    }

    if (key.name === 'up') {
      if (this.entries.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      }
      return true;
    }

    if (key.name === 'down') {
      if (this.entries.length > 0) {
        this.selectedIndex = Math.min(this.entries.length - 1, this.selectedIndex + 1);
      }
      return true;
    }

    if (key.name === 'enter' || key.name === 'right') {
      const entry = this.entries[this.selectedIndex];
      if (!entry) return true;

      if (entry.isDir) {
        if (this.expandedDirs.has(entry.fullPath)) {
          if (key.name === 'left' || key.name === 'enter') {
            this.expandedDirs.delete(entry.fullPath);
          }
        } else {
          this.expandedDirs.add(entry.fullPath);
        }
        this.refresh();
      } else {
        editor.openFile(entry.fullPath);
        // On narrow mobile screens, auto-hide sidebar on selection
        if (editor.screen.cols < 60) {
          this.hide();
        }
      }
      return true;
    }

    if (key.name === 'left') {
      const entry = this.entries[this.selectedIndex];
      if (entry && entry.isDir && this.expandedDirs.has(entry.fullPath)) {
        this.expandedDirs.delete(entry.fullPath);
        this.refresh();
        return true;
      }
    }

    return false;
  }

  handleClick(row, col, editor, topRow = 2, maxRow = editor.screen.rows - 2) {
    if (!this.visible) return false;
    const effectiveWidth = editor.screen.cols < 60 ? Math.floor(editor.screen.cols * 0.8) : this.width;

    if (col >= effectiveWidth) {
      // Tap outside overlay closes it on mobile
      if (editor.screen.cols < 60) {
        this.hide();
        return true;
      }
      return false;
    }

    // Header row
    if (row === topRow) return true;

    const entryIdx = this.scrollOffset + (row - topRow - 1);
    if (entryIdx >= 0 && entryIdx < this.entries.length) {
      this.selectedIndex = entryIdx;
      const entry = this.entries[entryIdx];
      if (entry.isDir) {
        if (this.expandedDirs.has(entry.fullPath)) {
          this.expandedDirs.delete(entry.fullPath);
        } else {
          this.expandedDirs.add(entry.fullPath);
        }
        this.refresh();
      } else {
        editor.openFile(entry.fullPath);
        if (editor.screen.cols < 60) {
          this.hide();
        }
      }
      return true;
    }

    return true;
  }

  render(screen, topRow = 2, bottomRow = screen.rows - 2) {
    if (!this.visible) return;

    const isNarrow = screen.cols < 60;
    const effectiveWidth = isNarrow ? Math.floor(screen.cols * 0.8) : this.width;
    const bg = this.theme.sidebarBg;
    const fg = this.theme.sidebarFg;
    const selectedBg = this.theme.sidebarSelectedBg;
    const selectedFg = this.theme.sidebarSelectedFg;
    const borderFg = this.theme.paletteBorder;

    // Header row
    screen.writeString(topRow, 0, ' '.repeat(effectiveWidth), fg, bg);
    screen.writeString(topRow, 1, 'EXPLORER', this.theme.accent, bg, ATTR_BOLD);
    screen.writeString(topRow, effectiveWidth - 1, '│', borderFg, bg);

    const visibleRows = bottomRow - topRow - 1;

    // Adjust scroll
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + visibleRows) {
      this.scrollOffset = this.selectedIndex - visibleRows + 1;
    }

    for (let i = 0; i < visibleRows; i++) {
      const row = topRow + 1 + i;
      const entryIdx = this.scrollOffset + i;

      screen.writeString(row, 0, ' '.repeat(effectiveWidth), fg, bg);

      if (entryIdx < this.entries.length) {
        const entry = this.entries[entryIdx];
        const isSelected = entryIdx === this.selectedIndex;
        const lineBg = isSelected ? selectedBg : bg;
        const lineFg = isSelected ? selectedFg : (entry.isDir ? this.theme.sidebarFolderFg : fg);

        screen.writeString(row, 0, ' '.repeat(effectiveWidth - 1), lineFg, lineBg);

        const indent = ' '.repeat(Math.min(6, entry.depth * 2));
        const icon = this.getFileIcon(entry);
        const prefix = `${indent}${icon}`;
        const availWidth = effectiveWidth - stringWidth(prefix) - 2;
        const name = truncateToWidth(entry.name, availWidth);

        screen.writeString(row, 1, `${prefix}${name}`, lineFg, lineBg, isSelected ? ATTR_BOLD : 0);
      }

      // Vertical separator border
      screen.writeString(row, effectiveWidth - 1, '│', borderFg, bg);
    }
  }
}
