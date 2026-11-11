import test from 'node:test';
import assert from 'node:assert';
import {
  parseSize,
  parseBoxShorthand,
  parseColor,
  hslToRgb,
  NAMED_COLORS,
  normalizeDeclaration,
  parseCSSDeclarations,
  parseScopedStyles,
  compile
} from '../src/index.js';

test('StyleNormalizer - parses sizes and units', () => {
  assert.strictEqual(parseSize('16px'), 16);
  assert.strictEqual(parseSize('24dp'), 24);
  assert.strictEqual(parseSize('50%'), '50%');
  assert.strictEqual(parseSize('auto'), 'auto');
  assert.strictEqual(parseSize(32), 32);
});

test('StyleNormalizer - expands box shorthands for margin and padding', () => {
  assert.deepStrictEqual(parseBoxShorthand('10px'), { top: 10, right: 10, bottom: 10, left: 10 });
  assert.deepStrictEqual(parseBoxShorthand('10px 20px'), { top: 10, right: 20, bottom: 10, left: 20 });
  assert.deepStrictEqual(parseBoxShorthand('5px 10px 15px'), { top: 5, right: 10, bottom: 15, left: 10 });
  assert.deepStrictEqual(parseBoxShorthand('1px 2px 3px 4px'), { top: 1, right: 2, bottom: 3, left: 4 });
});

test('StyleNormalizer - normalizes flexbox properties', () => {
  const css = `
    flex-direction: column;
    flex-wrap: wrap;
    flex-grow: 2;
    flex-shrink: 0;
    justify-content: space-between;
    align-items: center;
    gap: 12px 16px;
  `;
  const result = parseCSSDeclarations(css);
  assert.strictEqual(result.flexDirection, 'column');
  assert.strictEqual(result.flexWrap, 'wrap');
  assert.strictEqual(result.flexGrow, 2);
  assert.strictEqual(result.flexShrink, 0);
  assert.strictEqual(result.justifyContent, 'space-between');
  assert.strictEqual(result.alignItems, 'center');
  assert.strictEqual(result.rowGap, 12);
  assert.strictEqual(result.columnGap, 16);
});

test('StyleNormalizer - normalizes visual and typography properties', () => {
  const css = `
    background-color: #ffffff;
    border-radius: 8px;
    opacity: 0.9;
    elevation: 4;
    color: #111827;
    font-size: 14px;
    font-weight: bold;
    font-family: sans-serif;
    text-align: center;
    line-height: 20px;
  `;
  const result = parseCSSDeclarations(css);
  assert.strictEqual(result.backgroundColor, '#ffffff');
  assert.strictEqual(result.borderRadius, 8);
  assert.strictEqual(result.opacity, 0.9);
  assert.strictEqual(result.elevation, 4);
  assert.strictEqual(result.color, '#111827');
  assert.strictEqual(result.fontSize, 14);
  assert.strictEqual(result.fontWeight, 'bold');
  assert.strictEqual(result.fontFamily, 'sans-serif');
  assert.strictEqual(result.textAlign, 'center');
  assert.strictEqual(result.lineHeight, 20);
});

test('StyleNormalizer - parses scoped CSS rules into selector map', () => {
  const css = `
    .card {
      padding: 16px;
      background-color: #f3f4f6;
      border-radius: 12px;
    }
    .title {
      font-size: 18px;
      color: #1f2937;
    }
  `;
  const map = parseScopedStyles(css);
  assert.ok(map.card);
  assert.strictEqual(map.card.paddingTop, 16);
  assert.strictEqual(map.card.backgroundColor, '#f3f4f6');
  assert.strictEqual(map.card.borderRadius, 12);
  assert.ok(map.title);
  assert.strictEqual(map.title.fontSize, 18);
});

