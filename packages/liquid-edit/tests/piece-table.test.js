import test from 'node:test';
import assert from 'node:assert';
import { PieceTable } from '../src/text/piece-table.js';

test('PieceTable - basic insert and delete', () => {
  const pt = new PieceTable('Hello World');
  assert.strictEqual(pt.getText(), 'Hello World');
  assert.strictEqual(pt.length, 11);

  // Insert in middle
  pt.insert(5, ' Beautiful');
  assert.strictEqual(pt.getText(), 'Hello Beautiful World');
  assert.strictEqual(pt.length, 21);

  // Delete ' Beautiful'
  pt.delete(5, 10);
  assert.strictEqual(pt.getText(), 'Hello World');
  assert.strictEqual(pt.length, 11);

  // Insert at start
  pt.insert(0, 'Oh, ');
  assert.strictEqual(pt.getText(), 'Oh, Hello World');

  // Insert at end
  pt.insert(pt.length, '!');
  assert.strictEqual(pt.getText(), 'Oh, Hello World!');
});

test('PieceTable - line counting and position mapping', () => {
  const text = 'Line 1\nLine 2\nLine 3\n';
  const pt = new PieceTable(text);

  assert.strictEqual(pt.getLineCount(), 4); // 4 lines including trailing empty line
  assert.strictEqual(pt.getLine(0), 'Line 1');
  assert.strictEqual(pt.getLine(1), 'Line 2');
  assert.strictEqual(pt.getLine(2), 'Line 3');
  assert.strictEqual(pt.getLine(3), '');

  const pos0 = pt.offsetToPosition(0);
  assert.deepStrictEqual(pos0, { line: 0, col: 0 });

  const posLine2 = pt.offsetToPosition(7);
  assert.deepStrictEqual(posLine2, { line: 1, col: 0 });

  const offsetLine2 = pt.positionToOffset(1, 0);
  assert.strictEqual(offsetLine2, 7);
});

test('PieceTable - Fuzz Test against Naive String Model (1000 random operations)', () => {
  let model = 'Initial text for fuzz testing Liquid PieceTable implementation.\nLine 2\nLine 3';
  const pt = new PieceTable(model);

  // Pseudo-random generator with fixed seed for deterministic testing
  let seed = 42;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const sampleWords = ['foo', 'bar', '🫟', 'Liquid', '\n', ' ', '123', '✨', 'const x = 42;\n'];

  for (let i = 0; i < 1000; i++) {
    const isInsert = rnd() > 0.45;
    const offset = Math.floor(rnd() * (model.length + 1));

    if (isInsert) {
      const word = sampleWords[Math.floor(rnd() * sampleWords.length)];
      model = model.slice(0, offset) + word + model.slice(offset);
      pt.insert(offset, word);
    } else {
      if (model.length > 0) {
        const len = Math.min(model.length - offset, Math.floor(rnd() * 10) + 1);
        model = model.slice(0, offset) + model.slice(offset + len);
        pt.delete(offset, len);
      }
    }

    assert.strictEqual(pt.length, model.length, `Length mismatch at iteration ${i}`);
  }

  // Final verification of full text
  assert.strictEqual(pt.getText(), model);

  // Line count verification
  const expectedLines = model.split('\n');
  assert.strictEqual(pt.getLineCount(), expectedLines.length);
  for (let l = 0; l < expectedLines.length; l++) {
    assert.strictEqual(pt.getLine(l), expectedLines[l], `Line ${l} content mismatch`);
  }
});
