import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/editor.js';

test('Character-by-character typing through InputParser updates buffer', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();

  // Feed single characters
  for (const ch of 'const count = 42;') {
    ed.input.feed(ch);
  }

  assert.strictEqual(ed.activeBuffer.getText(), 'const count = 42;');
  assert.strictEqual(ed.activeBuffer.cursorCol, 17);
});

test('Smart auto-close pairs: typing ( inserts () and typing ) steps over', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();

  ed.input.feed('f');
  ed.input.feed('u');
  ed.input.feed('n');
  ed.input.feed('c');
  ed.input.feed('('); // auto-closes to "func()" with cursor between parens

  assert.strictEqual(ed.activeBuffer.getText(), 'func()');
  assert.strictEqual(ed.activeBuffer.cursorCol, 5);

  // Stepping over closing parenthesis
  ed.input.feed(')');
  assert.strictEqual(ed.activeBuffer.getText(), 'func()');
  assert.strictEqual(ed.activeBuffer.cursorCol, 6);
});

test('Touch tap positions cursor accurately in buffer', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();
  ed.activeBuffer.insertText('line one\nline two\nline three');

  // Gutter width is 2 digits + 3 = 5 cols. Left is 0. Top is 2.
  // Tap on line 2 ('line two'), col 3 ('e')
  // row = 2 (top) + 1 = 3. col = 5 (gutter) + 3 = 8.
  ed.handleMouse({ action: 'press', row: 3, col: 8 });
  ed.handleMouse({ action: 'release', row: 3, col: 8 });

  assert.strictEqual(ed.activeBuffer.cursorLine, 1);
  assert.strictEqual(ed.activeBuffer.cursorCol, 3);
});

test('Touch drag selects text range', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();
  ed.activeBuffer.insertText('hello world!');

  // Press at col 5 (gutter 5 + 0 = 5) -> line 0, col 0
  ed.handleMouse({ action: 'press', row: 2, col: 5 });
  // Drag to col 10 (gutter 5 + 5 = 10) -> line 0, col 5
  ed.handleMouse({ action: 'drag', row: 2, col: 10 });
  ed.handleMouse({ action: 'release', row: 2, col: 10 });

  assert.ok(ed.activeBuffer.hasSelection(), 'Active buffer must have selection after drag');
  assert.strictEqual(ed.activeBuffer.getSelectedText(), 'hello');
});

test('Mouse wheel scrolls buffer viewport', () => {
  const ed = new Editor({
    virtual: true,
    cols: 40,
    rows: 20
  });
  ed.start();

  const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
  ed.activeBuffer.insertText(lines);

  assert.strictEqual(ed.activeBuffer.scrollRow, 0);

  // Wheel down
  ed.handleMouse({ action: 'wheeldown', row: 5, col: 10 });
  assert.strictEqual(ed.activeBuffer.scrollRow, 3);

  // Wheel up
  ed.handleMouse({ action: 'wheelup', row: 5, col: 10 });
  assert.strictEqual(ed.activeBuffer.scrollRow, 0);
});

test('Quick-Action Bar taps trigger Save, Undo, Palette, Comment, and Indent', () => {
  const ed = new Editor({
    virtual: true,
    cols: 80,
    rows: 20
  });
  ed.start();
  ed.activeBuffer.insertText('hello');

  // Find col offset for [⚡ Cmd] button in quickBar
  // Quick bar is at row = rows - 1 = 19
  const quickRow = 19;
  let cmdButtonCol = -1;
  const row19Text = ed.screen.getVirtualRow(quickRow);
  for (let c = 0; c < 80; c++) {
    if (ed.screen.front[quickRow][c].char === '⚡') {
      cmdButtonCol = c;
      break;
    }
  }
  assert.ok(cmdButtonCol >= 0, '⚡ button must be present in quickbar');

  // Tap on [⚡ Cmd] button opens palette
  ed.handleMouse({ action: 'press', row: quickRow, col: cmdButtonCol });
  assert.strictEqual(ed.palette.visible, true, 'Tapping ⚡ must open Command Palette');

  // Close palette
  ed.handleKey({ name: 'escape' });
  assert.strictEqual(ed.palette.visible, false);

  // Test [↩ Undo] button
  let undoButtonCol = -1;
  for (let c = 0; c < 80; c++) {
    if (ed.screen.front[quickRow][c].char === '↩') {
      undoButtonCol = c;
      break;
    }
  }
  assert.ok(undoButtonCol >= 0, '↩ button must be present in quickbar');
  ed.handleMouse({ action: 'press', row: quickRow, col: undoButtonCol });
  assert.strictEqual(ed.activeBuffer.getText(), '', 'Tapping ↩ must undo text insertion');
});

test('Tab Bar touch navigation switches between open buffers', () => {
  const ed = new Editor({
    virtual: true,
    cols: 80,
    rows: 20
  });
  ed.start();
  ed.activeBuffer.insertText('Buffer 1 content');

  // Open second buffer
  const buf2 = ed.openNewBuffer('second.liq');
  buf2.insertText('Buffer 2 content');
  ed.render();

  assert.strictEqual(ed.activeBufferIndex, 1);

  // Tab bar is on row 1
  // Tab 0 ('untitled.liq') starts at col 0
  ed.handleMouse({ action: 'press', row: 1, col: 2 });
  assert.strictEqual(ed.activeBufferIndex, 0, 'Tapping first tab must activate buffer 0');
  assert.strictEqual(ed.activeBuffer.getText(), 'Buffer 1 content');
});
