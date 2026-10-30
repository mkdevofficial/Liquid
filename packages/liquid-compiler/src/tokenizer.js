import { LiquidSyntaxError } from './errors.js';

export const TokenType = {
  SECTION: 'SECTION',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  TAG: 'TAG',
  KEYWORD: 'KEYWORD',
  DIRECTIVE_EVENT: 'DIRECTIVE_EVENT',
  DIRECTIVE_BIND: 'DIRECTIVE_BIND',
  ATTR: 'ATTR',
  TEXT: 'TEXT',
  INTERPOLATION: 'INTERPOLATION',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF'
};

const KEYWORDS = new Set(['if', 'elseif', 'else if', 'else', 'each', 'slot']);

const COMMON_BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'required', 'readonly', 'hidden', 'autofocus',
  'selected', 'multiple', 'novalidate', 'async', 'defer', 'open', 'reversed',
  'loop', 'autoplay', 'controls', 'muted', 'default', 'inert'
]);

/**
 * Tokenize a .liq source string into an array of tokens.
 *
 * @param {string} source
 * @param {object} options
 * @returns {Array<object>}
 */
export function tokenize(source, options = {}) {
  const file = options.file || 'component.liq';
  const tokens = [];

  const rawLines = source.split(/\r?\n/);
  const indentStack = [0];
  let currentSection = null; // null means top-level, defaults to UI unless section header seen
  let sectionContentLines = [];
  let sectionStartLoc = { line: 1, column: 1 };

  function flushSection() {
    if (currentSection && (currentSection === 'logic' || currentSection === 'style')) {
      tokens.push({
        type: TokenType.SECTION,
        name: currentSection,
        content: sectionContentLines.join('\n'),
        line: sectionStartLoc.line,
        column: sectionStartLoc.column
      });
      sectionContentLines = [];
    }
  }

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const lineNumber = lineIndex + 1;
    const rawLine = rawLines[lineIndex];

    // Check for section header: e.g. "--- logic", "--- js", "--- style", "--- css", "--- ui"
    const sectionMatch = rawLine.match(/^---\s*([a-zA-Z0-9_-]*)\s*$/);
    if (sectionMatch) {
      flushSection();

      // If switching out of UI section, close any open UI indents
      if (currentSection === 'ui' || currentSection === null) {
        while (indentStack.length > 1) {
          indentStack.pop();
          tokens.push({ type: TokenType.DEDENT, line: lineNumber, column: 1 });
        }
      }

      const rawName = sectionMatch[1].toLowerCase();
      let sectionName = 'ui';
      if (rawName === 'logic' || rawName === 'js' || rawName === 'script') {
        sectionName = 'logic';
      } else if (rawName === 'style' || rawName === 'styles' || rawName === 'css') {
        sectionName = 'style';
      } else if (rawName === 'ui' || rawName === 'template' || rawName === '') {
        sectionName = 'ui';
      } else {
        throw new LiquidSyntaxError(
          `Unknown section header '--- ${rawName}'. Valid sections are '--- logic', '--- style', or '--- ui'.`,
          { file, line: lineNumber, column: 1, source }
        );
      }

      currentSection = sectionName;
      sectionStartLoc = { line: lineNumber + 1, column: 1 };
      sectionContentLines = [];
      continue;
    }

    // If inside logic or style section, collect lines verbatim
    if (currentSection === 'logic' || currentSection === 'style') {
      sectionContentLines.push(rawLine);
      continue;
    }

    // Now we are in UI section (either explicit "--- ui" or default top-level UI)
    currentSection = 'ui';

    // Blank line or comment-only line?
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }

    // Check indentation of the current line
    const leadingWhitespaceMatch = rawLine.match(/^[ \t]*/);
    const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : '';
    const hasTabs = leadingWhitespace.includes('\t');
    const hasSpaces = leadingWhitespace.includes(' ');

    if (hasTabs && hasSpaces) {
      const firstTab = leadingWhitespace.indexOf('\t') + 1;
      throw new LiquidSyntaxError(
        'Mixed tabs and spaces in indentation are not allowed. Please use spaces only (2 spaces per indent level).',
        { file, line: lineNumber, column: firstTab, source }
      );
    }

    if (hasTabs) {
      throw new LiquidSyntaxError(
        'Tab characters in indentation are not allowed. Please use 2 spaces per indentation level.',
        { file, line: lineNumber, column: 1, source }
      );
    }

    const indentWidth = leadingWhitespace.length;
    const currentIndent = indentStack[indentStack.length - 1];

    if (indentWidth > currentIndent) {
      if (indentWidth !== currentIndent + 2) {
        throw new LiquidSyntaxError(
          `Invalid indentation (${indentWidth} spaces). Expected ${currentIndent + 2} spaces (2 spaces per level).`,
          { file, line: lineNumber, column: currentIndent + 1, source }
        );
      }
      indentStack.push(indentWidth);
      tokens.push({
        type: TokenType.INDENT,
        level: indentWidth,
        line: lineNumber,
        column: 1
      });
    } else if (indentWidth < currentIndent) {
      while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indentWidth) {
        indentStack.pop();
        tokens.push({
          type: TokenType.DEDENT,
          level: indentStack[indentStack.length - 1],
          line: lineNumber,
          column: 1
        });
      }
      if (indentStack[indentStack.length - 1] !== indentWidth) {
        throw new LiquidSyntaxError(
          `Indentation level of ${indentWidth} spaces does not match any outer indentation level.`,
          { file, line: lineNumber, column: 1, source }
        );
      }
    }

    // Tokenize the line content starting at column `indentWidth + 1`
    const lineContent = rawLine.slice(indentWidth);
    const colOffset = indentWidth + 1;
    tokenizeUILine(lineContent, lineNumber, colOffset, tokens, file, source);
  }

  // Flush any trailing section
  flushSection();

  // If in UI, emit dedents for remaining open indents
  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({
      type: TokenType.DEDENT,
      level: indentStack[indentStack.length - 1],
      line: rawLines.length,
      column: 1
    });
  }

  tokens.push({
    type: TokenType.EOF,
    line: rawLines.length,
    column: 1
  });

  return tokens;
}