test('Compiler - compiles component with target=android injecting normalized setStyle', () => {
  const source = `--- style
.container {
  flex-direction: column;
  padding: 16px;
}
.btn {
  background-color: #3b82f6;
  border-radius: 6px;
}

--- ui
view.container
  button.btn style="margin-top: 8px;" Click
`;

  const result = compile(source, { target: 'android', file: 'TestComp.liq' });
  assert.ok(result.code.includes('setStyle'));
  assert.ok(result.code.includes('"flexDirection":"column"'));
  assert.ok(result.code.includes('"paddingTop":16'));
  assert.ok(result.code.includes('"backgroundColor":"#3b82f6"'));
  assert.ok(result.code.includes('"marginTop":8'));
  assert.ok(result.styles.container);
  assert.ok(result.styles.btn);
});

test('StyleNormalizer - handles rem units, border-bottom, text-decoration and diagnostics', () => {
  const css = `
    .header {
      padding: 1rem 2rem;
      font-size: 1.5rem;
    }
    .todo-item {
      border-bottom: 1px solid #f1f5f9;
    }
    .done {
      text-decoration: line-through;
      color: #94a3b8;
    }
    .btn {
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .btn:hover {
      background: #0369a1;
    }
  `;
  const diagnostics = [];
  const map = parseScopedStyles(css, { file: 'Test.liq', diagnostics });

  // rem checks
  assert.strictEqual(map.header.paddingTop, 16);
  assert.strictEqual(map.header.paddingRight, 32);
  assert.strictEqual(map.header.fontSize, 24);

  // border-bottom check
  assert.strictEqual(map['todo-item'].borderBottomWidth, 1);
  assert.strictEqual(map['todo-item'].borderBottomColor, '#f1f5f9');

  // text-decoration check
  assert.strictEqual(map.done.textDecoration, 'line-through');
  assert.strictEqual(map.done.color, '#94a3b8');

  // pseudo :hover check
  assert.ok(map.btn.pressedStyle);
  assert.strictEqual(map.btn.pressedStyle.backgroundColor, '#0369a1');

  // diagnostics check
  const cursorDiag = diagnostics.find(d => d.property === 'cursor');
  assert.ok(cursorDiag);
  assert.strictEqual(cursorDiag.status, 'info');

  const shadowDiag = diagnostics.find(d => d.property === 'box-shadow');
  assert.ok(shadowDiag);
  assert.strictEqual(shadowDiag.status, 'approximated');
});

test('StyleNormalizer - parses font-style: italic / normal', () => {
  const italic = normalizeDeclaration('font-style', 'italic');
  assert.strictEqual(italic.fontStyle, 'italic');

  const oblique = normalizeDeclaration('font-style', 'oblique');
  assert.strictEqual(oblique.fontStyle, 'italic');

  const normal = normalizeDeclaration('font-style', 'normal');
  assert.strictEqual(normal.fontStyle, 'normal');
});

