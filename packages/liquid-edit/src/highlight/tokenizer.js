/**
 * Incremental Line-Based Syntax Tokenizer
 * Supports .liq (multi-section: logic, style, ui), JavaScript/TypeScript,
 * JSON, CSS, HTML, Markdown, Shell, and Plain Text.
 */

export class SyntaxHighlighter {
  constructor() {
    this.stateCache = new Map(); // lineIndex -> state
  }

  clearCache() {
    this.stateCache.clear();
  }

  /**
   * Tokenize a single line with incoming state.
   *
   * @param {string} line
   * @param {string} language
   * @param {object} [prevState={}]
   * @returns {{ tokens: Array<{ start: number, end: number, type: string }>, nextState: object }}
   */
  tokenizeLine(line, language, prevState = {}) {
    switch (language) {
      case 'liq':
        return this._tokenizeLiq(line, prevState);
      case 'javascript':
      case 'typescript':
        return this._tokenizeJs(line, prevState);
      case 'json':
        return this._tokenizeJson(line, prevState);
      case 'css':
        return this._tokenizeCss(line, prevState);
      case 'html':
        return this._tokenizeHtml(line, prevState);
      case 'markdown':
        return this._tokenizeMarkdown(line, prevState);
      case 'shell':
      case 'bash':
        return this._tokenizeShell(line, prevState);
      default:
        return { tokens: [], nextState: {} };
    }
  }

  // --- Liquid (.liq) multi-section tokenizer ---

  _tokenizeLiq(line, state = {}) {
    const trimmed = line.trim();

    // Check for section header: --- logic / --- style / --- ui
    if (trimmed.startsWith('---')) {
      const sectionMatch = trimmed.match(/^---\s*(logic|js|style|css|ui)/i);
      const section = sectionMatch ? sectionMatch[1].toLowerCase() : 'ui';
      const actualSection = (section === 'js' ? 'logic' : (section === 'css' ? 'style' : section));
      return {
        tokens: [{ start: line.indexOf('---'), end: line.length, type: 'sectionHeader' }],
        nextState: { section: actualSection }
      };
    }

    const currentSection = state.section || 'ui';

    if (currentSection === 'logic') {
      return this._tokenizeJs(line, state);
    }
    if (currentSection === 'style') {
      return this._tokenizeCss(line, state);
    }

    // UI section: template mode
    return this._tokenizeLiqUi(line, state);
  }

