import test from 'node:test';
import assert from 'node:assert';
import { compile } from '../packages/liquid-compiler/src/index.js';

test('Snapshot - static elements and attributes', () => {
  const source = `div#main.hero.fluid
  header.banner
    h1#title Welcome to Liquid
    p.subtitle The ultra-short UI framework
`;
  const res = compile(source, { file: 'Hero.liq' });
  assert.match(res.code, /element\("div", "data-l-[a-z0-9]+", \["hero","fluid"\]\)/);
  assert.match(res.code, /_el0\.id = "main"/);
  assert.match(res.code, /element\("header", "data-l-[a-z0-9]+", \["banner"\]\)/);
  assert.match(res.code, /text\("Welcome to Liquid"\)/);
});

test('Snapshot - fine-grained reactivity and two-way binding', () => {
  const source = `--- logic
import { signal } from 'liquid';
const name = signal('World');

--- ui
div.form-group
  input.input-field $value={name}
  p Hello, {name()}!
`;
  const res = compile(source, { file: 'Form.liq' });
  assert.match(res.code, /bindInput\(_el\d+, name, "value"\)/);
  assert.match(res.code, /bindText\(_t\d+, \(\) => \(name\(\)\)\)/);
});

test('Snapshot - scoped CSS and global escape hatches', () => {
  const source = `--- style
.card { border-radius: 8px; }
.card > h2 { color: #333; }
:global(.theme-dark) { background: #000; }
@global {
  body { margin: 0; }
}

--- ui
div.card
  h2 Card Title
`;
  const res = compile(source, { file: 'Card.liq' });
  assert.match(res.css, /\.card\[data-l-[a-z0-9]+\]\s*\{ border-radius: 8px; \}/);
  assert.match(res.css, /\.card\[data-l-[a-z0-9]+\] > h2\[data-l-[a-z0-9]+\]\s*\{ color: #333; \}/);
  assert.match(res.css, /\.theme-dark\s*\{ background: #000; \}/);
  assert.match(res.css, /body\s*\{\s*margin:\s*0;\s*\}/);
});
