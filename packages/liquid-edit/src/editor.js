/**
 * Main liquid-edit TUI Editor Core
 * Phone-first, Termux-friendly terminal code editor with full touch support,
 * deep Liquid diagnostics, live compiled view, and embedded task runner.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { Screen, ATTR_BOLD } from './terminal/screen.js';
import { truncateToWidth } from './terminal/unicode.js';
import { InputParser } from './terminal/input.js';
import { copyToClipboard, getFromClipboard } from './terminal/clipboard.js';
import { TextBuffer } from './text/buffer.js';
import { SearchEngine } from './text/search.js';
import { ThemeManager } from './highlight/theme.js';
import { SyntaxHighlighter } from './highlight/tokenizer.js';
import { CommandRegistry } from './commands.js';
import { ConfigManager } from './config/index.js';
import { WorkspaceManager } from './workspace/index.js';
import { MenuBar } from './view/menu.js';
import { TabBar } from './view/tabs.js';
import { Sidebar } from './view/sidebar.js';
import { StatusBar } from './view/statusbar.js';
import { QuickActionBar } from './view/quickbar.js';
import { CommandPalette } from './view/palette.js';
import { ProblemsPanel } from './view/problems.js';
import { EditorView } from './view/editor-view.js';
import { SplitManager } from './view/splits.js';
import { DiagnosticsEngine } from './liquid/diagnostics.js';
import { TaskRunner } from './liquid/tasks.js';
import { CompiledViewer } from './liquid/compiled-viewer.js';
import { OutlineGenerator } from './liquid/outline.js';
import { LiquidFormatter } from './liquid/formatter.js';
import { LIQUID_SNIPPETS } from './liquid/snippets.js';
import { CompletionEngine } from './liquid/completion.js';

export class Editor {
  /**
   * @param {object} [options={}]
   * @param {string} [options.file]
   * @param {string} [options.projectDir]
   * @param {boolean} [options.virtual=false]
   * @param {number} [options.rows=24]
   * @param {number} [options.cols=80]
   */
  constructor(options = {}) {
    this.virtual = Boolean(options.virtual);
    this.rows = options.rows || (process.stdout?.rows || 24);
    this.cols = options.cols || (process.stdout?.columns || 80);

    this.projectDir = options.projectDir || process.cwd();
    this.config = new ConfigManager(this.projectDir);
    this.workspace = new WorkspaceManager(this.projectDir);
    this.themeManager = new ThemeManager(this.config.get('theme') || 'dark');
    this.highlighter = new SyntaxHighlighter();
    this.commands = new CommandRegistry();
    this.diagnosticsEngine = new DiagnosticsEngine();
    this.taskRunner = new TaskRunner();
    this.compiledViewer = new CompiledViewer();
    this.splits = new SplitManager();

    // Terminal Screen & Input
    this.screen = new Screen(this.rows, this.cols, { virtual: this.virtual });
    this.input = new InputParser();

    // Views & UI Widgets
    this.menuBar = new MenuBar(this.commands, this.themeManager.current);
    this.tabBar = new TabBar(this.themeManager.current);
    this.sidebar = new Sidebar(this.workspace.rootDir, this.themeManager.current);
    this.statusBar = new StatusBar(this.themeManager.current);
    this.quickBar = new QuickActionBar(this.themeManager.current);
    this.palette = new CommandPalette(this.commands, this.themeManager.current);
    this.problems = new ProblemsPanel(this.themeManager.current);
    this.editorView = new EditorView(this.themeManager.current, this.highlighter);
    this.completion = new CompletionEngine();

    // Buffers
    this.buffers = [];
    this.activeBufferIndex = 0;
    this.diagnostics = []; // diagnostics for active buffer

    // Mode
    this.mode = 'INSERT'; // 'INSERT' | 'NORMAL' (simple profile defaults to INSERT)
    this.isMouseDown = false;
    this.isExiting = false;

    // Register all editor commands
    this._registerCommands();

    // Open initial file if provided
    if (options.file) {
      this.openFile(options.file);
    } else {
      this.openNewBuffer();
    }

    // Attach task runner update listener
    this.taskRunner.on('update', () => {
      this.render();
    });
  }

  get activeBuffer() {
    return this.buffers[this.activeBufferIndex] || null;
  }

  openNewBuffer(name = 'untitled.liq') {
    const buf = new TextBuffer('', name);
    this.buffers.push(buf);
    this.activeBufferIndex = this.buffers.length - 1;
    this._triggerDiagnostics();
    return buf;
  }

  openFile(filePath) {
    const absPath = path.resolve(filePath);
    // Check if already open
    const existingIdx = this.buffers.findIndex(b => b.filePath === absPath);
    if (existingIdx !== -1) {
      this.activeBufferIndex = existingIdx;
      this._triggerDiagnostics();
      return this.activeBuffer;
    }

    const buf = TextBuffer.loadFromFile(absPath);
    this.buffers.push(buf);
    this.activeBufferIndex = this.buffers.length - 1;
    this.workspace.addRecent(absPath);
    this._triggerDiagnostics();
    return buf;
  }

  closeBuffer(index = this.activeBufferIndex) {
    if (index < 0 || index >= this.buffers.length) return;
    this.buffers.splice(index, 1);
    if (this.buffers.length === 0) {
      this.openNewBuffer();
    } else {
      this.activeBufferIndex = Math.max(0, Math.min(this.activeBufferIndex, this.buffers.length - 1));
    }
    this._triggerDiagnostics();
  }

  executeCommand(id, ...args) {
    const cmd = this.commands.get(id);
    if (cmd && typeof cmd.action === 'function') {
      cmd.action(this, ...args);
      this.render();
    }
  }

  _triggerDiagnostics() {
    if (!this.activeBuffer) return;
    this.diagnosticsEngine.check(this.activeBuffer, (diags) => {
      this.diagnostics = diags;
      this.render();
    });
    if (this.compiledViewer.visible) {
      this.compiledViewer.update(this.activeBuffer);
    }
  }

  // --- Start & Event Loop ---

  start() {
    if (!this.virtual) {
      this.screen.start();

      // Hook stdin
      this._stdinListener = (chunk) => {
        this.input.feed(chunk);
      };
      process.stdin.on('data', this._stdinListener);

      // Hook terminal resize (SIGWINCH)
      process.on('SIGWINCH', () => {
        const rows = process.stdout.rows || 24;
        const cols = process.stdout.columns || 80;
        this.resize(rows, cols);
      });

      // Emergency crash and signal recovery
      const cleanupAndExit = () => {
        this.exit();
        process.exit(0);
      };

      process.on('SIGINT', cleanupAndExit);
      process.on('SIGTERM', cleanupAndExit);
      process.on('SIGHUP', cleanupAndExit);
      process.on('exit', () => {
        this.screen.stop();
      });
    }

    // Attach input listeners
    this.input.on('key', (k) => {
      this.handleKey(k);
      this.render();
    });

    this.input.on('mouse', (m) => {
      this.handleMouse(m);
      this.render();
    });

    this.input.on('paste', (text) => {
      if (this.activeBuffer) {
        this.activeBuffer.insertText(text);
        this._triggerDiagnostics();
        this.render();
      }
    });

    this.render();
  }

  resize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.screen.resize(rows, cols);
    this.render();
  }

  exit() {
    if (this.isExiting) return;
    this.isExiting = true;

    // Save recovery files for dirty buffers
    const recDir = path.join(os.tmpdir(), 'liquid-edit-recovery');
    for (const b of this.buffers) {
      b.saveRecovery(recDir);
    }

    if (this._stdinListener) {
      try { process.stdin.off('data', this._stdinListener); } catch {}
    }

    if (this.taskRunner.isRunning()) {
      this.taskRunner.stop();
    }

    this.screen.stop();
    if (!this.virtual) {
      process.exit(0);
    }
  }

  // --- Keyboard & Mouse Dispatch ---

  handleKey(key) {
    // 1. Command Palette priority
    if (this.palette.visible) {
      if (this.palette.handleKey(key)) return;
    }

    // 2. Menu bar priority
    if (this.menuBar.isOpen()) {
      if (this.menuBar.handleKey(key, this)) return;
    }

    // 3. Completion popup priority
    if (this.completion.visible) {
      if (this.completion.handleKey(key)) return;
    }

    // 4. Problems panel priority
    if (this.problems.visible) {
      if (this.problems.handleKey(key, this.diagnostics, (line, col) => {
        if (this.activeBuffer) {
          this.activeBuffer.setCursor(line, col);
          this.problems.hide();
        }
      })) return;
    }

    // 5. Sidebar priority
    if (this.sidebar.visible) {
      if (this.sidebar.handleKey(key, this)) return;
    }

    // 6. Direct Command Keybinding match
    const matchedCmd = this.commands.findByKey(key);
    if (matchedCmd) {
      this.executeCommand(matchedCmd.id);
      return;
    }

    // 7. Active Buffer editing
    const buf = this.activeBuffer;
    if (!buf) return;

    if (key.name === 'up') {
      buf.moveCursorUp(key.shift);
    } else if (key.name === 'down') {
      buf.moveCursorDown(key.shift);
    } else if (key.name === 'left') {
      buf.moveCursorLeft(key.shift);
    } else if (key.name === 'right') {
      buf.moveCursorRight(key.shift);
    } else if (key.name === 'home') {
      buf.moveCursorToLineStart(key.shift);
    } else if (key.name === 'end') {
      buf.moveCursorToLineEnd(key.shift);
    } else if (key.name === 'pageup') {
      for (let i = 0; i < 15; i++) buf.moveCursorUp(key.shift);
    } else if (key.name === 'pagedown') {
      for (let i = 0; i < 15; i++) buf.moveCursorDown(key.shift);
    } else if (key.name === 'enter') {
      buf.smartEnter();
      this._triggerDiagnostics();
    } else if (key.name === 'backspace') {
      buf.smartBackspace();
      this._triggerDiagnostics();
      this.completion.hide();
    } else if (key.name === 'delete') {
      buf.deleteChar('forward');
      this._triggerDiagnostics();
    } else if (key.name === 'tab') {
      if (key.shift) {
        buf.indentSelection(true); // Dedent
      } else if (buf.hasSelection()) {
        buf.indentSelection(false); // Indent
      } else {
        buf.insertText('  '); // 2 spaces
      }
      this._triggerDiagnostics();
    } else if (key.char && !key.ctrl && !key.alt) {
      // Auto-close pairs or insert char
      if (!buf.handleAutoClosePair(key.char)) {
        buf.insertText(key.char);
      }
      this._triggerDiagnostics();
      this.completion.suggest(buf);
    }
  }

  handleMouse(mouse) {
    const { action, col, row } = mouse;

    // 1. Palette click
    if (this.palette.visible) {
      const paletteBounds = this._lastPaletteBounds || { top: 2, left: 2, width: this.cols - 4, height: this.rows - 6 };
      if (this.palette.handleClick(row, col, paletteBounds)) return;
    }

    // 2. Menu bar click (row 0 or open dropdown)
    if (row === 0 || this.menuBar.isOpen()) {
      if (this.menuBar.handleClick(row, col, this)) return;
    }

    // 3. Tab bar click (row 1)
    if (row === 1) {
      if (this.tabBar.handleClick(
        row,
        col,
        this.buffers,
        this.activeBufferIndex,
        (tabIdx) => {
          this.activeBufferIndex = tabIdx;
          this._triggerDiagnostics();
        },
        (tabIdx) => {
          this.closeBuffer(tabIdx);
        }
      )) return;
    }

    // 4. Quick Action Bar click (bottom row: screen.rows - 1)
    if (row === this.screen.rows - 1) {
      if (this.quickBar.handleClick(row, col, this.screen, this)) return;
    }

    // 5. Status bar click (screen.rows - 2)
    if (row === this.screen.rows - 2) {
      if (this.statusBar.handleClick(row, col, this.screen, () => {
        this.problems.toggle();
      })) return;
    }

    // 6. Problems panel click
    if (this.problems.visible && this._lastProblemsBounds) {
      if (this.problems.handleClick(row, col, this.diagnostics, (line, diagCol) => {
        if (this.activeBuffer) {
          this.activeBuffer.setCursor(line, diagCol);
          this.problems.hide();
        }
      }, this._lastProblemsBounds)) return;
    }

    // 7. Sidebar click
    if (this.sidebar.visible) {
      if (this.sidebar.handleClick(row, col, this)) return;
    }

    // 8. Editor buffer text click / drag / wheel scroll
    const buf = this.activeBuffer;
    if (!buf) return;

    const paneBounds = this._getPrimaryEditorBounds();
    const { top, left, width, height } = paneBounds;

    if (row >= top && row < top + height && col >= left && col < left + width) {
      const totalLines = buf.lineCount;
      const digits = Math.max(2, String(totalLines).length);
      const gutterWidth = buf.showLineNumbers ? digits + 3 : 1;

      if (action === 'wheelup') {
        buf.scrollRow = Math.max(0, buf.scrollRow - 3);
      } else if (action === 'wheeldown') {
        buf.scrollRow = Math.min(Math.max(0, buf.lineCount - 1), buf.scrollRow + 3);
      } else if (action === 'press') {
        this.isMouseDown = true;
        const targetLine = buf.scrollRow + (row - top);
        const targetCol = Math.max(0, buf.scrollCol + (col - left - gutterWidth));
        buf.setCursor(targetLine, targetCol, false);
      } else if (action === 'drag' && this.isMouseDown) {
        const targetLine = buf.scrollRow + (row - top);
        const targetCol = Math.max(0, buf.scrollCol + (col - left - gutterWidth));
        buf.setCursor(targetLine, targetCol, true); // drag to select
      } else if (action === 'release') {
        this.isMouseDown = false;
      }
    }
  }

  _getPrimaryEditorBounds() {
    const isMobile = this.screen.cols < 60;
    const sidebarWidth = (this.sidebar.visible && !isMobile) ? this.sidebar.width : 0;
    const top = 2; // after menu (0) and tabs (1)
    const bottom = this.screen.rows - 2; // above status bar (-2) and quickbar (-1)
    const height = Math.max(1, bottom - top);
    const left = sidebarWidth;
    const width = Math.max(1, this.screen.cols - sidebarWidth);

    const paneBounds = this.splits.computePaneBounds(top, left, width, height, isMobile);
    return paneBounds[this.splits.activePane] || paneBounds[0];
  }

  // --- Screen Rendering ---

  render() {
    this.screen.clear();

    const isMobile = this.screen.cols < 60;
    const sidebarWidth = (this.sidebar.visible && !isMobile) ? this.sidebar.width : 0;

    // 1. Menu Bar (Row 0)
    this.menuBar.render(this.screen);

    // 2. Tab Bar (Row 1)
    this.tabBar.render(this.screen, this.buffers, this.activeBufferIndex, 1);

    // 3. Status Bar (Row rows - 2)
    this.statusBar.render(this.screen, this.activeBuffer, this.diagnostics, this.mode);

    // 4. Quick Action Touch Bar (Row rows - 1)
    this.quickBar.render(this.screen);

    // 5. Docked Sidebar (if visible on desktop)
    if (this.sidebar.visible && !isMobile) {
      this.sidebar.render(this.screen, 2, this.screen.rows - 2);
    }

    // 6. Editor Panes / Splits
    const editorTop = 2;
    const editorHeight = Math.max(1, (this.screen.rows - 2) - editorTop);
    const editorLeft = sidebarWidth;
    const editorWidth = Math.max(1, this.screen.cols - sidebarWidth);

    const paneBoundsList = this.splits.computePaneBounds(editorTop, editorLeft, editorWidth, editorHeight, isMobile);

    if (this.activeBuffer && paneBoundsList.length > 0) {
      const primaryBounds = paneBoundsList[0];
      this.editorView.renderPane(this.screen, this.activeBuffer, primaryBounds, this.splits.activePane === 0, this.diagnostics);

      // Secondary pane: split or compiled view or tasks
      if (paneBoundsList.length > 1) {
        const secBounds = paneBoundsList[1];

        // Draw divider
        if (this.splits.mode === 'vertical') {
          for (let r = secBounds.top; r < secBounds.top + secBounds.height; r++) {
            this.screen.writeString(r, secBounds.left - 1, '│', this.themeManager.current.paletteBorder, this.themeManager.current.editorBg);
          }
        }

        if (this.compiledViewer.visible) {
          this._renderCompiledPane(secBounds);
        } else if (this.taskRunner.visible) {
          this._renderTasksPane(secBounds);
        } else {
          // Normal split: show next buffer or same buffer
          const secBuf = this.buffers.length > 1 ? this.buffers[(this.activeBufferIndex + 1) % this.buffers.length] : this.activeBuffer;
          this.editorView.renderPane(this.screen, secBuf, secBounds, this.splits.activePane === 1, []);
        }
      }
    }

    // 7. Mobile Sidebar Overlay (if visible on mobile screens)
    if (this.sidebar.visible && isMobile) {
      this.sidebar.render(this.screen, 2, this.screen.rows - 2);
    }

    // 8. Problems Panel (if visible)
    if (this.problems.visible) {
      const probTop = Math.floor(this.screen.rows * 0.65);
      this._lastProblemsBounds = this.problems.render(this.screen, this.diagnostics, probTop, this.screen.rows - 2);
    }

    // 8. Autocomplete Popup (if visible)
    if (this.completion.visible && this.activeBuffer) {
      const curRow = this.screen.cursorRow;
      const curCol = this.screen.cursorCol;
      this.completion.render(this.screen, curRow, curCol, this.themeManager.current);
    }

    // 9. Command Palette (if visible, renders on top)
    if (this.palette.visible) {
      this._lastPaletteBounds = this.palette.render(this.screen);
    }

    // Flush screen updates
    this.screen.flush();
  }

  _renderCompiledPane(bounds) {
    const { top, left, width, height } = bounds;
    const bg = this.themeManager.current.editorBg;
    const fg = this.themeManager.current.editorFg;
    const border = this.themeManager.current.paletteBorder;

    // Header
    const modeLabel = this.compiledViewer.mode === 'js' ? 'COMPILED JS (Tap F8 to switch to CSS)' : 'COMPILED CSS (Tap F8 to switch to JS)';
    this.screen.writeString(top, left, ' '.repeat(width), fg, this.themeManager.current.tabBarBg);
    this.screen.writeString(top, left + 1, modeLabel, this.themeManager.current.accent, this.themeManager.current.tabBarBg, ATTR_BOLD);

    const lines = this.compiledViewer.getLines();
    for (let r = 0; r < height - 1; r++) {
      const row = top + 1 + r;
      this.screen.writeString(row, left, ' '.repeat(width), fg, bg);
      if (r < lines.length) {
        this.screen.writeString(row, left + 1, truncateToWidth(lines[r], width - 2), fg, bg);
      }
    }
  }

  _renderTasksPane(bounds) {
    const { top, left, width, height } = bounds;
    const bg = this.themeManager.current.editorBg;
    const fg = this.themeManager.current.editorFg;

    // Header
    const statusText = this.taskRunner.isRunning() ? '● RUNNING' : '■ STOPPED';
    const statusColor = this.taskRunner.isRunning() ? this.themeManager.current.syntax.string : this.themeManager.current.errorFg;
    const title = `TASK: ${this.taskRunner.currentTask || 'Output'}  ${statusText}`;

    this.screen.writeString(top, left, ' '.repeat(width), fg, this.themeManager.current.tabBarBg);
    this.screen.writeString(top, left + 1, title, statusColor, this.themeManager.current.tabBarBg, ATTR_BOLD);

    // URL banner if detected
    let logStartRow = top + 1;
    if (this.taskRunner.localUrl || this.taskRunner.networkUrl) {
      const urlLine = `➜ Local: ${this.taskRunner.localUrl || ''}  Network: ${this.taskRunner.networkUrl || ''}`;
      this.screen.writeString(logStartRow, left, ' '.repeat(width), fg, this.themeManager.current.cursorLineBg);
      this.screen.writeString(logStartRow, left + 1, truncateToWidth(urlLine, width - 2), this.themeManager.current.accent, this.themeManager.current.cursorLineBg, ATTR_BOLD);
      logStartRow++;
    }

    const availRows = height - (logStartRow - top);
    const logs = this.taskRunner.logs;
    const startIdx = Math.max(0, logs.length - availRows);

    for (let r = 0; r < availRows; r++) {
      const row = logStartRow + r;
      this.screen.writeString(row, left, ' '.repeat(width), fg, bg);
      const logIdx = startIdx + r;
      if (logIdx < logs.length) {
        const clean = logs[logIdx].replace(/\x1b\[[0-9;]*m/g, '');
        this.screen.writeString(row, left + 1, truncateToWidth(clean, width - 2), fg, bg);
      }
    }
  }

  // --- Command Registration ---

  _registerCommands() {
    // File Commands
    this.commands.register({
      id: 'file.new',
      title: 'New File',
      category: 'File',
      keybinding: 'Ctrl+N',
      description: 'Create a new blank Liquid component buffer',
      action: (ed) => ed.openNewBuffer()
    });

    this.commands.register({
      id: 'file.save',
      title: 'Save File',
      category: 'File',
      keybinding: 'Ctrl+S',
      description: 'Save active buffer to disk atomically',
      action: (ed) => {
        if (ed.activeBuffer) ed.activeBuffer.save();
      }
    });

    this.commands.register({
      id: 'file.close',
      title: 'Close Tab',
      category: 'File',
      keybinding: 'Ctrl+W',
      description: 'Close the current active editor tab',
      action: (ed) => ed.closeBuffer()
    });

    this.commands.register({
      id: 'app.exit',
      title: 'Exit Editor',
      category: 'File',
      keybinding: 'Ctrl+Q',
      description: 'Exit liquid-edit safely',
      action: (ed) => ed.exit()
    });

    // Edit Commands
    this.commands.register({
      id: 'edit.undo',
      title: 'Undo',
      category: 'Edit',
      keybinding: 'Ctrl+Z',
      description: 'Undo last editing action',
      action: (ed) => {
        if (ed.activeBuffer) {
          ed.activeBuffer.undo();
          ed._triggerDiagnostics();
        }
      }
    });

    this.commands.register({
      id: 'edit.redo',
      title: 'Redo',
      category: 'Edit',
      keybinding: 'Ctrl+Y',
      description: 'Redo previously undone action',
      action: (ed) => {
        if (ed.activeBuffer) {
          ed.activeBuffer.redo();
          ed._triggerDiagnostics();
        }
      }
    });

    this.commands.register({
      id: 'edit.cut',
      title: 'Cut',
      category: 'Edit',
      keybinding: 'Ctrl+X',
      description: 'Cut selected text to clipboard',
      action: (ed) => {
        if (ed.activeBuffer && ed.activeBuffer.hasSelection()) {
          copyToClipboard(ed.activeBuffer.getSelectedText(), ed.screen);
          ed.activeBuffer.deleteSelection();
          ed._triggerDiagnostics();
        }
      }
    });

    this.commands.register({
      id: 'edit.copy',
      title: 'Copy',
      category: 'Edit',
      keybinding: 'Ctrl+C',
      description: 'Copy selected text to clipboard',
      action: (ed) => {
        if (ed.activeBuffer && ed.activeBuffer.hasSelection()) {
          copyToClipboard(ed.activeBuffer.getSelectedText(), ed.screen);
        }
      }
    });

    this.commands.register({
      id: 'edit.paste',
      title: 'Paste',
      category: 'Edit',
      keybinding: 'Ctrl+V',
      description: 'Paste text from clipboard at cursor position',
      action: (ed) => {
        if (ed.activeBuffer) {
          const text = getFromClipboard();
          if (text) {
            ed.activeBuffer.insertText(text);
            ed._triggerDiagnostics();
          }
        }
      }
    });

    this.commands.register({
      id: 'edit.selectAll',
      title: 'Select All',
      category: 'Edit',
      keybinding: 'Ctrl+A',
      description: 'Select entire contents of active buffer',
      action: (ed) => {
        if (ed.activeBuffer) ed.activeBuffer.selectAll();
      }
    });

    this.commands.register({
      id: 'edit.comment',
      title: 'Toggle Comment',
      category: 'Edit',
      keybinding: 'Ctrl+/',
      description: 'Toggle line comments on current line or selection',
      action: (ed) => {
        if (ed.activeBuffer) {
          ed.activeBuffer.toggleComment();
          ed._triggerDiagnostics();
        }
      }
    });

    this.commands.register({
      id: 'edit.indent',
      title: 'Indent Selection',
      category: 'Edit',
      keybinding: 'Tab',
      description: 'Indent current line or selection by 2 spaces',
      action: (ed) => {
        if (ed.activeBuffer) ed.activeBuffer.indentSelection(false);
      }
    });

    this.commands.register({
      id: 'edit.dedent',
      title: 'Dedent Selection',
      category: 'Edit',
      keybinding: 'Shift+Tab',
      description: 'Dedent current line or selection by 2 spaces',
      action: (ed) => {
        if (ed.activeBuffer) ed.activeBuffer.indentSelection(true);
      }
    });

    // View Commands
    this.commands.register({
      id: 'view.toggleSidebar',
      title: 'Toggle File Sidebar',
      category: 'View',
      keybinding: 'Ctrl+B',
      description: 'Show or hide the project file explorer sidebar',
      action: (ed) => ed.sidebar.toggle()
    });

    this.commands.register({
      id: 'view.toggleTheme',
      title: 'Toggle Theme',
      category: 'View',
      keybinding: 'F2',
      description: 'Switch between dark and light color themes',
      action: (ed) => {
        const theme = ed.themeManager.toggle();
        ed.menuBar.theme = theme;
        ed.tabBar.theme = theme;
        ed.sidebar.theme = theme;
        ed.statusBar.theme = theme;
        ed.quickBar.theme = theme;
        ed.palette.theme = theme;
        ed.problems.theme = theme;
        ed.editorView.theme = theme;
        ed.config.set('theme', theme.name);
      }
    });

    this.commands.register({
      id: 'view.splitHorizontal',
      title: 'Split Editor',
      category: 'View',
      keybinding: 'Ctrl+\\',
      description: 'Split editor into side-by-side panes',
      action: (ed) => ed.splits.toggleSplit('vertical')
    });

    this.commands.register({
      id: 'view.closeSplit',
      title: 'Close Split',
      category: 'View',
      keybinding: 'Ctrl+K W',
      description: 'Close active split pane',
      action: (ed) => {
        ed.splits.closeSplit();
        ed.compiledViewer.visible = false;
        ed.taskRunner.visible = false;
      }
    });

    // Search Commands
    this.commands.register({
      id: 'search.find',
      title: 'Find Text...',
      category: 'Search',
      keybinding: 'Ctrl+F',
      description: 'Search for text in active buffer',
      action: (ed) => {
        ed.palette.open(
          (item) => {
            if (ed.activeBuffer && item) {
              const res = SearchEngine.find(ed.activeBuffer.table, item.title);
              if (res.matches.length > 0) {
                ed.activeBuffer.setCursor(res.matches[0].line, res.matches[0].col);
              }
            }
          },
          null,
          [{ title: 'Type search text and press Enter' }]
        );
      }
    });

    this.commands.register({
      id: 'search.gotoLine',
      title: 'Go to Line...',
      category: 'Search',
      keybinding: 'Ctrl+G',
      description: 'Jump cursor to specific line number',
      action: (ed) => {
        ed.palette.open(
          (item) => {
            const lineNr = parseInt(ed.palette.query, 10);
            if (!isNaN(lineNr) && ed.activeBuffer) {
              ed.activeBuffer.setCursor(lineNr - 1, 0);
            }
          },
          null,
          [{ title: 'Type line number and press Enter' }]
        );
      }
    });

    this.commands.register({
      id: 'workspace.findFile',
      title: 'Find File...',
      category: 'Search',
      keybinding: 'Ctrl+P',
      description: 'Fuzzy search project files to open',
      action: (ed) => {
        const files = ed.workspace.findFiles().map(f => ({
          title: f.relPath,
          subtitle: f.name,
          category: 'File',
          fullPath: f.fullPath
        }));
        ed.palette.open((item) => {
          if (item && item.fullPath) ed.openFile(item.fullPath);
        }, null, files);
      }
    });

    // Liquid Integration Commands
    this.commands.register({
      id: 'liquid.dev',
      title: 'Run Dev Server',
      category: 'Liquid',
      keybinding: 'F5',
      description: 'Start liquid dev server with live URLs and output streaming',
      action: (ed) => {
        ed.splits.setSplit('vertical');
        ed.taskRunner.start('dev', ed.workspace.rootDir);
      }
    });

    this.commands.register({
      id: 'liquid.stop',
      title: 'Stop Process',
      category: 'Liquid',
      keybinding: 'Shift+F5',
      description: 'Stop any running background task or dev server',
      action: (ed) => ed.taskRunner.stop()
    });

    this.commands.register({
      id: 'liquid.build',
      title: 'Build Project',
      category: 'Liquid',
      keybinding: 'Ctrl+Shift+B',
      description: 'Run production build bundle',
      action: (ed) => {
        ed.splits.setSplit('vertical');
        ed.taskRunner.start('build', ed.workspace.rootDir);
      }
    });

    this.commands.register({
      id: 'liquid.check',
      title: 'Check Diagnostics',
      category: 'Liquid',
      keybinding: 'F7',
      description: 'Toggle problems panel and inspect compile diagnostics',
      action: (ed) => ed.problems.toggle()
    });

    this.commands.register({
      id: 'liquid.toggleCompiled',
      title: 'Toggle Compiled Output',
      category: 'Liquid',
      keybinding: 'F8',
      description: 'Inspect live compiled JavaScript and extracted CSS',
      action: (ed) => {
        ed.compiledViewer.toggle();
        if (ed.compiledViewer.visible) {
          ed.splits.setSplit('vertical');
          if (ed.activeBuffer) ed.compiledViewer.update(ed.activeBuffer);
        } else {
          ed.splits.closeSplit();
        }
      }
    });

    this.commands.register({
      id: 'liquid.format',
      title: 'Format .liq Document',
      category: 'Liquid',
      keybinding: 'Shift+Alt+F',
      description: 'Normalize indentation and clean formatting in .liq document',
      action: (ed) => {
        if (ed.activeBuffer && ed.activeBuffer.language === 'liq') {
          const formatted = LiquidFormatter.format(ed.activeBuffer.getText());
          ed.activeBuffer.selectAll();
          ed.activeBuffer.insertText(formatted);
          ed._triggerDiagnostics();
        }
      }
    });

    this.commands.register({
      id: 'liquid.snippets',
      title: 'Insert Liquid Snippet...',
      category: 'Liquid',
      keybinding: 'Ctrl+Space',
      description: 'Choose and insert common Liquid template skeletons',
      action: (ed) => {
        const snippetItems = LIQUID_SNIPPETS.map(s => ({
          title: s.title,
          subtitle: s.description,
          category: 'Snippet',
          text: s.text
        }));
        ed.palette.open((item) => {
          if (item && item.text && ed.activeBuffer) {
            ed.activeBuffer.insertText(item.text);
            ed._triggerDiagnostics();
          }
        }, null, snippetItems);
      }
    });

    this.commands.register({
      id: 'search.gotoSymbol',
      title: 'Go to Symbol...',
      category: 'Search',
      keybinding: 'Ctrl+Shift+O',
      description: 'Jump to component section, prop, signal, or function',
      action: (ed) => {
        if (!ed.activeBuffer) return;
        const symbols = OutlineGenerator.getSymbols(ed.activeBuffer).map(s => ({
          title: s.name,
          category: s.type.toUpperCase(),
          line: s.line
        }));
        ed.palette.open((item) => {
          if (item && typeof item.line === 'number') {
            ed.activeBuffer.setCursor(item.line, 0);
          }
        }, null, symbols);
      }
    });

    // Help Commands
    this.commands.register({
      id: 'help.palette',
      title: 'Command Palette...',
      category: 'Help',
      keybinding: 'F1',
      description: 'Open searchable command palette',
      action: (ed) => ed.palette.open((item) => {
        if (item && item.id) ed.executeCommand(item.id);
      })
    });

    this.commands.register({
      id: 'help.cheatSheet',
      title: 'Keyboard Cheat Sheet',
      category: 'Help',
      keybinding: 'Ctrl+?',
      description: 'View list of all available commands and shortcuts',
      action: (ed) => {
        const list = ed.commands.getAll().map(c => ({
          title: `${c.title} — ${c.keybinding || 'No key'}`,
          subtitle: c.description,
          category: c.category,
          id: c.id
        }));
        ed.palette.open((item) => {
          if (item && item.id) ed.executeCommand(item.id);
        }, null, list);
      }
    });

    this.commands.register({
      id: 'help.about',
      title: 'About liquid-edit',
      category: 'Help',
      description: 'Information about the phone-first liquid-edit TUI',
      action: (ed) => {
        ed.openNewBuffer('about.txt');
        if (ed.activeBuffer) {
          ed.activeBuffer.insertText(
            `🫟 liquid-edit v1.0.0\n` +
            `A fast, modern terminal code editor written in pure JavaScript.\n` +
            `Phone-first, Termux-friendly, zero native dependencies.\n\n` +
            `Features:\n` +
            `- Full touch & mouse support (tap to place cursor, drag to select, scroll)\n` +
            `- Phone quick-action bar at the bottom for easy typing on virtual keyboards\n` +
            `- Command palette (F1 or tap ⚡)\n` +
            `- Deep Liquid integration: live diagnostics, compiled JS/CSS view, dev server runner\n` +
            `- Pure JS: runs in Termux Android, GitHub Codespaces, Linux, macOS\n`
          );
        }
      }
    });
  }
}
