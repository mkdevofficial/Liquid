/**
 * Liquid Compile-Time Style Normalizer
 *
 * Normalizes CSS declarations and rules into plain JS objects
 * for native Android layout and rendering without runtime CSS parsing.
 */

// Supported CSS property map to normalizer handlers
const SUPPORTED_PROPERTIES = new Set([
  // Layout mode
  'display',

  // Flex layout
  'flex-direction', 'flexdirection',
  'flex-wrap', 'flexwrap',
  'flex-grow', 'flexgrow',
  'flex-shrink', 'flexshrink',
  'flex-basis', 'flexbasis',
  'flex',
  'justify-content', 'justifycontent',
  'align-items', 'alignitems',
  'align-self', 'alignself',
  'gap',
  'row-gap', 'rowgap',
  'column-gap', 'columngap',

  // Dimensions
  'width',
  'height',
  'min-width', 'minwidth',
  'max-width', 'maxwidth',
  'min-height', 'minheight',
  'max-height', 'maxheight',

  // Spacing
  'margin',
  'margin-top', 'margintop',
  'margin-right', 'marginright',
  'margin-bottom', 'marginbottom',
  'margin-left', 'marginleft',
  'padding',
  'padding-top', 'paddingtop',
  'padding-right', 'paddingright',
  'padding-bottom', 'paddingbottom',
  'padding-left', 'paddingleft',

  // Direction & BiDi / Logical properties
  'direction', 'dir',
  'margin-inline-start', 'margininlinestart',
  'margin-inline-end', 'margininlineend',
  'margin-inline', 'margininline',
  'padding-inline-start', 'paddinginlinestart',
  'padding-inline-end', 'paddinginlineend',
  'padding-inline', 'paddinginline',
  'border-inline-start', 'borderinlinestart',
  'border-inline-start-width', 'borderinlinestartwidth',
  'border-inline-start-color', 'borderinlinestartcolor',
  'border-inline-end', 'borderinlineend',
  'border-inline-end-width', 'borderinlineendwidth',
  'border-inline-end-color', 'borderinlineendcolor',
  'inset-inline-start', 'insetinlinestart',
  'inset-inline-end', 'insetinlineend',

  // Positioning
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index', 'zindex',

  // Visual
  'overflow',
  'background-color', 'backgroundcolor', 'background',
  'border-width', 'borderwidth',
  'border-color', 'bordercolor',
  'border-radius', 'borderradius',
  'border-top-left-radius', 'bordertopleftradius',
  'border-top-right-radius', 'bordertoprightradius',
  'border-bottom-left-radius', 'borderbottomleftradius',
  'border-bottom-right-radius', 'borderbottomrightradius',
  'border',
  'border-top', 'bordertop',
  'border-top-width', 'bordertopwidth',
  'border-top-color', 'bordertopcolor',
  'border-bottom', 'borderbottom',
  'border-bottom-width', 'borderbottomwidth',
  'border-bottom-color', 'borderbottomcolor',
  'border-left', 'borderleft',
  'border-left-width', 'borderleftwidth',
  'border-left-color', 'borderleftcolor',
  'border-right', 'borderright',
  'border-right-width', 'borderrightwidth',
  'border-right-color', 'borderrightcolor',
  'opacity',
  'elevation',
  'box-shadow', 'boxshadow',

  // Typography
  'color',
  'font-size', 'fontsize',
  'font-weight', 'fontweight',
  'font-style', 'fontstyle',
  'font-family', 'fontfamily',
  'text-align', 'textalign',
  'line-height', 'lineheight',
  'letter-spacing', 'letterspacing',
  'text-decoration', 'textdecoration',
  'text-overflow', 'textoverflow',

  // Non-visual / Touch / Web-specific
  'cursor',
  'list-style', 'liststyle',
  'user-select', 'userselect',
  'transition'
]);

export const NAMED_COLORS = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
  transparent: '#00000000',
  none: '#00000000'
};

/**
 * Parse a CSS size value (e.g. "16px", "16dp", "1rem", "50%", "auto", 16) into normalized number or percentage.
 * Converts rem and em units assuming base 16px.
 */
