import test from 'node:test';
import assert from 'node:assert';
import { tokenize, TokenType } from '../src/tokenizer.js';
import { LiquidSyntaxError } from '../src/errors.js';

test('Tokenizer - simple element and shorthand parsing', () => {
  const src = `div#app.container.fluid\n  h1 Welcome`;
  const tokens = tokenize(src);

  const tagToken = tokens.find(t => t.type === TokenType.TAG && t.name === 'div');
  assert.ok(tagToken);
  assert.strictEqual(tagToken.id, 'app');
  assert.deepStrictEqual(tagToken.classes, ['container', 'fluid']);

  const indentToken = tokens.find(t => t.type === TokenType.INDENT);
  assert.ok(indentToken);
  assert.strictEqual(indentToken.level, 2);

  const h1Token = tokens.find(t => t.type === TokenType.TAG && t.name === 'h1');
  assert.ok(h1Token);

  const textToken = tokens.find(t => t.type === TokenType.TEXT && t.value === 'Welcome');
  assert.ok(textToken);
});

test('Tokenizer - section switching (logic, style, ui)', () => {
  const src = `--- logic
const count = 10;
--- style
.btn { color: red; }
--- ui
button.btn Click`;

  const tokens = tokenize(src);
  const logicSection = tokens.find(t => t.type === TokenType.SECTION && t.name === 'logic');
  assert.ok(logicSection);
  assert.strictEqual(logicSection.content.trim(), 'const count = 10;');

  const styleSection = tokens.find(t => t.type === TokenType.SECTION && t.name === 'style');
  assert.ok(styleSection);
  assert.strictEqual(styleSection.content.trim(), '.btn { color: red; }');

  const btnToken = tokens.find(t => t.type === TokenType.TAG && t.name === 'button');
  assert.ok(btnToken);
  assert.deepStrictEqual(btnToken.classes, ['btn']);
});

test('Tokenizer - directives (@event, $bind)', () => {
  const src = `input.field $value={name} @input.prevent=onInput`;
  const tokens = tokenize(src);

  const bind = tokens.find(t => t.type === TokenType.DIRECTIVE_BIND);
  assert.ok(bind);
  assert.strictEqual(bind.prop, 'value');
  assert.strictEqual(bind.target, 'name');

  const ev = tokens.find(t => t.type === TokenType.DIRECTIVE_EVENT);
  assert.ok(ev);
  assert.strictEqual(ev.name, 'input');
  assert.deepStrictEqual(ev.modifiers, ['prevent']);
  assert.strictEqual(ev.handler, 'onInput');
});

test('Tokenizer - rejects mixed tabs and spaces with caret excerpt', () => {
  const src = `div\n \t p Invalid`;
  assert.throws(() => tokenize(src, { file: 'Test.liq' }), (err) => {
    assert.ok(err instanceof LiquidSyntaxError);
    assert.match(err.message, /Mixed tabs and spaces/);
    assert.match(err.message, /Test\.liq:2/);
    return true;
  });
});

test('Tokenizer - rejects tabs in indentation', () => {
  const src = `div\n\tp Invalid`;
  assert.throws(() => tokenize(src, { file: 'Tabs.liq' }), (err) => {
    assert.ok(err instanceof LiquidSyntaxError);
    assert.match(err.message, /Tab characters/);
    return true;
  });
});

test('Tokenizer - Unicode and Arabic RTL support', () => {
  const src = `div dir="rtl" lang="ar"\n  h1 أهلاً بكم في ليكويد 🫟`;
  const tokens = tokenize(src);

  const text = tokens.find(t => t.type === TokenType.TEXT);
  assert.ok(text);
  assert.strictEqual(text.value, 'أهلاً بكم في ليكويد 🫟');
});
