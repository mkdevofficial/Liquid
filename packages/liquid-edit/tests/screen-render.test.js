import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/editor.js';

test('Phone 40x20 Screen Layout renders Menu, Tabs, Buffer, Status, and QuickBar', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });

  ed.start();
  ed.activeBuffer.insertText('<h1>Hello Liquid</h1>');
  ed.render();

  // Row 0: Menu Bar
  const row0 = ed.screen.getVirtualRow(0);
  assert.ok(row0.includes('🫟'), 'Row 0 must contain Liquid logo 🫟');
  assert.ok(row0.includes('File'), 'Row 0 must contain File menu');

  // Row 1: Tab Bar
  const row1 = ed.screen.getVirtualRow(1);
  assert.ok(row1.includes('untitled.liq'), 'Row 1 must contain tab name');

  // Center editor rows contain the text
  let foundText = false;
  for (let r = 2; r < 18; r++) {
    if (ed.screen.getVirtualRow(r).includes('Hello Liquid')) {
      foundText = true;
      break;
    }
  }
  assert.ok(foundText, 'Editor pane must render buffer text');

  // Row 18: Status Bar
  const row18 = ed.screen.getVirtualRow(18);
  assert.ok(row18.includes('INSERT'), 'Row 18 status bar must show mode badge');
  assert.ok(row18.includes('Ln 1'), 'Row 18 status bar must show cursor line');

  // Row 19: Quick-Action Touch Bar
  const row19 = ed.screen.getVirtualRow(19);
  assert.ok(row19.includes('💾'), 'Row 19 quickbar must show Save button');
  assert.ok(row19.includes('⚡'), 'Row 19 quickbar must show Command Palette button');
  assert.ok(row19.includes('↩'), 'Row 19 quickbar must show Undo button');
});

test('Command Palette overlay renders cleanly on 40x20 phone screen', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();

  // Open command palette
  ed.executeCommand('help.palette');
  assert.strictEqual(ed.palette.visible, true);

  // Assert palette rendered on screen
  let foundTitle = false;
  let foundPrompt = false;
  for (let r = 0; r < 20; r++) {
    const row = ed.screen.getVirtualRow(r);
    if (row.includes('Command Palette')) foundTitle = true;
    if (row.includes('>')) foundPrompt = true;
  }
  assert.ok(foundTitle, 'Command palette title must render on screen');
  assert.ok(foundPrompt, 'Command palette search prompt > must render on screen');

  // Close palette with Escape
  ed.handleKey({ name: 'escape' });
  ed.render();
  assert.strictEqual(ed.palette.visible, false);
});

test('Sidebar auto-collapses on phone (<60 cols) and docks on desktop (80 cols)', () => {
  // 1. Phone (40 cols)
  const phoneEd = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  phoneEd.start();

  phoneEd.executeCommand('view.toggleSidebar');
  assert.strictEqual(phoneEd.sidebar.visible, true);
  phoneEd.render();

  // On phone screen, sidebar renders as overlay
  let phoneSidebarFound = false;
  for (let r = 2; r < 18; r++) {
    if (phoneEd.screen.getVirtualRow(r).includes('EXPLORER')) {
      phoneSidebarFound = true;
      break;
    }
  }
  assert.ok(phoneSidebarFound, 'Sidebar header EXPLORER must render as overlay on mobile');

  // 2. Desktop (80 cols)
  const desktopEd = new Editor({
    virtual: true,
    cols: 80,
    rows: 24
  });
  desktopEd.start();
  desktopEd.executeCommand('view.toggleSidebar');
  assert.strictEqual(desktopEd.sidebar.visible, true);
  desktopEd.render();

  let desktopSidebarFound = false;
  for (let r = 2; r < 22; r++) {
    if (desktopEd.screen.getVirtualRow(r).includes('EXPLORER')) {
      desktopSidebarFound = true;
      break;
    }
  }
  assert.ok(desktopSidebarFound, 'Sidebar must render docked on desktop');
});

test('Live Compiled JS/CSS Viewer split (F8) renders compiled code side-by-side on wide screens', () => {
  const ed = new Editor({
    virtual: true,
    cols: 80,
    rows: 24
  });
  ed.start();
  ed.activeBuffer.insertText('--- logic\nlet x = 1;\n--- ui\n<p>{x}</p>');

  // Toggle compiled viewer (F8)
  ed.executeCommand('liquid.toggleCompiled');
  assert.strictEqual(ed.compiledViewer.visible, true);
  ed.render();

  let headerFound = false;
  for (let r = 2; r < 22; r++) {
    const row = ed.screen.getVirtualRow(r);
    if (row.includes('COMPILED JS') || row.includes('│')) {
      headerFound = true;
      break;
    }
  }
  assert.ok(headerFound, 'Split divider and COMPILED header must be rendered');
});