export function parseSize(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim().toLowerCase();
  if (str === 'auto') return 'auto';
  if (str.endsWith('%')) {
    return str; // keep percentage string e.g. "50%"
  }
  if (str.endsWith('rem') || str.endsWith('em')) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num * 16 * 100) / 100;
  }
  if (str.endsWith('pt')) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num * 1.333 * 100) / 100;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse CSS 1-to-4 value shorthand (for margin, padding, border-radius).
 * Returns { top, right, bottom, left } or array.
 */
export function parseBoxShorthand(val) {
  if (typeof val === 'number') {
    return { top: val, right: val, bottom: val, left: val };
  }
  const parts = String(val).trim().split(/\s+/).filter(Boolean).map(parseSize);
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  if (parts.length >= 4) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Convert HSL values to RGB [0-255].
 * @param {number} h Hue in degrees [0, 360)
 * @param {number} s Saturation [0, 1]
 * @param {number} l Lightness [0, 1]
 * @returns {[number, number, number]} [r, g, b]
 */
export function hslToRgb(h, s, l) {
  let hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const lum = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hue < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hue < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hue < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hue < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255)
  ];
}

/**
 * Parse CSS color string into normalized hex format (#rrggbb or #aarrggbb) for Android Color.parseColor.
 * Supports:
 * - Hex: #rgb, #rgba, #rrggbb, #rrggbbaa (converts RGBA/RRGGBBAA to Android ARGB format)
 * - Named colors: all 148 standard W3C CSS colors + transparent
 * - rgb() / rgba(): comma or space/slash syntax, integer or percentage channels, float/percentage alpha
 * - hsl() / hsla(): comma or space/slash syntax, deg/rad/turn/grad hue, percentage sat/light, float/pct alpha
 * - CSS variables: var(--name, fallback) extracts and normalizes the fallback color
 */
