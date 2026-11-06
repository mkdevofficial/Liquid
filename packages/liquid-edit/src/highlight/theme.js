/**
 * Theme Engine for liquid-edit
 * Dark and light color schemes with Truecolor Hex support and 256/16-color degradation.
 */

export const THEME_DARK = {
  name: 'dark',
  editorBg: '#0f172a',
  editorFg: '#e2e8f0',
  lineNrFg: '#475569',
  currentLineNrFg: '#38bdf8',
  cursorLineBg: '#1e293b',
  selectionBg: '#334155',
  indentGuideFg: '#1e293b',

  menuBarBg: '#1e293b',
  menuBarFg: '#cbd5e1',
  menuActiveBg: '#38bdf8',
  menuActiveFg: '#0f172a',

  tabBarBg: '#0b1120',
  tabActiveBg: '#0f172a',
  tabActiveFg: '#38bdf8',
  tabInactiveBg: '#0b1120',
  tabInactiveFg: '#64748b',

  sidebarBg: '#0b1120',
  sidebarFg: '#94a3b8',
  sidebarSelectedBg: '#1e293b',
  sidebarSelectedFg: '#38bdf8',
  sidebarFolderFg: '#38bdf8',

  statusBarBg: '#1e293b',
  statusBarFg: '#94a3b8',
  statusBarAccent: '#38bdf8',

  quickActionBarBg: '#0b1120',
  quickActionBarFg: '#cbd5e1',
  quickActionBorder: '#334155',
  quickActionActiveBg: '#38bdf8',
  quickActionActiveFg: '#0f172a',

  paletteBg: '#1e293b',
  paletteFg: '#f8fafc',
  paletteBorder: '#475569',
  paletteSelectedBg: '#38bdf8',
  paletteSelectedFg: '#0f172a',
  paletteCategory: '#94a3b8',
  paletteKeybinding: '#cbd5e1',

  accent: '#38bdf8',
  errorFg: '#ef4444',
  warningFg: '#f59e0b',
  infoFg: '#3b82f6',

  // Syntax highlighting colors
  syntax: {
    keyword: '#f43f5e',      // rose / red
    tag: '#38bdf8',          // cyan / blue
    component: '#a855f7',    // purple
    attribute: '#fb923c',    // orange
    string: '#4ade80',       // green
    number: '#facc15',       // yellow
    comment: '#64748b',       // slate
    operator: '#94a3b8',      // light gray
    punctuation: '#64748b',   // muted gray
    directive: '#ec4899',     // pink (@event, $bind)
    interpolation: '#38bdf8', // cyan
    sectionHeader: '#fbbf24', // amber (--- logic, --- style, --- ui)
    function: '#60a5fa',      // soft blue
    variable: '#e2e8f0'       // text
  }
};

export const THEME_LIGHT = {
  name: 'light',
  editorBg: '#ffffff',
  editorFg: '#1e293b',
  lineNrFg: '#94a3b8',
  currentLineNrFg: '#0284c7',
  cursorLineBg: '#f1f5f9',
  selectionBg: '#cbd5e1',
  indentGuideFg: '#e2e8f0',

  menuBarBg: '#f8fafc',
  menuBarFg: '#334155',
  menuActiveBg: '#0284c7',
  menuActiveFg: '#ffffff',

  tabBarBg: '#f1f5f9',
  tabActiveBg: '#ffffff',
  tabActiveFg: '#0284c7',
  tabInactiveBg: '#f1f5f9',
  tabInactiveFg: '#64748b',

  sidebarBg: '#f8fafc',
  sidebarFg: '#475569',
  sidebarSelectedBg: '#e2e8f0',
  sidebarSelectedFg: '#0284c7',
  sidebarFolderFg: '#0284c7',

  statusBarBg: '#f1f5f9',
  statusBarFg: '#475569',
  statusBarAccent: '#0284c7',

  quickActionBarBg: '#f8fafc',
  quickActionBarFg: '#334155',
  quickActionBorder: '#cbd5e1',
  quickActionActiveBg: '#0284c7',
  quickActionActiveFg: '#ffffff',

  paletteBg: '#ffffff',
  paletteFg: '#0f172a',
  paletteBorder: '#cbd5e1',
  paletteSelectedBg: '#0284c7',
  paletteSelectedFg: '#ffffff',
  paletteCategory: '#64748b',
  paletteKeybinding: '#475569',

  accent: '#0284c7',
  errorFg: '#dc2626',
  warningFg: '#d97706',
  infoFg: '#2563eb',

  syntax: {
    keyword: '#e11d48',
    tag: '#0284c7',
    component: '#7c3aed',
    attribute: '#ea580c',
    string: '#16a34a',
    number: '#ca8a04',
    comment: '#94a3b8',
    operator: '#64748b',
    punctuation: '#94a3b8',
    directive: '#db2777',
    interpolation: '#0284c7',
    sectionHeader: '#b45309',
    function: '#2563eb',
    variable: '#1e293b'
  }
};

export class ThemeManager {
  constructor(initialTheme = 'dark') {
    this.themes = new Map([
      ['dark', THEME_DARK],
      ['light', THEME_LIGHT]
    ]);
    this.currentThemeName = initialTheme;
  }

  get current() {
    return this.themes.get(this.currentThemeName) || THEME_DARK;
  }

  setTheme(name) {
    if (this.themes.has(name)) {
      this.currentThemeName = name;
      return true;
    }
    return false;
  }

  registerTheme(name, themeObj) {
    this.themes.set(name, { ...THEME_DARK, ...themeObj, name });
  }

  toggle() {
    this.currentThemeName = this.currentThemeName === 'dark' ? 'light' : 'dark';
    return this.current;
  }
}
