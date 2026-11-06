/**
 * liquid-edit main entry
 */

import { Editor } from './editor.js';
import { TextBuffer } from './text/buffer.js';
import { Screen } from './terminal/screen.js';
import { InputParser } from './terminal/input.js';

export { Editor, TextBuffer, Screen, InputParser };

export function startEditor(argv = process.argv.slice(2)) {
  const args = [...argv];
  let filePath = null;
  let virtual = false;
  let rows = process.stdout?.rows || 24;
  let cols = process.stdout?.columns || 80;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--version' || arg === '-v') {
      console.log('liquid-edit 1.0.0');
      process.exit(0);
    }
    if (arg === '--virtual') {
      virtual = true;
    } else if (arg.startsWith('--rows=')) {
      rows = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--cols=')) {
      cols = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('-')) {
      filePath = arg;
    }
  }

  const editor = new Editor({
    file: filePath,
    virtual,
    rows,
    cols,
    projectDir: process.cwd()
  });

  editor.start();
  return editor;
}

function printHelp() {
  console.log(`
  🫟 liquid-edit (lqe) — Phone-first, Termux-friendly TUI code editor

  Usage:
    lqe [options] [file]
    liquid edit [options] [file]

  Options:
    -h, --help       Show this help message
    -v, --version    Show version
    --virtual        Run in virtual headless terminal mode

  Touch & Keyboard:
    Tap              Place cursor / click buttons, tabs, menu, sidebar
    Drag             Select text
    F1 / Tap [⚡ Cmd] Open Command Palette (fuzzy search all actions)
    Ctrl+S / [💾]    Save file
    Ctrl+Z / [↩]     Undo
    Ctrl+Y / [↪]     Redo
    Ctrl+F / [🔍]    Find / Replace
    Ctrl+B           Toggle File Sidebar
    F8               Toggle Live Compiled JS/CSS view
    F5               Run/Toggle Liquid Dev Server
    F2               Toggle Dark/Light Theme
    Ctrl+Q           Exit editor
`);
}