export function parseColor(val) {
  if (!val) return '';
  let str = String(val).trim();

  // CSS variables: var(--name, fallback)
  if (str.startsWith('var(')) {
    const commaIdx = str.indexOf(',');
    if (commaIdx !== -1 && str.endsWith(')')) {
      const fallback = str.slice(commaIdx + 1, -1).trim();
      return parseColor(fallback);
    }
    return '';
  }

  const lower = str.toLowerCase();
  if (NAMED_COLORS[lower]) {
    return NAMED_COLORS[lower];
  }

  if (str.startsWith('#')) {
    // #rgb -> #rrggbb
    if (str.length === 4) {
      return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`.toLowerCase();
    }
    // #rgba -> #aarrggbb
    if (str.length === 5) {
      const a = `${str[4]}${str[4]}`;
      const r = `${str[1]}${str[1]}`;
      const g = `${str[2]}${str[2]}`;
      const b = `${str[3]}${str[3]}`;
      return `#${a}${r}${g}${b}`.toLowerCase();
    }
    // #rrggbb
    if (str.length === 7) {
      return str.toLowerCase();
    }
    // #rrggbbaa -> #aarrggbb (Android expects alpha first)
    if (str.length === 9) {
      const r = str.slice(1, 3);
      const g = str.slice(3, 5);
      const b = str.slice(5, 7);
      const a = str.slice(7, 9);
      return `#${a}${r}${g}${b}`.toLowerCase();
    }
    return str.toLowerCase();
  }

  // rgb(...) / rgba(...)
  if (/^rgba?\(/i.test(str)) {
    const content = str.replace(/^rgba?\s*\(/i, '').replace(/\)\s*$/, '').trim();
    let parts;
    if (content.includes(',')) {
      parts = content.split(',').map(s => s.trim());
    } else {
      const [rgbPart, aPart] = content.split('/').map(s => s?.trim());
      const rgbTokens = (rgbPart || '').split(/\s+/).filter(Boolean);
      parts = aPart ? [...rgbTokens, aPart] : rgbTokens;
    }
    if (parts.length >= 3) {
      const parseComp = (c) => {
        if (!c) return 0;
        if (c.endsWith('%')) return Math.round((parseFloat(c) / 100) * 255);
        return Math.round(parseFloat(c));
      };
      const r = Math.min(255, Math.max(0, parseComp(parts[0])));
      const g = Math.min(255, Math.max(0, parseComp(parts[1])));
      const b = Math.min(255, Math.max(0, parseComp(parts[2])));
      let a = 255;
      if (parts[3] !== undefined) {
        const aStr = parts[3].trim();
        const aVal = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
        a = Math.min(255, Math.max(0, Math.round(aVal * 255)));
      }
      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');
      if (a < 255) {
        const aHex = a.toString(16).padStart(2, '0');
        return `#${aHex}${rHex}${gHex}${bHex}`.toLowerCase();
      }
      return `#${rHex}${gHex}${bHex}`.toLowerCase();
    }
  }

  // hsl(...) / hsla(...)
  if (/^hsla?\(/i.test(str)) {
    const content = str.replace(/^hsla?\s*\(/i, '').replace(/\)\s*$/, '').trim();
    let parts;
    if (content.includes(',')) {
      parts = content.split(',').map(s => s.trim());
    } else {
      const [hslPart, aPart] = content.split('/').map(s => s?.trim());
      const hslTokens = (hslPart || '').split(/\s+/).filter(Boolean);
      parts = aPart ? [...hslTokens, aPart] : hslTokens;
    }
    if (parts.length >= 3) {
      let hStr = parts[0].toLowerCase();
      let h = 0;
      if (hStr.endsWith('turn')) h = parseFloat(hStr) * 360;
      else if (hStr.endsWith('grad')) h = parseFloat(hStr) * 0.9;
      else if (hStr.endsWith('rad')) h = parseFloat(hStr) * (180 / Math.PI);
      else h = parseFloat(hStr);

      let sStr = parts[1];
      let s = sStr.endsWith('%') ? parseFloat(sStr) / 100 : parseFloat(sStr);
      let lStr = parts[2];
      let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);

      let a = 255;
      if (parts[3] !== undefined) {
        const aStr = parts[3].trim();
        const aVal = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
        a = Math.min(255, Math.max(0, Math.round(aVal * 255)));
      }

      const [r, g, b] = hslToRgb(h, s, l);
      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');
      if (a < 255) {
        const aHex = a.toString(16).padStart(2, '0');
        return `#${aHex}${rHex}${gHex}${bHex}`.toLowerCase();
      }
      return `#${rHex}${gHex}${bHex}`.toLowerCase();
    }
  }

  return str;
}

/**
 * Normalize a single CSS declaration property and value.
 *
 * @param {string} rawProp
 * @param {string|number} rawVal
 * @param {object} [options={}]
 * @returns {object} Normalized properties
 */
export function normalizeDeclaration(rawProp, rawVal, options = {}) {
  const isDev = Boolean(options.dev);
  const prop = rawProp.trim().toLowerCase();
  const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

  function reportDiagnostic(status, message) {
    if (options.diagnostics) {
      options.diagnostics.push({
        file: options.file || 'unknown',
        line: options.currentLine || 1,
        property: rawProp,
        status,
        message
      });
    }
  }

  if (!SUPPORTED_PROPERTIES.has(prop)) {
    reportDiagnostic('unsupported', `Unknown or unsupported Android style property "${rawProp}". It will be ignored on native Android.`);
    if (isDev) {
      console.warn(`[Liquid Warning] Unknown or unsupported Android style property "${rawProp}". It will be ignored on native Android.`);
    }
    return {};
  }

  switch (prop) {
    // Display mode
    case 'display': {
      const v = String(val).toLowerCase();
      if (v === 'flex') {
        return { display: 'flex', flexDirection: 'row' };
      }
      if (v === 'none') {
        return { display: 'none' };
      }
      if (v === 'block') {
        return { display: 'block', flexDirection: 'column' };
      }
      return { display: v };
    }

    // Flex direction
    case 'flex-direction':
    case 'flexdirection': {
      const v = String(val).toLowerCase();
      if (['row', 'column', 'row-reverse', 'column-reverse'].includes(v)) {
        return { flexDirection: v };
      }
      return { flexDirection: 'row' };
    }

    // Flex wrap
    case 'flex-wrap':
    case 'flexwrap': {
      const v = String(val).toLowerCase();
      return { flexWrap: v === 'wrap' ? 'wrap' : (v === 'wrap-reverse' ? 'wrap-reverse' : 'nowrap') };
    }

    // Flex grow / shrink / basis
    case 'flex-grow':
    case 'flexgrow':
      return { flexGrow: parseFloat(val) || 0 };

    case 'flex-shrink':
    case 'flexshrink':
      return { flexShrink: parseFloat(val) || 0 };

    case 'flex-basis':
    case 'flexbasis':
      return { flexBasis: parseSize(val) };

    case 'flex': {
      const parts = String(val).trim().split(/\s+/);
      if (parts.length === 1) {
        const num = parseFloat(parts[0]);
        return { flexGrow: isNaN(num) ? 0 : num, flexShrink: 1, flexBasis: 0 };
      }
      return {
        flexGrow: parseFloat(parts[0]) || 0,
        flexShrink: parseFloat(parts[1]) || 0,
        flexBasis: parts[2] ? parseSize(parts[2]) : 0
      };
    }

    // Justify content
    case 'justify-content':
    case 'justifycontent': {
      const v = String(val).toLowerCase();
      return { justifyContent: v };
    }

    // Align items
    case 'align-items':
    case 'alignitems': {
      const v = String(val).toLowerCase();
      return { alignItems: v };
    }

    // Align self
    case 'align-self':
    case 'alignself': {
      const v = String(val).toLowerCase();
      return { alignSelf: v };
    }

    // Gap
    case 'gap': {
      const parts = String(val).trim().split(/\s+/).map(parseSize);
      if (parts.length === 1) {
        return { rowGap: parts[0], columnGap: parts[0] };
      }
      return { rowGap: parts[0], columnGap: parts[1] };
    }

    case 'row-gap':
    case 'rowgap':
      return { rowGap: parseSize(val) };

    case 'column-gap':
    case 'columngap':
      return { columnGap: parseSize(val) };

    // Dimensions
    case 'width':
      return { width: parseSize(val) };
    case 'height':
      return { height: parseSize(val) };
    case 'min-width':
    case 'minwidth':
      return { minWidth: parseSize(val) };
    case 'max-width':
    case 'maxwidth':
      return { maxWidth: parseSize(val) };
    case 'min-height':
    case 'minheight':
      return { minHeight: parseSize(val) };
    case 'max-height':
    case 'maxheight':
      return { maxHeight: parseSize(val) };

    // Padding
    case 'padding': {
      const b = parseBoxShorthand(val);
      return {
        paddingTop: b.top,
        paddingRight: b.right,
        paddingBottom: b.bottom,
        paddingLeft: b.left
      };
    }
    case 'padding-top':
    case 'paddingtop':
      return { paddingTop: parseSize(val) };
    case 'padding-right':
    case 'paddingright':
      return { paddingRight: parseSize(val) };
    case 'padding-bottom':
    case 'paddingbottom':
      return { paddingBottom: parseSize(val) };
    case 'padding-left':
    case 'paddingleft':
      return { paddingLeft: parseSize(val) };

    // Margin
    case 'margin': {
      const b = parseBoxShorthand(val);
      const res = {};
      if (b.top !== undefined) res.marginTop = b.top === 'auto' ? 'auto' : b.top;
      if (b.right !== undefined) res.marginRight = b.right === 'auto' ? 'auto' : b.right;
      if (b.bottom !== undefined) res.marginBottom = b.bottom === 'auto' ? 'auto' : b.bottom;
      if (b.left !== undefined) res.marginLeft = b.left === 'auto' ? 'auto' : b.left;
      return res;
    }
    case 'margin-top':
    case 'margintop':
      return { marginTop: val === 'auto' ? 'auto' : parseSize(val) };
    case 'margin-right':
    case 'marginright':
      return { marginRight: val === 'auto' ? 'auto' : parseSize(val) };
    case 'margin-bottom':
    case 'marginbottom':
      return { marginBottom: val === 'auto' ? 'auto' : parseSize(val) };
    case 'margin-left':
    case 'marginleft':
      return { marginLeft: val === 'auto' ? 'auto' : parseSize(val) };

    // Direction & BiDi
    case 'direction':
    case 'dir': {
      const v = String(val).toLowerCase().trim();
      return { direction: v === 'rtl' ? 'rtl' : 'ltr' };
    }

    // Logical padding
    case 'padding-inline':
    case 'paddinginline': {
      const parts = String(val).trim().split(/\s+/).map(parseSize);
      if (parts.length === 1) {
        return { paddingInlineStart: parts[0], paddingInlineEnd: parts[0] };
      }
      return { paddingInlineStart: parts[0], paddingInlineEnd: parts[1] };
    }
    case 'padding-inline-start':
    case 'paddinginlinestart':
      return { paddingInlineStart: parseSize(val) };
    case 'padding-inline-end':
    case 'paddinginlineend':
      return { paddingInlineEnd: parseSize(val) };

    // Logical margin
    case 'margin-inline':
    case 'margininline': {
      const parts = String(val).trim().split(/\s+/);
      const s = parts[0] === 'auto' ? 'auto' : parseSize(parts[0]);
      const e = parts.length > 1 ? (parts[1] === 'auto' ? 'auto' : parseSize(parts[1])) : s;
      return { marginInlineStart: s, marginInlineEnd: e };
    }
    case 'margin-inline-start':
    case 'margininlinestart':
      return { marginInlineStart: val === 'auto' ? 'auto' : parseSize(val) };
    case 'margin-inline-end':
    case 'margininlineend':
      return { marginInlineEnd: val === 'auto' ? 'auto' : parseSize(val) };

    // Logical borders
    case 'border-inline-start':
    case 'borderinlinestart': {
      const parts = String(val).trim().split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d/.test(p)) res.borderInlineStartWidth = parseSize(p);
        else if (p !== 'solid' && p !== 'dashed') res.borderInlineStartColor = parseColor(p);
      }
      return res;
    }
    case 'border-inline-start-width':
    case 'borderinlinestartwidth':
      return { borderInlineStartWidth: parseSize(val) };
    case 'border-inline-start-color':
    case 'borderinlinestartcolor':
      return { borderInlineStartColor: parseColor(val) };

    case 'border-inline-end':
    case 'borderinlineend': {
      const parts = String(val).trim().split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d/.test(p)) res.borderInlineEndWidth = parseSize(p);
        else if (p !== 'solid' && p !== 'dashed') res.borderInlineEndColor = parseColor(p);
      }
      return res;
    }
    case 'border-inline-end-width':
    case 'borderinlineendwidth':
      return { borderInlineEndWidth: parseSize(val) };
    case 'border-inline-end-color':
    case 'borderinlineendcolor':
      return { borderInlineEndColor: parseColor(val) };

    // Logical inset
    case 'inset-inline-start':
    case 'insetinlinestart':
      return { insetInlineStart: parseSize(val) };
    case 'inset-inline-end':
    case 'insetinlineend':
      return { insetInlineEnd: parseSize(val) };

    // Position
    case 'position': {
      const v = String(val).toLowerCase();
      return { position: v === 'absolute' ? 'absolute' : 'relative' };
    }
    case 'top':
      return { top: parseSize(val) };
    case 'right':
      return { right: parseSize(val) };
    case 'bottom':
      return { bottom: parseSize(val) };
    case 'left':
      return { left: parseSize(val) };
    case 'z-index':
    case 'zindex':
      return { zIndex: parseInt(val, 10) || 0 };

    // Visual
    case 'overflow': {
      const v = String(val).toLowerCase();
      return { overflow: v };
    }
    case 'background-color':
    case 'backgroundcolor':
    case 'background':
      return { backgroundColor: parseColor(val) };

    case 'border-width':
    case 'borderwidth':
      return { borderWidth: parseSize(val) };

    case 'border-color':
    case 'bordercolor':
      return { borderColor: parseColor(val) };

    case 'border-radius':
    case 'borderradius': {
      const b = parseBoxShorthand(val);
      return {
        borderRadius: b.top,
        borderTopLeftRadius: b.top,
        borderTopRightRadius: b.right,
        borderBottomRightRadius: b.bottom,
        borderBottomLeftRadius: b.left
      };
    }

    case 'border-top-left-radius':
    case 'bordertopleftradius':
      return { borderTopLeftRadius: parseSize(val), borderRadius: parseSize(val) };
    case 'border-top-right-radius':
    case 'bordertoprightradius':
      return { borderTopRightRadius: parseSize(val), borderRadius: parseSize(val) };
    case 'border-bottom-left-radius':
    case 'borderbottomleftradius':
      return { borderBottomLeftRadius: parseSize(val), borderRadius: parseSize(val) };
    case 'border-bottom-right-radius':
    case 'borderbottomrightradius':
      return { borderBottomRightRadius: parseSize(val), borderRadius: parseSize(val) };

    case 'border': {
      const strVal = String(val).trim().toLowerCase();
      if (strVal === 'none' || strVal === '0') {
        return { borderWidth: 0 };
      }
      const parts = strVal.split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d+(\.\d+)?(px|dp|rem|em)?$/.test(p)) {
          res.borderWidth = parseSize(p);
        } else if (p.startsWith('#') || p.startsWith('rgb') || NAMED_COLORS[p]) {
          res.borderColor = parseColor(p);
        }
      }
      return res;
    }

    // Per-side borders
    case 'border-bottom':
    case 'borderbottom': {
      const strVal = String(val).trim().toLowerCase();
      if (strVal === 'none' || strVal === '0') {
        return { borderBottomWidth: 0 };
      }
      const parts = strVal.split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d+(\.\d+)?(px|dp|rem|em)?$/.test(p)) {
          res.borderBottomWidth = parseSize(p);
        } else if (p.startsWith('#') || p.startsWith('rgb') || NAMED_COLORS[p]) {
          res.borderBottomColor = parseColor(p);
        }
      }
      return res;
    }
    case 'border-bottom-width':
    case 'borderbottomwidth':
      return { borderBottomWidth: parseSize(val) };
    case 'border-bottom-color':
    case 'borderbottomcolor':
      return { borderBottomColor: parseColor(val) };

    case 'border-top':
    case 'bordertop': {
      const strVal = String(val).trim().toLowerCase();
      if (strVal === 'none' || strVal === '0') {
        return { borderTopWidth: 0 };
      }
      const parts = strVal.split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d+(\.\d+)?(px|dp|rem|em)?$/.test(p)) {
          res.borderTopWidth = parseSize(p);
        } else if (p.startsWith('#') || p.startsWith('rgb') || NAMED_COLORS[p]) {
          res.borderTopColor = parseColor(p);
        }
      }
      return res;
    }
    case 'border-top-width':
    case 'bordertopwidth':
      return { borderTopWidth: parseSize(val) };
    case 'border-top-color':
    case 'bordertopcolor':
      return { borderTopColor: parseColor(val) };

    case 'border-left':
    case 'borderleft': {
      const strVal = String(val).trim().toLowerCase();
      if (strVal === 'none' || strVal === '0') {
        return { borderLeftWidth: 0 };
      }
      const parts = strVal.split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d+(\.\d+)?(px|dp|rem|em)?$/.test(p)) {
          res.borderLeftWidth = parseSize(p);
        } else if (p.startsWith('#') || p.startsWith('rgb') || NAMED_COLORS[p]) {
          res.borderLeftColor = parseColor(p);
        }
      }
      return res;
    }
    case 'border-left-width':
    case 'borderleftwidth':
      return { borderLeftWidth: parseSize(val) };
    case 'border-left-color':
    case 'borderleftcolor':
      return { borderLeftColor: parseColor(val) };

    case 'border-right':
    case 'borderright': {
      const strVal = String(val).trim().toLowerCase();
      if (strVal === 'none' || strVal === '0') {
        return { borderRightWidth: 0 };
      }
      const parts = strVal.split(/\s+/);
      const res = {};
      for (const p of parts) {
        if (/^\d+(\.\d+)?(px|dp|rem|em)?$/.test(p)) {
          res.borderRightWidth = parseSize(p);
        } else if (p.startsWith('#') || p.startsWith('rgb') || NAMED_COLORS[p]) {
          res.borderRightColor = parseColor(p);
        }
      }
      return res;
    }
    case 'border-right-width':
    case 'borderrightwidth':
      return { borderRightWidth: parseSize(val) };
    case 'border-right-color':
    case 'borderrightcolor':
      return { borderRightColor: parseColor(val) };

    case 'opacity':
      return { opacity: Math.max(0, Math.min(1, parseFloat(val) || 1)) };

    case 'elevation':
      return { elevation: parseSize(val) };

    case 'box-shadow':
    case 'boxshadow': {
      // Extract blur / Y-offset as elevation approximation
      const nums = String(val).match(/\d+(\.\d+)?(px|dp|rem|em)?/g);
      const elev = nums && nums[1] ? parseSize(nums[1]) : 4;
      reportDiagnostic('approximated', `'box-shadow' is approximated using native elevation (${elev}dp) and outline shadow.`);
      return { elevation: elev };
    }

    // Typography
    case 'color':
      return { color: parseColor(val) };

    case 'font-size':
    case 'fontsize':
      return { fontSize: parseSize(val) };

    case 'font-weight':
    case 'fontweight': {
      const v = String(val).toLowerCase();
      return { fontWeight: v };
    }

    case 'font-style':
    case 'fontstyle': {
      const v = String(val).toLowerCase();
      if (v.includes('italic') || v.includes('oblique')) {
        return { fontStyle: 'italic' };
      }
      return { fontStyle: 'normal' };
    }

    case 'font-family':
    case 'fontfamily': {
      const v = String(val).toLowerCase().replace(/['"]/g, '').trim();
      reportDiagnostic('approximated', `'font-family' (${v}) is mapped to system native typeface.`);
      return { fontFamily: v };
    }

    case 'text-align':
    case 'textalign': {
      const v = String(val).toLowerCase();
      return { textAlign: v };
    }

    case 'line-height':
    case 'lineheight':
      return { lineHeight: parseSize(val) };

    case 'letter-spacing':
    case 'letterspacing':
      return { letterSpacing: parseSize(val) };

    case 'text-decoration':
    case 'textdecoration': {
      const v = String(val).toLowerCase();
      if (v.includes('line-through')) return { textDecoration: 'line-through' };
      if (v.includes('underline')) return { textDecoration: 'underline' };
      if (v.includes('none')) return { textDecoration: 'none' };
      return { textDecoration: v };
    }

    case 'text-overflow':
    case 'textoverflow': {
      const v = String(val).toLowerCase();
      return { textOverflow: v };
    }

    // Touch / Mobile / Irrelevant on native views (reported as info or ignored)
    case 'cursor':
      reportDiagnostic('info', `'cursor: ${val}' has no effect on Android touchscreens (ignored).`);
      return {};

    case 'list-style':
    case 'liststyle':
      reportDiagnostic('info', `'list-style: ${val}' is unsupported; Android views have no default bullet lists (ignored).`);
      return {};

    case 'user-select':
    case 'userselect':
      reportDiagnostic('info', `'user-select: ${val}' is ignored on native Android views.`);
      return {};

    case 'transition':
      reportDiagnostic('info', `'transition' animations are ignored on native Android views.`);
      return {};

    default:
      return {};
  }
}