test('StyleNormalizer - parses every CSS color format into ARGB hex', () => {
  // 1. Hex formats
  assert.strictEqual(parseColor('#fff'), '#ffffff');
  assert.strictEqual(parseColor('#0f172a'), '#0f172a');
  // #rgba (#8f0a -> alpha=aa, r=ff, g=00)
  assert.strictEqual(parseColor('#f0ab'), '#bbff00aa');
  // #rrggbbaa (alpha at end in CSS -> moved to front for Android ARGB)
  assert.strictEqual(parseColor('#0f172a80'), '#800f172a');

  // 2. Named colors (148 W3C standard colors)
  assert.strictEqual(parseColor('white'), '#ffffff');
  assert.strictEqual(parseColor('black'), '#000000');
  assert.strictEqual(parseColor('transparent'), '#00000000');
  assert.strictEqual(parseColor('darkslateblue'), '#483d8b');
  assert.strictEqual(parseColor('aliceblue'), '#f0f8ff');
  assert.strictEqual(parseColor('cornflowerblue'), '#6495ed');

  // 3. rgb() / rgba() formats (comma and slash/space, integers, percentages, alpha)
  assert.strictEqual(parseColor('rgb(15, 23, 42)'), '#0f172a');
  assert.strictEqual(parseColor('rgba(15, 23, 42, 1)'), '#0f172a');
  assert.strictEqual(parseColor('rgba(15, 23, 42, 0.5)'), '#800f172a');
  assert.strictEqual(parseColor('rgb(15 23 42 / 0.5)'), '#800f172a');
  assert.strictEqual(parseColor('rgb(100%, 0%, 0%)'), '#ff0000');
  assert.strictEqual(parseColor('rgba(100%, 100%, 100%, 50%)'), '#80ffffff');

  // 4. hsl() / hsla() formats
  assert.strictEqual(parseColor('hsl(0, 100%, 50%)'), '#ff0000'); // Pure red
  assert.strictEqual(parseColor('hsl(120, 100%, 50%)'), '#00ff00'); // Pure green
  assert.strictEqual(parseColor('hsl(240, 100%, 50%)'), '#0000ff'); // Pure blue
  assert.strictEqual(parseColor('hsla(210, 50%, 60%, 0.5)'), '#806699cc');
  assert.strictEqual(parseColor('hsl(0.5turn, 100%, 50%)'), '#00ffff'); // Cyan (180deg)
  assert.strictEqual(parseColor('hsl(200grad 100% 50% / 0.8)'), '#cc00ffff');

  // 5. CSS custom properties / variables: var(--name, fallback)
  assert.strictEqual(parseColor('var(--brand-color, #0f172a)'), '#0f172a');
  assert.strictEqual(parseColor('var(--badge-text, rgba(248, 250, 252, 0.9))'), '#e6f8fafc');
  assert.strictEqual(parseColor('var(--header-bg, darkslateblue)'), '#483d8b');

  // 6. Declarations with colors and opacity
  const decls = parseCSSDeclarations(`
    color: hsl(210, 50%, 60%);
    background-color: var(--bg, #0f172a);
    border-color: rgba(255, 255, 255, 0.2);
    opacity: 0.85;
  `);
  assert.strictEqual(decls.color, '#6699cc');
  assert.strictEqual(decls.backgroundColor, '#0f172a');
  assert.strictEqual(decls.borderColor, '#33ffffff');
  assert.strictEqual(decls.opacity, 0.85);
});

test('StyleNormalizer - preserves auto margins for flex alignment', () => {
  const css = `
    .badge {
      margin-left: auto;
    }
    .spacer {
      margin-right: auto;
    }
    .card {
      margin: 2rem auto;
    }
  `;
  const map = parseScopedStyles(css);
  assert.strictEqual(map.badge.marginLeft, 'auto');
  assert.strictEqual(map.spacer.marginRight, 'auto');
  assert.strictEqual(map.card.marginTop, 32);
  assert.strictEqual(map.card.marginBottom, 32);
  assert.strictEqual(map.card.marginLeft, 'auto');
  assert.strictEqual(map.card.marginRight, 'auto');
});

test('StyleNormalizer - parses direction and logical properties', () => {
  const css = `
    .rtl-box {
      direction: rtl;
      padding-inline: 16px 24px;
      margin-inline-start: 12px;
      margin-inline-end: auto;
      border-inline-start: 4px solid #38bdf8;
      border-inline-end-width: 2px;
      inset-inline-start: 8px;
    }
  `;
  const map = parseScopedStyles(css);
  assert.strictEqual(map['rtl-box'].direction, 'rtl');
  assert.strictEqual(map['rtl-box'].paddingInlineStart, 16);
  assert.strictEqual(map['rtl-box'].paddingInlineEnd, 24);
  assert.strictEqual(map['rtl-box'].marginInlineStart, 12);
  assert.strictEqual(map['rtl-box'].marginInlineEnd, 'auto');
  assert.strictEqual(map['rtl-box'].borderInlineStartWidth, 4);
  assert.strictEqual(map['rtl-box'].borderInlineStartColor, '#38bdf8');
  assert.strictEqual(map['rtl-box'].borderInlineEndWidth, 2);
  assert.strictEqual(map['rtl-box'].insetInlineStart, 8);
});