  _tokenizeLiqUi(line, state) {
    const tokens = [];
    let idx = 0;

    // Skip leading whitespace
    while (idx < line.length && (line[idx] === ' ' || line[idx] === '\t')) idx++;
    if (idx >= line.length) return { tokens, nextState: state };

    // Line comment
    if (line.slice(idx).startsWith('//')) {
      tokens.push({ start: idx, end: line.length, type: 'comment' });
      return { tokens, nextState: state };
    }

    // Explicit text marker '|'
    if (line[idx] === '|') {
      tokens.push({ start: idx, end: idx + 1, type: 'punctuation' });
      tokens.push({ start: idx + 1, end: line.length, type: 'string' });
      return { tokens, nextState: state };
    }

    // Match keywords: if, else, elseif, each, as, slot
    const kwMatch = line.slice(idx).match(/^(if|elseif|else if|else|each|as|slot)\b/);
    if (kwMatch) {
      tokens.push({ start: idx, end: idx + kwMatch[0].length, type: 'keyword' });
      idx += kwMatch[0].length;
    } else {
      // Element tag, ID, classes, or Component
      const tagMatch = line.slice(idx).match(/^([a-zA-Z0-9_-]+)/);
      if (tagMatch) {
        const tagName = tagMatch[1];
        const isComponent = tagName[0] >= 'A' && tagName[0] <= 'Z';
        tokens.push({
          start: idx,
          end: idx + tagName.length,
          type: isComponent ? 'component' : 'tag'
        });
        idx += tagName.length;
      }
    }

    // Parse remaining tokens (classes, ids, directives, bindings, attributes, interpolations)
    while (idx < line.length) {
      const ch = line[idx];

      // Skip spaces
      if (ch === ' ' || ch === '\t') {
        idx++;
        continue;
      }

      // Class: .classname
      if (ch === '.') {
        const classMatch = line.slice(idx).match(/^\.([a-zA-Z0-9_-]+)/);
        if (classMatch) {
          tokens.push({ start: idx, end: idx + classMatch[0].length, type: 'attribute' });
          idx += classMatch[0].length;
          continue;
        }
      }

      // ID: #idname
      if (ch === '#') {
        const idMatch = line.slice(idx).match(/^#([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          tokens.push({ start: idx, end: idx + idMatch[0].length, type: 'number' });
          idx += idMatch[0].length;
          continue;
        }
      }

      // Event directive: @event.modifier
      if (ch === '@') {
        const evMatch = line.slice(idx).match(/^@[a-zA-Z0-9_.-]+/);
        if (evMatch) {
          tokens.push({ start: idx, end: idx + evMatch[0].length, type: 'directive' });
          idx += evMatch[0].length;
          continue;
        }
      }

      // Two-way binding: $bind or $attr
      if (ch === '$') {
        const bindMatch = line.slice(idx).match(/^\$[a-zA-Z0-9_.-]+/);
        if (bindMatch) {
          tokens.push({ start: idx, end: idx + bindMatch[0].length, type: 'directive' });
          idx += bindMatch[0].length;
          continue;
        }
      }

      // Interpolation: {...}
      if (ch === '{') {
        const closeIdx = line.indexOf('}', idx);
        const end = closeIdx !== -1 ? closeIdx + 1 : line.length;
        tokens.push({ start: idx, end, type: 'interpolation' });
        idx = end;
        continue;
      }

      // Quoted string: "..." or '...'
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let end = idx + 1;
        while (end < line.length && line[end] !== quote) {
          if (line[end] === '\\') end++;
          end++;
        }
        if (end < line.length) end++; // consume closing quote
        tokens.push({ start: idx, end, type: 'string' });
        idx = end;
        continue;
      }

      // Attributes: name=...
      const attrMatch = line.slice(idx).match(/^([a-zA-Z0-9_-]+)=/);
      if (attrMatch) {
        tokens.push({ start: idx, end: idx + attrMatch[1].length, type: 'attribute' });
        tokens.push({ start: idx + attrMatch[1].length, end: idx + attrMatch[0].length, type: 'operator' });
        idx += attrMatch[0].length;
        continue;
      }

      // Punctuation
      if ('=():,'.includes(ch)) {
        tokens.push({ start: idx, end: idx + 1, type: 'punctuation' });
        idx++;
        continue;
      }

      // Unknown character: consume 1
      idx++;
    }

