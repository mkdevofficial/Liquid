import test from 'node:test';
import assert from 'node:assert';
import {
  codePointWidth,
  graphemeWidth,
  stringWidth,
  truncateToWidth,
  padWidth,
  isRtlString
} from '../src/terminal/unicode.js';

test('Unicode - ASCII display width', () => {
  assert.strictEqual(stringWidth('hello'), 5);
  assert.strictEqual(stringWidth(''), 0);
  assert.strictEqual(stringWidth('  '), 2);
  assert.strictEqual(stringWidth('\t', 2), 2);
  assert.strictEqual(stringWidth('\t', 4), 4);
});

test('Unicode - CJK and Wide characters have width 2', () => {
  assert.strictEqual(stringWidth('你好'), 4);
  assert.strictEqual(stringWidth('東京'), 4);
  assert.strictEqual(stringWidth('한글'), 4);
});

test('Unicode - Emoji width includes modern emoji 🫟 (U+1FADF)', () => {
  assert.strictEqual(stringWidth('🫟'), 2);
  assert.strictEqual(stringWidth('Liquid 🫟 Editor'), 16); // 6 + 1 + 2 + 1 + 6 = 16
  assert.strictEqual(stringWidth('🚀'), 2);
  assert.strictEqual(stringWidth('✨'), 2);
});

test('Unicode - Arabic script display width and RTL detection', () => {
  // Arabic base characters have width 1 per letter
  assert.strictEqual(stringWidth('مصروف'), 5);
  // Arabic with tashkeel (fatha, damma, kasra, shadda) should not add extra width
  assert.strictEqual(stringWidth('مَصْرُوفٌ'), 5);
  assert.strictEqual(isRtlString('مصروف'), true);
  assert.strictEqual(isRtlString('hello'), false);
});

test('Unicode - Truncate to width with wide characters', () => {
  const truncated = truncateToWidth('Liquid 🫟 Web', 10, '…');
  assert.ok(stringWidth(truncated) <= 10, 'Truncated width must be <= 10');
  assert.ok(truncated.endsWith('…'));
});

test('Unicode - Pad to width', () => {
  const padded = padWidth('🫟', 6, 'left');
  assert.strictEqual(stringWidth(padded), 6);
  assert.strictEqual(padded, '🫟    ');
});
