/**
 * Tappable Top Menu Bar and Dropdown System
 */

import { truncateToWidth, padWidth, stringWidth } from '../terminal/unicode.js';
import { ATTR_BOLD, ATTR_INVERSE, ATTR_DIM } from '../terminal/screen.js';

export class MenuBar {
  /**
   * @param {import('../commands.js').CommandRegistry} registry
   * @param {import('../highlight/theme.js').Theme} theme
   */
  constructor(registry, theme) {
    this.registry = registry;
    this.theme = theme;
    this.activeMenu = null; // null or 'File' | 'Edit' | 'Search' | 'View' | 'Liquid' | 'Help'
    this.selectedIndex = 0;

    this.menus = [
      {
        name: 'File',
        items: [
          { id: 'file.new', title: 'New File', keybinding: 'Ctrl+N' },
          { id: 'file.open', title: 'Open File...', keybinding: 'Ctrl+O' },
          { id: 'file.save', title: 'Save', keybinding: 'Ctrl+S' },
          { id: 'file.saveAs', title: 'Save As...', keybinding: 'Ctrl+Shift+S' },
          { id: 'file.close', title: 'Close Tab', keybinding: 'Ctrl+W' },
          { id: 'app.exit', title: 'Exit Editor', keybinding: 'Ctrl+Q' }
        ]
      },
      {
        name: 'Edit',
        items: [
          { id: 'edit.undo', title: 'Undo', keybinding: 'Ctrl+Z' },
          { id: 'edit.redo', title: 'Redo', keybinding: 'Ctrl+Y' },
          { id: 'edit.cut', title: 'Cut', keybinding: 'Ctrl+X' },
          { id: 'edit.copy', title: 'Copy', keybinding: 'Ctrl+C' },
          { id: 'edit.paste', title: 'Paste', keybinding: 'Ctrl+V' },
          { id: 'edit.selectAll', title: 'Select All', keybinding: 'Ctrl+A' },
          { id: 'edit.comment', title: 'Toggle Comment', keybinding: 'Ctrl+/' },
          { id: 'edit.duplicateLine', title: 'Duplicate Line', keybinding: 'Alt+Shift+Down' }
        ]
      },
      {
        name: 'Search',
        items: [
          { id: 'search.find', title: 'Find...', keybinding: 'Ctrl+F' },
          { id: 'search.replace', title: 'Replace...', keybinding: 'Ctrl+H' },
          { id: 'search.gotoLine', title: 'Go to Line...', keybinding: 'Ctrl+G' },
          { id: 'search.gotoSymbol', title: 'Go to Symbol...', keybinding: 'Ctrl+Shift+O' },
          { id: 'workspace.findFile', title: 'Find File...', keybinding: 'Ctrl+P' }
        ]
      },
      {
        name: 'View',
        items: [
          { id: 'view.toggleSidebar', title: 'Toggle Sidebar', keybinding: 'Ctrl+B' },
          { id: 'view.toggleWrap', title: 'Toggle Soft Wrap', keybinding: 'Alt+Z' },
          { id: 'view.toggleTheme', title: 'Toggle Theme (Dark/Light)', keybinding: 'F2' },
          { id: 'view.splitHorizontal', title: 'Split Editor Right', keybinding: 'Ctrl+\\' },
          { id: 'view.closeSplit', title: 'Close Active Split', keybinding: 'Ctrl+K W' }
        ]
      },
      {
        name: 'Liquid',
        items: [
          { id: 'liquid.dev', title: 'Run Dev Server', keybinding: 'F5' },
          { id: 'liquid.stop', title: 'Stop Process', keybinding: 'Shift+F5' },
          { id: 'liquid.build', title: 'Build Project', keybinding: 'Ctrl+Shift+B' },
          { id: 'liquid.check', title: 'Check Diagnostics', keybinding: 'F7' },
          { id: 'liquid.toggleCompiled', title: 'Toggle Compiled Output', keybinding: 'F8' },
          { id: 'liquid.format', title: 'Format .liq Document', keybinding: 'Shift+Alt+F' },
          { id: 'liquid.snippets', title: 'Insert Liquid Snippet...', keybinding: 'Ctrl+Space' }
        ]
      },
      {
        name: 'Help',
        items: [
          { id: 'help.palette', title: 'Command Palette...', keybinding: 'F1' },
          { id: 'help.cheatSheet', title: 'Keyboard Cheat Sheet', keybinding: 'Ctrl+?' },
          { id: 'help.about', title: 'About liquid-edit', keybinding: '' }
        ]
      }
    ];
  }

  isOpen() {
    return this.activeMenu !== null;
  }

  close() {
    this.activeMenu = null;
    this.selectedIndex = 0;
  }