    return { tokens, nextState: state };
  }

  // --- JavaScript / TypeScript tokenizer ---

  _tokenizeJs(line, state = {}) {
    const tokens = [];
    let idx = 0;

    const JS_KEYWORDS = new Set([
      'import', 'export', 'from', 'default', 'function', 'return', 'const', 'let', 'var',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try',
      'catch', 'finally', 'throw', 'class', 'extends', 'new', 'this', 'super', 'async',
      'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true',
      'false', 'signal', 'computed', 'effect', 'batch', 'untrack', 'defineProps', 'onDestroy'
    ]);

    while (idx < line.length) {
      // Line comment
      if (line.slice(idx).startsWith('//')) {
        tokens.push({ start: idx, end: line.length, type: 'comment' });
        break;
      }

      const ch = line[idx];

      // Whitespace
      if (ch === ' ' || ch === '\t') {
        idx++;
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        let end = idx + 1;
        while (end < line.length && line[end] !== quote) {
          if (line[end] === '\\') end++;
          end++;
        }
        if (end < line.length) end++;
        tokens.push({ start: idx, end, type: 'string' });
        idx = end;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) && (idx === 0 || /[^a-zA-Z0-9_$]/.test(line[idx - 1]))) {
        const numMatch = line.slice(idx).match(/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/);
        if (numMatch) {
          tokens.push({ start: idx, end: idx + numMatch[0].length, type: 'number' });
          idx += numMatch[0].length;
          continue;
        }
      }

      // Identifiers / Keywords
      const idMatch = line.slice(idx).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (idMatch) {
        const word = idMatch[0];
        const type = JS_KEYWORDS.has(word) ? 'keyword' : (line[idx + word.length] === '(' ? 'function' : 'variable');
        tokens.push({ start: idx, end: idx + word.length, type });
        idx += word.length;
        continue;
      }

      // Operators
      const opMatch = line.slice(idx).match(/^(?:===|!==|==|!=|=>|<=|>=|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*\/%=<>!&|^~?:])/);
      if (opMatch) {
        tokens.push({ start: idx, end: idx + opMatch[0].length, type: 'operator' });
        idx += opMatch[0].length;
        continue;
      }

      // Punctuation
      if ('{}()[];,.'.includes(ch)) {
        tokens.push({ start: idx, end: idx + 1, type: 'punctuation' });
        idx++;
        continue;
      }

      idx++;
    }

    return { tokens, nextState: state };
  }

  // --- JSON tokenizer ---

  _tokenizeJson(line, state = {}) {
    const tokens = [];
    let idx = 0;

    while (idx < line.length) {
      const ch = line[idx];
      if (ch === ' ' || ch === '\t') { idx++; continue; }

      if (ch === '"') {
        let end = idx + 1;
        while (end < line.length && line[end] !== '"') {
          if (line[end] === '\\') end++;
          end++;
        }
        if (end < line.length) end++;
        // Check if followed by ':' -> property name
        const rest = line.slice(end).trim();
        tokens.push({ start: idx, end, type: rest.startsWith(':') ? 'attribute' : 'string' });
        idx = end;
        continue;
      }

      const numMatch = line.slice(idx).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (numMatch) {
        tokens.push({ start: idx, end: idx + numMatch[0].length, type: 'number' });
        idx += numMatch[0].length;
        continue;
      }

      const boolMatch = line.slice(idx).match(/^(?:true|false|null)\b/);
      if (boolMatch) {
        tokens.push({ start: idx, end: idx + boolMatch[0].length, type: 'keyword' });
        idx += boolMatch[0].length;
        continue;
      }

      if ('{}[],:'.includes(ch)) {
        tokens.push({ start: idx, end: idx + 1, type: 'punctuation' });
        idx++;
        continue;
      }

      idx++;
    }

    return { tokens, nextState: state };
  }

  // --- CSS tokenizer ---

  _tokenizeCss(line, state = {}) {
    const tokens = [];
    let idx = 0;

    while (idx < line.length) {
      const ch = line[idx];
      if (ch === ' ' || ch === '\t') { idx++; continue; }

      // Comment
      if (line.slice(idx).startsWith('/*')) {
        const endComment = line.indexOf('*/', idx + 2);
        const end = endComment !== -1 ? endComment + 2 : line.length;
        tokens.push({ start: idx, end, type: 'comment' });
        idx = end;
        continue;
      }

      // @rules or :pseudo
      if (ch === '@' || ch === ':') {
        const atMatch = line.slice(idx).match(/^[@:][a-zA-Z0-9_-]+/);
        if (atMatch) {
          tokens.push({ start: idx, end: idx + atMatch[0].length, type: 'keyword' });
          idx += atMatch[0].length;
          continue;
        }
      }

      // Strings
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let end = idx + 1;
        while (end < line.length && line[end] !== quote) end++;
        if (end < line.length) end++;
        tokens.push({ start: idx, end, type: 'string' });
        idx = end;
        continue;
      }

      // Properties / Selectors
      const wordMatch = line.slice(idx).match(/^[.#]?[a-zA-Z0-9_-]+/);
      if (wordMatch) {
        const word = wordMatch[0];
        const isSelector = word.startsWith('.') || word.startsWith('#');
        tokens.push({
          start: idx,
          end: idx + word.length,
          type: isSelector ? 'tag' : (line.includes(':') ? 'attribute' : 'keyword')
        });
        idx += word.length;
        continue;
      }

      // Punctuation
      if ('{};:(),'.includes(ch)) {
        tokens.push({ start: idx, end: idx + 1, type: 'punctuation' });
        idx++;
        continue;
      }

      idx++;
    }

    return { tokens, nextState: state };
  }

  // --- HTML tokenizer ---

  _tokenizeHtml(line, state = {}) {
    const tokens = [];
    let idx = 0;

    while (idx < line.length) {
      if (line.slice(idx).startsWith('<!--')) {
        const endComment = line.indexOf('-->', idx + 4);
        const end = endComment !== -1 ? endComment + 3 : line.length;
        tokens.push({ start: idx, end, type: 'comment' });
        idx = end;
        continue;
      }

      const tagMatch = line.slice(idx).match(/^<\/?([a-zA-Z0-9_-]+)/);
      if (tagMatch) {
        tokens.push({ start: idx, end: idx + tagMatch[0].length, type: 'tag' });
        idx += tagMatch[0].length;
        continue;
      }

      const attrMatch = line.slice(idx).match(/^([a-zA-Z0-9_-]+)=/);
      if (attrMatch) {
        tokens.push({ start: idx, end: idx + attrMatch[1].length, type: 'attribute' });
        tokens.push({ start: idx + attrMatch[1].length, end: idx + attrMatch[0].length, type: 'operator' });
        idx += attrMatch[0].length;
        continue;
      }

      const ch = line[idx];
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let end = idx + 1;
        while (end < line.length && line[end] !== quote) end++;
        if (end < line.length) end++;
        tokens.push({ start: idx, end, type: 'string' });
        idx = end;
        continue;
      }

      if (ch === '>' || ch === '<' || ch === '/') {
        tokens.push({ start: idx, end: idx + 1, type: 'tag' });
        idx++;
        continue;
      }

      idx++;
    }

    return { tokens, nextState: state };
  }

  // --- Markdown tokenizer ---

  _tokenizeMarkdown(line, state = {}) {
    const tokens = [];
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      tokens.push({ start: line.indexOf('#'), end: line.length, type: 'keyword' });
      return { tokens, nextState: state };
    }
    if (trimmed.startsWith('```')) {
      tokens.push({ start: line.indexOf('`'), end: line.length, type: 'directive' });
      return { tokens, nextState: state };
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      tokens.push({ start: line.search(/\S/), end: line.search(/\S/) + 2, type: 'attribute' });
    }

    return { tokens, nextState: state };
  }

  // --- Shell tokenizer ---

  _tokenizeShell(line, state = {}) {
    const tokens = [];
    let idx = 0;

    while (idx < line.length) {
      if (line[idx] === '#') {
        tokens.push({ start: idx, end: line.length, type: 'comment' });
        break;
      }

      const ch = line[idx];
      if (ch === ' ' || ch === '\t') { idx++; continue; }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let end = idx + 1;
        while (end < line.length && line[end] !== quote) end++;
        if (end < line.length) end++;
        tokens.push({ start: idx, end, type: 'string' });
        idx = end;
        continue;
      }

      if (ch === '$') {
        const varMatch = line.slice(idx).match(/^\$[a-zA-Z0-9_]+/);
        if (varMatch) {
          tokens.push({ start: idx, end: idx + varMatch[0].length, type: 'variable' });
          idx += varMatch[0].length;
          continue;
        }
      }

      idx++;
    }

    return { tokens, nextState: state };
  }
}
