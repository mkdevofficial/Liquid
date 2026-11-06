import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Editor } from '../src/editor.js';
import { TextBuffer } from '../src/text/buffer.js';
import { Screen } from '../src/terminal/screen.js';

test('Atomic save writes to file cleanly and clears dirty flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lqe-atomic-'));
  const targetFile = path.join(tmpDir, 'test-component.liq');

  try {
    fs.writeFileSync(targetFile, '--- logic\nlet x = 1;\n', 'utf8');

    const buf = TextBuffer.loadFromFile(targetFile);
    assert.strictEqual(buf.isDirty(), false);

    buf.insertText('// edited line\n');
    assert.strictEqual(buf.isDirty(), true);

    const saved = buf.save();
    assert.strictEqual(saved, true);
    assert.strictEqual(buf.isDirty(), false);

    const onDisk = fs.readFileSync(targetFile, 'utf8');
    assert.ok(onDisk.includes('// edited line'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Crash / emergency exit saves recovery file for dirty buffers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lqe-rec-test-'));
  const targetFile = path.join(tmpDir, 'important-work.liq');

  try {
    fs.writeFileSync(targetFile, 'original content', 'utf8');

    const ed = new Editor({
      file: targetFile,
      virtual: true
    });
    ed.start();

    // Make an unsaved edit
    ed.activeBuffer.insertText('UNSAVED CRITICAL DATA: ');
    assert.strictEqual(ed.activeBuffer.isDirty(), true);

    // Trigger emergency exit
    const recDir = path.join(tmpDir, 'recovery');
    ed.activeBuffer.saveRecovery(recDir);

    const recFiles = fs.readdirSync(recDir);
    assert.strictEqual(recFiles.length, 1, 'Recovery file must be created');

    const recContent = fs.readFileSync(path.join(recDir, recFiles[0]), 'utf8');
    assert.ok(recContent.includes('UNSAVED CRITICAL DATA'), 'Recovery file must contain unsaved work');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Terminal restoration emits all escape sequences to restore user terminal cleanly', () => {
  const writtenChunks = [];
  const mockStream = {
    write(chunk) {
      writtenChunks.push(chunk);
    }
  };

  const screen = new Screen(24, 80, { virtual: false, outStream: mockStream });

  // Simulate screen start
  screen.start();
  assert.strictEqual(screen.inAlternateScreen, true);

  // Now stop
  screen.stop();
  assert.strictEqual(screen.inAlternateScreen, false);

  const fullOutput = writtenChunks.join('');

  // 1. Reset text style
  assert.ok(fullOutput.includes('\x1b[0m'), 'Must reset text styles');
  // 2. Show cursor
  assert.ok(fullOutput.includes('\x1b[?25h'), 'Must show cursor');
  // 3. Disable mouse tracking (SGR 1006, normal 1000, 1002)
  assert.ok(fullOutput.includes('\x1b[?1006l'), 'Must disable SGR mouse tracking');
  assert.ok(fullOutput.includes('\x1b[?1002l'), 'Must disable mouse drag tracking');
  assert.ok(fullOutput.includes('\x1b[?1000l'), 'Must disable basic mouse tracking');
  // 4. Disable bracketed paste
  assert.ok(fullOutput.includes('\x1b[?2004l'), 'Must disable bracketed paste mode');
  // 5. Exit alternate screen
  assert.ok(fullOutput.includes('\x1b[?1049l'), 'Must exit alternate screen buffer');
});