  handleKey(key, editor) {
    if (!this.isOpen()) return false;

    if (key.name === 'escape') {
      this.close();
      return true;
    }

    const currentMenu = this.menus.find(m => m.name === this.activeMenu);
    if (!currentMenu) return false;

    if (key.name === 'up') {
      this.selectedIndex = (this.selectedIndex - 1 + currentMenu.items.length) % currentMenu.items.length;
      return true;
    }

    if (key.name === 'down') {
      this.selectedIndex = (this.selectedIndex + 1) % currentMenu.items.length;
      return true;
    }

    if (key.name === 'left') {
      const curIdx = this.menus.indexOf(currentMenu);
      const prevIdx = (curIdx - 1 + this.menus.length) % this.menus.length;
      this.activeMenu = this.menus[prevIdx].name;
      this.selectedIndex = 0;
      return true;
    }

    if (key.name === 'right') {
      const curIdx = this.menus.indexOf(currentMenu);
      const nextIdx = (curIdx + 1) % this.menus.length;
      this.activeMenu = this.menus[nextIdx].name;
      this.selectedIndex = 0;
      return true;
    }

    if (key.name === 'enter') {
      const item = currentMenu.items[this.selectedIndex];
      this.close();
      if (item && item.id) {
        editor.executeCommand(item.id);
      }
      return true;
    }

    return false;
  }

  handleClick(row, col, editor) {
    // Menu bar is always row 0
    if (row === 0) {
      // Find clicked menu header
      let curCol = 1;
      for (const m of this.menus) {
        const itemWidth = stringWidth(m.name) + 2; // padding
        if (col >= curCol && col < curCol + itemWidth) {
          if (this.activeMenu === m.name) {
            this.close();
          } else {
            this.activeMenu = m.name;
            this.selectedIndex = 0;
          }
          return true;
        }
        curCol += itemWidth + 1;
      }
      this.close();
      return true;
    }

    // Inside open dropdown
    if (this.isOpen()) {
      const currentMenu = this.menus.find(m => m.name === this.activeMenu);
      if (!currentMenu) return false;

      // Find dropdown bounds
      let menuLeft = 1;
      for (const m of this.menus) {
        if (m.name === this.activeMenu) break;
        menuLeft += stringWidth(m.name) + 3;
      }

      const dropdownWidth = 32;
      const dropdownHeight = currentMenu.items.length + 2; // top border + items + bottom border

      if (
        row >= 1 &&
        row < 1 + dropdownHeight &&
        col >= menuLeft &&
        col < menuLeft + dropdownWidth
      ) {
        const itemIdx = row - 2; // row 1 is top border
        if (itemIdx >= 0 && itemIdx < currentMenu.items.length) {
          const item = currentMenu.items[itemIdx];
          this.close();
          if (item && item.id) {
            editor.executeCommand(item.id);
          }
        }
        return true;
      }

      // Click outside dropdown closes it
      this.close();
      return true;
    }

    return false;
  }

  render(screen) {
    const bg = this.theme.menuBarBg;
    const fg = this.theme.menuBarFg;
    const activeBg = this.theme.menuActiveBg;
    const activeFg = this.theme.menuActiveFg;

    // Clear row 0
    screen.writeString(0, 0, ' '.repeat(screen.cols), fg, bg);

    // Brand logo
    screen.writeString(0, 0, ' 🫟', this.theme.accent, bg, ATTR_BOLD);

    let curCol = 4;
    let openMenuLeft = 4;

    for (const m of this.menus) {
      const isActive = this.activeMenu === m.name;
      if (isActive) openMenuLeft = curCol;

      const title = ` ${m.name} `;
      const itemFg = isActive ? activeFg : fg;
      const itemBg = isActive ? activeBg : bg;
      screen.writeString(0, curCol, title, itemFg, itemBg, isActive ? ATTR_BOLD : 0);
      curCol += stringWidth(title);
    }

    // Right side indicator: short help hint
    const hint = screen.cols >= 60 ? 'Tap menu or press F1 for commands ' : 'F1:Cmd ';
    screen.writeString(0, screen.cols - stringWidth(hint), hint, this.theme.paletteCategory, bg, ATTR_DIM);

    // Render open dropdown menu
    if (this.isOpen()) {
      const currentMenu = this.menus.find(m => m.name === this.activeMenu);
      if (currentMenu) {
        const dropdownWidth = Math.min(32, screen.cols - openMenuLeft - 1);
        const dropdownBg = this.theme.paletteBg;
        const dropdownFg = this.theme.paletteFg;
        const borderFg = this.theme.paletteBorder;

        // Top border
        screen.writeString(1, openMenuLeft, '┌' + '─'.repeat(dropdownWidth - 2) + '┐', borderFg, dropdownBg);

        for (let i = 0; i < currentMenu.items.length; i++) {
          const item = currentMenu.items[i];
          const row = 2 + i;
          const isSelected = i === this.selectedIndex;
          const itemBg = isSelected ? this.theme.paletteSelectedBg : dropdownBg;
          const itemFg = isSelected ? this.theme.paletteSelectedFg : dropdownFg;

          // Clear line
          screen.writeString(row, openMenuLeft, '│' + ' '.repeat(dropdownWidth - 2) + '│', borderFg, itemBg);

          // Title
          const title = truncateToWidth(item.title, dropdownWidth - 14);
          screen.writeString(row, openMenuLeft + 2, title, itemFg, itemBg, isSelected ? ATTR_BOLD : 0);

          // Keybinding
          if (item.keybinding) {
            const kbCol = openMenuLeft + dropdownWidth - stringWidth(item.keybinding) - 2;
            screen.writeString(row, kbCol, item.keybinding, this.theme.paletteKeybinding, itemBg, ATTR_DIM);
          }
        }

        // Bottom border
        screen.writeString(2 + currentMenu.items.length, openMenuLeft, '└' + '─'.repeat(dropdownWidth - 2) + '┘', borderFg, dropdownBg);
      }
    }
  }
}