/**
 * Parse a CSS declarations block (e.g. "padding: 16px; background-color: #fff;") into a normalized object.
 *
 * @param {string} cssDecls
 * @param {object} [options={}]
 * @returns {object}
 */
export function parseCSSDeclarations(cssDecls, options = {}) {
  const result = {};
  if (!cssDecls || typeof cssDecls !== 'string') return result;

  const decls = cssDecls.split(';');
  for (const decl of decls) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    const normalized = normalizeDeclaration(prop, val, options);
    Object.assign(result, normalized);
  }

  return result;
}

/**
 * Parse CSS stylesheet text and extract a selector -> normalized style map.
 * Also handles compound selectors (e.g. header.header), pseudo-classes (:hover, :focus),
 * and collects diagnostics.
 *
 * @param {string} cssText
 * @param {object} [options={}]
 * @returns {Record<string, object>}
 */
export function parseScopedStyles(cssText, options = {}) {
  const styleMap = {};
  if (!cssText || typeof cssText !== 'string') return styleMap;

  const baseLine = options.baseLine || 1;
  const lines = cssText.split(/\r?\n/);

  let i = 0;
  const len = cssText.length;

  while (i < len) {
    // Skip comments
    if (cssText[i] === '/' && cssText[i + 1] === '*') {
      const endComment = cssText.indexOf('*/', i + 2);
      if (endComment === -1) break;
      i = endComment + 2;
      continue;
    }

    // Skip @ rules
    if (cssText[i] === '@') {
      const openBrace = cssText.indexOf('{', i);
      const semi = cssText.indexOf(';', i);
      if (semi !== -1 && (openBrace === -1 || semi < openBrace)) {
        i = semi + 1;
        continue;
      }
      if (openBrace !== -1) {
        let depth = 1;
        let j = openBrace + 1;
        while (j < len && depth > 0) {
          if (cssText[j] === '{') depth++;
          else if (cssText[j] === '}') depth--;
          j++;
        }
        i = j;
        continue;
      }
    }

    const openBrace = cssText.indexOf('{', i);
    if (openBrace === -1) break;

    const selector = cssText.slice(i, openBrace).trim();
    const closeBrace = cssText.indexOf('}', openBrace);
    if (closeBrace === -1) break;

    // Calculate approximate line number in source
    const textBefore = cssText.slice(0, openBrace);
    const lineNum = baseLine + (textBefore.match(/\n/g) || []).length;
    const ruleOptions = { ...options, currentLine: lineNum };

    const body = cssText.slice(openBrace + 1, closeBrace);
    const normalized = parseCSSDeclarations(body, ruleOptions);

    // Split multiple selectors (e.g. .btn, .button)
    const rawSelectors = selector.split(',').map(s => s.trim()).filter(Boolean);

    for (const rawSel of rawSelectors) {
      // Strip :global(...) wrapper if present
      let sel = rawSel;
      const globalMatch = sel.match(/^:global\(([^)]+)\)$/);
      if (globalMatch) {
        sel = globalMatch[1].trim();
      }

      // Check for pseudo-classes e.g. .btn:hover, .btn:active, .input-text:focus
      let pseudo = null;
      if (sel.includes(':')) {
        const pIdx = sel.indexOf(':');
        pseudo = sel.slice(pIdx + 1).toLowerCase();
        sel = sel.slice(0, pIdx).trim();
      }

      const cleanSel = sel.replace(/^[\.:]/, '');

      // Helper to assign styles under a key
      function assignToKey(k) {
        if (!k) return;
        styleMap[k] = styleMap[k] || {};
        if (pseudo === 'hover' || pseudo === 'active') {
          styleMap[k].pressedStyle = Object.assign(styleMap[k].pressedStyle || {}, normalized);
        } else if (pseudo === 'focus') {
          styleMap[k].focusStyle = Object.assign(styleMap[k].focusStyle || {}, normalized);
        } else {
          Object.assign(styleMap[k], normalized);
        }
      }

      assignToKey(cleanSel);
      assignToKey(sel); // also under full selector if different

      // If compound selector e.g. "header.header" or "h1.logo"
      if (sel.includes('.')) {
        const [tag, cls] = sel.split('.');
        if (tag) assignToKey(tag);
        if (cls) assignToKey(cls);
        if (tag && cls) assignToKey(`${tag}.${cls}`);
      }
    }

    i = closeBrace + 1;
  }

  return styleMap;
}
