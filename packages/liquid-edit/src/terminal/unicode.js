/**
 * Unicode and Display Width Utilities for liquid-edit
 * Accurate grapheme clustering, display column measurement, and truncation.
 */

let segmenter = null;
try {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
} catch {
  segmenter = null;
}

/**
 * Return display width of a single Unicode code point.
 * 0 = non-printing / combining mark / zero-width
 * 1 = standard half-width / Latin / Arabic letter
 * 2 = East Asian Wide / Fullwidth / Emoji
 */
export function codePointWidth(cp) {
  if (cp === 0 || cp === 0x09) {
    // NUL or TAB (tab expanded separately)
    return 0;
  }

  // Control characters
  if ((cp >= 0x00 && cp <= 0x1f) || (cp >= 0x7f && cp <= 0x9f)) {
    return 0;
  }

  // Combining diacritical marks
  if (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  ) {
    return 0;
  }

  // Arabic vowels / tashkeel (harakat) are zero-width combining marks
  if (
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06dc) ||
    (cp >= 0x06df && cp <= 0x06e4) ||
    (cp >= 0x06e7 && cp <= 0x06e8) ||
    (cp >= 0x06ea && cp <= 0x06ed)
  ) {
    return 0;
  }

  // Zero-width spaces, joiners, formatting
  if (
    cp === 0x200b || // Zero Width Space
    cp === 0x200c || // Zero Width Non-Joiner (ZWNJ)
    cp === 0x200d || // Zero Width Joiner (ZWJ)
    cp === 0x200e || // LTR mark
    cp === 0x200f || // RTL mark
    cp === 0xfeff || // Byte Order Mark
    (cp >= 0x202a && cp <= 0x202e) || // BiDi controls
    (cp >= 0x2060 && cp <= 0x206f)    // Invisible formatting
  ) {
    return 0;
  }

  // Variation selectors
  if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef)) {
    return 0;
  }

  // East Asian Wide, Fullwidth, CJK, Emoji
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x231a && cp <= 0x231b) || // Watch / Hourglass
    (cp >= 0x23e9 && cp <= 0x23ec) || // Fast-forward, etc.
    (cp >= 0x23f0 && cp <= 0x23f3) ||
    (cp >= 0x25fd && cp <= 0x25fe) ||
    (cp >= 0x2614 && cp <= 0x2615) ||
    (cp >= 0x2648 && cp <= 0x2653) ||
    (cp >= 0x267f && cp <= 0x267f) ||
    (cp >= 0x2693 && cp <= 0x2693) ||
    (cp >= 0x26a1 && cp <= 0x26a1) ||
    (cp >= 0x26aa && cp <= 0x26ab) ||
    (cp >= 0x26bd && cp <= 0x26be) ||
    (cp >= 0x26c4 && cp <= 0x26c5) ||
    (cp >= 0x26ce && cp <= 0x26ce) ||
    (cp >= 0x26d4 && cp <= 0x26d4) ||
    (cp >= 0x26ea && cp <= 0x26ea) ||
    (cp >= 0x26f2 && cp <= 0x26f3) ||
    (cp >= 0x26f5 && cp <= 0x26f5) ||
    (cp >= 0x26fa && cp <= 0x26fa) ||
    (cp >= 0x26fd && cp <= 0x26fd) ||
    (cp >= 0x2705 && cp <= 0x2705) ||
    (cp >= 0x270a && cp <= 0x270b) ||
    (cp >= 0x2728 && cp <= 0x2728) ||
    (cp >= 0x274c && cp <= 0x274c) ||
    (cp >= 0x274e && cp <= 0x274e) ||
    (cp >= 0x2753 && cp <= 0x2755) ||
    (cp >= 0x2757 && cp <= 0x2757) ||
    (cp >= 0x2795 && cp <= 0x2797) ||
    (cp >= 0x27b0 && cp <= 0x27b0) ||
    (cp >= 0x27bf && cp <= 0x27bf) ||
    (cp >= 0x2b1b && cp <= 0x2b1c) ||
    (cp >= 0x2b50 && cp <= 0x2b50) ||
    (cp >= 0x2b55 && cp <= 0x2b55) ||
    (cp >= 0x2e80 && cp <= 0x2fff) || // CJK Radicals
    (cp >= 0x3000 && cp <= 0x303e) || // CJK Symbols
    (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
    (cp >= 0x3100 && cp <= 0x312f) || // Bopomofo
    (cp >= 0x3130 && cp <= 0x318f) || // Hangul Compatibility
    (cp >= 0x3190 && cp <= 0x31e3) ||
    (cp >= 0x3200 && cp <= 0x4dbf) || // CJK Enclosed & Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility
    (cp >= 0xfe10 && cp <= 0xfe19) || // Vertical forms
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK Compatibility Forms
    (cp >= 0xff01 && cp <= 0xff60) || // Fullwidth ASCII variants
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth symbol variants
    (cp >= 0x1f000 && cp <= 0x1f02f) || // Mahjong
    (cp >= 0x1f0a0 && cp <= 0x1f0ff) || // Playing cards
    (cp >= 0x1f100 && cp <= 0x1f64f) || // Enclosed & Emoticons
    (cp >= 0x1f680 && cp <= 0x1f6ff) || // Transport
    (cp >= 0x1f700 && cp <= 0x1f77f) || // Alchemical
    (cp >= 0x1f780 && cp <= 0x1f7ff) || // Geometric
    (cp >= 0x1f800 && cp <= 0x1f8ff) || // Arrows
    (cp >= 0x1f900 && cp <= 0x1f9ff) || // Supplemental Symbols
    (cp >= 0x1fa00 && cp <= 0x1faff) || // Symbols & Pictographs Extended-A (includes 🫟 U+1FADF)
    (cp >= 0x20000 && cp <= 0x3fffd)    // SIP / TIP CJK Ideographs
  ) {
    return 2;
  }

  // All other characters (ASCII, Latin, Arabic letters, Cyrillic, Greek, Hebrew) are 1 column
  return 1;
}

