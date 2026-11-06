import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TextBuffer } from '../src/text/buffer.js';

test('TextBuffer - basic editing and cursor updates', () => {
  const buf = new TextBuffer('hello');
  buf.setCursor(0, 5);
  buf.insertText(' world');
  assert.strictEqual(buf.getText(), 'hello world');
  assert.deepStrictEqual(buf.cursor, { line: 0, col: 11 });

  // Delete back
  buf.deleteChar('back');
  assert.strictEqual(buf.getText(), 'hello worl');
  assert.deepStrictEqual(buf.cursor, { line: 0, col: 10 });
});

test('TextBuffer - smart Enter keeps and increases indent', () => {
  const buf = new TextBuffer('  if condition\n', 'component.liq');
  buf.setCursor(0, 14);
  buf.smartEnter();
  // Should keep 2 spaces + add 2 spaces = 4 spaces indent
  assert.strictEqual(buf.getLine(1), '    ');
  assert.deepStrictEqual(buf.cursor, { line: 1, col: 4 });
});

test('TextBuffer - smart Backspace dedents by 2 spaces on indent boundaries', () => {
  const buf = new TextBuffer('    code', 'file.js');
  buf.setCursor(0, 4);
  buf.smartBackspace();
  assert.strictEqual(buf.getLine(0), '  code');
  assert.deepStrictEqual(buf.cursor, { line: 0, col: 2 });
});

test('TextBuffer - selections, deletion, and replacement', () => {
  const buf = new TextBuffer('const foo = 42;');
  buf.setCursor(0, 6);
  buf.setCursor(0, 9, true); // select 'foo'
  assert.strictEqual(buf.hasSelection(), true);
  assert.strictEqual(buf.getSelectedText(), 'foo');

  buf.insertText('bar');
  assert.strictEqual(buf.getText(), 'const bar = 42;');
  assert.strictEqual(buf.hasSelection(), false);
});

test('TextBuffer - indent and dedent selection', () => {
  const buf = new TextBuffer('line 1\nline 2');
  buf.selectAll();
  buf.indentSelection(false);
  assert.strictEqual(buf.getText(), '  line 1\n  line 2');

  buf.indentSelection(true);
  assert.strictEqual(buf.getText(), 'line 1\nline 2');
});

test('TextBuffer - toggle comments', () => {
  const buf = new TextBuffer('let a = 1;\nlet b = 2;', 'test.js');
  buf.selectAll();
  buf.toggleComment();
  assert.strictEqual(buf.getText(), '// let a = 1;\n// let b = 2;');

  buf.toggleComment();
  assert.strictEqual(buf.getText(), 'let a = 1;\nlet b = 2;');
});

test('TextBuffer - move line up and down', () => {
  const buf = new TextBuffer('first\nsecond');
  buf.setCursor(0, 0);
  buf.moveLine(1); // move first down
  assert.strictEqual(buf.getText(), 'second\nfirst');

  buf.moveLine(-1); // move first up
  assert.strictEqual(buf.getText(), 'first\nsecond');
});

test('TextBuffer - undo and redo', () => {
  const buf = new TextBuffer('initial');
  buf.setCursor(0, 7);
  buf.insertText(' edit');
  assert.strictEqual(buf.getText(), 'initial edit');
  assert.strictEqual(buf.isDirty(), true);

  buf.undo();
  assert.strictEqual(buf.getText(), 'initial');

  buf.redo();
  assert.strictEqual(buf.getText(), 'initial edit');
});

test('TextBuffer - atomic save and recovery', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lqe-buf-test-'));
  const testFile = path.join(tmpDir, 'test.liq');

  try {
    const buf = new TextBuffer('export default function() {}', testFile);
    assert.strictEqual(buf.isDirty(), false);
    buf.setCursor(0, 28);
    buf.insertText(' // edit');
    assert.strictEqual(buf.isDirty(), true);
    buf.save();

    assert.strictEqual(buf.isDirty(), false);
    assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'export default function() {} // edit');

    // Test recovery
    buf.insertText('\n// unsaved');
    assert.strictEqual(buf.isDirty(), true);
    buf.saveRecovery(tmpDir);

    const recFile = fs.readdirSync(tmpDir).find(f => f.endsWith('.recovery~'));
    assert.ok(recFile, 'Recovery file should exist');
    assert.strictEqual(fs.readFileSync(path.join(tmpDir, recFile), 'utf8'), buf.getText());

    buf.save();
    assert.strictEqual(buf.isDirty(), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
