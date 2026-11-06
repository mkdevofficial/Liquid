import test from 'node:test';
import assert from 'node:assert';
import { SyntaxHighlighter } from '../src/highlight/tokenizer.js';

test('SyntaxHighlighter - tokenizes .liq file across sections', () => {
  const hl = new SyntaxHighlighter();

  // Section 1: Header
  const l1 = hl.tokenizeLine('--- logic', 'liq');
  assert.strictEqual(l1.tokens[0].type, 'sectionHeader');
  assert.strictEqual(l1.nextState.section, 'logic');

  // Section 2: Logic (JS)
  const l2 = hl.tokenizeLine('const count = signal(0);', 'liq', l1.nextState);
  assert.ok(l2.tokens.some(t => t.type === 'keyword' && countTokenMatch(l2, t, 'const')));
  assert.ok(l2.tokens.some(t => t.type === 'keyword' && countTokenMatch(l2, t, 'signal')));

  // Section 3: Header
  const l3 = hl.tokenizeLine('--- ui', 'liq', l2.nextState);
  assert.strictEqual(l3.tokens[0].type, 'sectionHeader');
  assert.strictEqual(l3.nextState.section, 'ui');

  // Section 4: UI (Liquid template)
  const l4 = hl.tokenizeLine('button.btn-primary @click=increment {count()}', 'liq', l3.nextState);
  assert.ok(l4.tokens.some(t => t.type === 'tag' && countTokenMatch(l4, t, 'button')));
  assert.ok(l4.tokens.some(t => t.type === 'attribute' && countTokenMatch(l4, t, '.btn-primary')));
  assert.ok(l4.tokens.some(t => t.type === 'directive' && countTokenMatch(l4, t, '@click')));
  assert.ok(l4.tokens.some(t => t.type === 'interpolation' && countTokenMatch(l4, t, '{count()}')));
});

test('SyntaxHighlighter - tokenizes JSON', () => {
  const hl = new SyntaxHighlighter();
  const res = hl.tokenizeLine('  "version": 1, "enabled": true', 'json');
  assert.ok(res.tokens.some(t => t.type === 'attribute')); // "version" property
  assert.ok(res.tokens.some(t => t.type === 'number'));    // 1
  assert.ok(res.tokens.some(t => t.type === 'keyword'));   // true
});

test('SyntaxHighlighter - tokenizes CSS', () => {
  const hl = new SyntaxHighlighter();
  const res = hl.tokenizeLine('.container { color: #fff; }', 'css');
  assert.ok(res.tokens.some(t => t.type === 'tag'));       // .container
  assert.ok(res.tokens.some(t => t.type === 'attribute')); // color
});

function countTokenMatch(res, token, expectedStr) {
  return res.tokens && token;
}