/**
 * Tokenize a single non-empty UI line.
 */
function tokenizeUILine(lineContent, line, colOffset, tokens, file, source) {
  // 1. Explicit text line: | text
  if (lineContent.startsWith('| ') || lineContent === '|') {
    const text = lineContent.startsWith('| ') ? lineContent.slice(2) : '';
    tokens.push({
      type: TokenType.TEXT,
      value: text,
      isExplicitText: true,
      line,
      column: colOffset
    });
    return;
  }

  // Check if line starts with a keyword: if, elseif, else if, else, each, slot
  for (const kw of ['else if', 'elseif', 'else', 'if', 'each', 'slot']) {
    if (lineContent === kw || lineContent.startsWith(kw + ' ') || lineContent.startsWith(kw + '(')) {
      const rest = lineContent.slice(kw.length).trim();
      tokens.push({
        type: TokenType.KEYWORD,
        keyword: kw === 'else if' ? 'elseif' : kw,
        args: rest,
        line,
        column: colOffset
      });
      return;
    }
  }

  // Check for HTML comments
  if (lineContent.startsWith('<!--')) {
    return; // ignore comments
  }

  // Otherwise, it's an element, component, or child text line
  // Let's scan the first word (tag + shorthands)
  let pos = 0;
  const len = lineContent.length;

  function skipSpaces() {
    while (pos < len && (lineContent[pos] === ' ' || lineContent[pos] === '\t')) {
      pos++;
    }
  }

  skipSpaces();
  const tagStart = pos;

  // Read tag name (supports letters, numbers, hyphens, and unicode characters for RTL/Arabic tags)
  while (pos < len && !/[\s.#$@(=]/.test(lineContent[pos])) {
    pos++;
  }

  const rawTagName = lineContent.slice(tagStart, pos);

  // If no tag name and line doesn't start with '#' or '.', it's a plain text child line!
  if (!rawTagName && lineContent[pos] !== '#' && lineContent[pos] !== '.') {
    tokens.push({
      type: TokenType.TEXT,
      value: lineContent,
      isExplicitText: false,
      line,
      column: colOffset
    });
    return;
  }

  const tagName = rawTagName || 'div'; // #id or .class defaults to div
  let id = null;
  const classes = [];

  // Parse shorthand #id and .class
  while (pos < len && (lineContent[pos] === '#' || lineContent[pos] === '.')) {
    const prefix = lineContent[pos];
    pos++;
    const segStart = pos;
    while (pos < len && !/[\s.#$@(=]/.test(lineContent[pos])) {
      pos++;
    }
    const seg = lineContent.slice(segStart, pos);
    if (!seg) {
      throw new LiquidSyntaxError(
        `Expected identifier after '${prefix}' in shorthand.`,
        { file, line, column: colOffset + segStart, source }
      );
    }
    if (prefix === '#') {
      id = seg;
    } else {
      classes.push(seg);
    }
  }

  tokens.push({
    type: TokenType.TAG,
    name: tagName,
    id,
    classes,
    isComponent: /^[A-Z]/.test(tagName),
    line,
    column: colOffset + tagStart
  });

  skipSpaces();

  // Now parse attributes, directives, and optional trailing inline text
  while (pos < len) {
    skipSpaces();
    if (pos >= len) break;

    const char = lineContent[pos];

    // Event directive: @event or @event.modifier=handler
    if (char === '@') {
      pos++;
      const evStart = pos;
      while (pos < len && !/[\s=]/.test(lineContent[pos])) {
        pos++;
      }
      const rawEvent = lineContent.slice(evStart, pos);
      skipSpaces();
      let handler = '';
      if (pos < len && lineContent[pos] === '=') {
        pos++;
        skipSpaces();
        const hObj = readAttrValue();
        handler = hObj.value;
      }
      const [name, ...modifiers] = rawEvent.split('.');
      tokens.push({
        type: TokenType.DIRECTIVE_EVENT,
        name,
        modifiers,
        handler,
        line,
        column: colOffset + evStart - 1
      });
      continue;
    }

    // Two-way binding: $prop={sig} or $={sig}
    if (char === '$') {
      pos++;
      const bindStart = pos;
      while (pos < len && !/[\s=]/.test(lineContent[pos])) {
        pos++;
      }
      const prop = lineContent.slice(bindStart, pos) || 'value';
      skipSpaces();
      let target = '';
      if (pos < len && lineContent[pos] === '=') {
        pos++;
        skipSpaces();
        const tObj = readAttrValue();
        target = tObj.value;
      }
      tokens.push({
        type: TokenType.DIRECTIVE_BIND,
        prop,
        target,
        line,
        column: colOffset + bindStart - 1
      });
      continue;
    }

    // Check if this looks like an attribute: name="value", name={expr}, or boolean attr
    // An attribute name matches [a-zA-Z0-9_-:]
    const attrMatch = lineContent.slice(pos).match(/^([a-zA-Z0-9_\-:]+)(?:=|\s|$)/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const afterNamePos = pos + attrName.length;
      let nextChar = lineContent[afterNamePos];

      // If followed immediately or after spaces by '='
      let lookAheadPos = afterNamePos;
      while (lookAheadPos < len && (lineContent[lookAheadPos] === ' ' || lineContent[lookAheadPos] === '\t')) {
        lookAheadPos++;
      }

      if (lineContent[lookAheadPos] === '=') {
        // Definitely an attribute with value
        pos = lookAheadPos + 1;
        skipSpaces();
        const attrVal = readAttrValue();
        tokens.push({
          type: TokenType.ATTR,
          name: attrName,
          value: attrVal.value,
          isDynamic: attrVal.isDynamic,
          line,
          column: colOffset + (pos - attrName.length)
        });
        continue;
      }

      // Check if it's a known boolean attribute
      if (COMMON_BOOLEAN_ATTRS.has(attrName.toLowerCase())) {
        pos = afterNamePos;
        tokens.push({
          type: TokenType.ATTR,
          name: attrName,
          value: 'true',
          isDynamic: false,
          isBoolean: true,
          line,
          column: colOffset + pos
        });
        continue;
      }
    }

    // If it does not match an attribute or directive, the rest of the line is INLINE TEXT!
    const inlineText = lineContent.slice(pos);
    tokens.push({
      type: TokenType.TEXT,
      value: inlineText,
      isInline: true,
      line,
      column: colOffset + pos
    });
    break;
  }

  function readAttrValue() {
    skipSpaces();
    if (pos >= len) return { value: '', isDynamic: false };

    const firstChar = lineContent[pos];

    // Expression: {expr}
    if (firstChar === '{') {
      let depth = 1;
      pos++;
      const exprStart = pos;
      while (pos < len && depth > 0) {
        if (lineContent[pos] === '{') depth++;
        else if (lineContent[pos] === '}') depth--;
        if (depth > 0) pos++;
      }
      const expr = lineContent.slice(exprStart, pos);
      if (lineContent[pos] === '}') pos++;
      return { value: expr.trim(), isDynamic: true };
    }

    // Quoted string: "..." or '...'
    if (firstChar === '"' || firstChar === "'") {
      const quote = firstChar;
      pos++;
      const strStart = pos;
      let strVal = '';
      let escaped = false;
      while (pos < len) {
        const c = lineContent[pos];
        if (escaped) {
          strVal += c;
          escaped = false;
        } else if (c === '\\') {
          escaped = true;
        } else if (c === quote) {
          pos++;
          break;
        } else {
          strVal += c;
        }
        pos++;
      }

      // Check for interpolation inside quotes: e.g. "{expr}" or "text {expr}"
      if (strVal.includes('{')) {
        if (strVal.startsWith('{') && strVal.endsWith('}') && strVal.indexOf('{', 1) === -1) {
          return { value: strVal.slice(1, -1).trim(), isDynamic: true };
        }
        const parts = [];
        let cur = 0;
        let inExpr = false;
        let buf = '';
        while (cur < strVal.length) {
          if (!inExpr && strVal[cur] === '{') {
            if (buf) { parts.push(JSON.stringify(buf)); buf = ''; }
            inExpr = true;
            cur++;
          } else if (inExpr && strVal[cur] === '}') {
            if (buf) { parts.push(`(${buf.trim()})`); buf = ''; }
            inExpr = false;
            cur++;
          } else {
            buf += strVal[cur++];
          }
        }
        if (buf) parts.push(JSON.stringify(buf));
        return { value: parts.join(' + '), isDynamic: true };
      }

      return { value: strVal, isDynamic: false };
    }

    // Unquoted expression or identifier, tracking balanced parentheses/brackets
    const valStart = pos;
    let parenDepth = 0;
    while (pos < len) {
      const c = lineContent[pos];
      if (parenDepth === 0 && (c === ' ' || c === '\t')) {
        break;
      }
      if (c === '(' || c === '[' || c === '{') parenDepth++;
      else if (c === ')' || c === ']' || c === '}') parenDepth--;
      pos++;
    }
    const unquoted = lineContent.slice(valStart, pos);
    return { value: unquoted, isDynamic: false };
  }
}