/**
 * Return display width of a single grapheme cluster string.
 */
export function graphemeWidth(grapheme) {
  if (!grapheme) return 0;
  // Look at the base code point of the cluster
  let maxWidth = 0;
  for (const char of grapheme) {
    const cp = char.codePointAt(0);
    const w = codePointWidth(cp);
    if (w > maxWidth) maxWidth = w;
  }
  return maxWidth === 0 && grapheme.length > 0 ? 0 : maxWidth;
}

/**
 * Split a string into grapheme clusters.
 *
 * @param {string} str
 * @returns {string[]}
 */
export function getGraphemes(str) {
  if (!str) return [];
  if (segmenter) {
    return Array.from(segmenter.segment(str)).map(s => s.segment);
  }
  // Fallback for environments lacking Intl.Segmenter
  return Array.from(str);
}

/**
 * Return total terminal display width of a string.
 *
 * @param {string} str
 * @param {number} [tabWidth=2]
 * @returns {number}
 */
export function stringWidth(str, tabWidth = 2) {
  if (!str) return 0;
  let width = 0;
  const graphemes = getGraphemes(str);
  for (const g of graphemes) {
    if (g === '\t') {
      width += tabWidth;
    } else {
      width += graphemeWidth(g);
    }
  }
  return width;
}

/**
 * Truncate a string to a maximum display column width.
 * Appends ellipsis if truncated.
 *
 * @param {string} str
 * @param {number} maxWidth
 * @param {string} [ellipsis='…']
 * @returns {string}
 */
export function truncateToWidth(str, maxWidth, ellipsis = '…') {
  if (!str || maxWidth <= 0) return '';
  const total = stringWidth(str);
  if (total <= maxWidth) return str;

  const ellWidth = stringWidth(ellipsis);
  const targetWidth = Math.max(0, maxWidth - ellWidth);

  let currentWidth = 0;
  let result = '';
  const graphemes = getGraphemes(str);

  for (const g of graphemes) {
    const gw = g === '\t' ? 2 : graphemeWidth(g);
    if (currentWidth + gw > targetWidth) break;
    result += g;
    currentWidth += gw;
  }

  return result + ellipsis;
}

/**
 * Pad a string to an exact terminal display column width.
 *
 * @param {string} str
 * @param {number} targetWidth
 * @param {'left' | 'right' | 'center'} [align='left']
 * @param {string} [padChar=' ']
 * @returns {string}
 */
export function padWidth(str, targetWidth, align = 'left', padChar = ' ') {
  const current = stringWidth(str);
  if (current >= targetWidth) return str;
  const missing = targetWidth - current;

  if (align === 'right') {
    return padChar.repeat(missing) + str;
  }
  if (align === 'center') {
    const left = Math.floor(missing / 2);
    const right = missing - left;
    return padChar.repeat(left) + str + padChar.repeat(right);
  }
  return str + padChar.repeat(missing);
}

/**
 * Check if a character or text starts with RTL script (Arabic, Hebrew).
 */
export function isRtlString(str) {
  if (!str) return false;
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i);
    // Arabic, Hebrew, Syriac, Thaana
    if (
      (cp >= 0x0590 && cp <= 0x08ff) ||
      (cp >= 0xfb1d && cp <= 0xfdff) ||
      (cp >= 0xfe70 && cp <= 0xfeff)
    ) {
      return true;
    }
  }
  return false;
}
