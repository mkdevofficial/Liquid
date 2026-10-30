import test from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../src/tokenizer.js';
import { parse, parseInterpolatedText } from '../src/parser.js';

test('Parser - parseInterpolatedText', () => {
  const parts = parseInterpolatedText('Hello {name}, you have {count()} items!');
  assert.deepStrictEqual(parts, [
    { type: 'raw', value: 'Hello ' },
    { type: 'expr', value: 'name' },
    { type: 'raw', value: ', you have ' },
    { type: 'expr', value: 'count()' },
    { type: 'raw', value: ' items!' }
  ]);

  const escaped = parseInterpolatedText('Literal \\{braces} here');
  assert.deepStrictEqual(escaped, [
    { type: 'raw', value: 'Literal {braces} here' }
  ]);
});

test('Parser - nested UI tree structure', () => {
  const src = `
main#root
  header.nav
    h1 Liquid
  section.content
    p Welcome to the new world!
`;
  const tokens = tokenize(src);
  const ast = parse(tokens, { source: src });

  assert.strictEqual(ast.template.length, 1);
  const root = ast.template[0];
  assert.strictEqual(root.tag, 'main');
  assert.strictEqual(root.id, 'root');
  assert.strictEqual(root.children.length, 2);

  const header = root.children[0];
  assert.strictEqual(header.tag, 'header');
  assert.strictEqual(header.children[0].tag, 'h1');
  assert.strictEqual(header.children[0].children[0].parts[0].value, 'Liquid');
});

test('Parser - if / elseif / else blocks', () => {
  const src = `
if count() > 10
  p High
elseif count() > 0
  p Positive
else
  p Zero or Negative
`;
  const tokens = tokenize(src);
  const ast = parse(tokens, { source: src });

  assert.strictEqual(ast.template.length, 1);
  const ifBlock = ast.template[0];
  assert.strictEqual(ifBlock.type, 'IfBlock');
  assert.strictEqual(ifBlock.test, 'count() > 10');
  assert.strictEqual(ifBlock.consequent[0].tag, 'p');

  const elseifBlock = ifBlock.alternate;
  assert.strictEqual(elseifBlock.type, 'IfBlock');
  assert.strictEqual(elseifBlock.test, 'count() > 0');

  const elseBlock = elseifBlock.alternate;
  assert.ok(Array.isArray(elseBlock));
  assert.strictEqual(elseBlock[0].tag, 'p');
});

test('Parser - each blocks with key and index', () => {
  const src = `
each items() as item, idx (item.id)
  li.item #{idx}: {item.title}
`;
  const tokens = tokenize(src);
  const ast = parse(tokens, { source: src });

  assert.strictEqual(ast.template.length, 1);
  const eachBlock = ast.template[0];
  assert.strictEqual(eachBlock.type, 'EachBlock');
  assert.strictEqual(eachBlock.collection, 'items()');
  assert.strictEqual(eachBlock.item, 'item');
  assert.strictEqual(eachBlock.index, 'idx');
  assert.strictEqual(eachBlock.key, 'item.id');
  assert.strictEqual(eachBlock.children.length, 1);
  assert.strictEqual(eachBlock.children[0].tag, 'li');
});
