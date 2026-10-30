import { TokenType } from './tokenizer.js';
import { LiquidSyntaxError } from './errors.js';

/**
 * Parse an interpolated string into raw text chunks and JS expressions.
 * e.g. "Hello, {name}!" -> [{ type: 'raw', value: 'Hello, ' }, { type: 'expr', value: 'name' }, { type: 'raw', value: '!' }]
 */
export function parseInterpolatedText(str) {
  const parts = [];
  let i = 0;
  const len = str.length;
  let currentRaw = '';

  while (i < len) {
    if (str[i] === '\\' && str[i + 1] === '{') {
      currentRaw += '{';
      i += 2;
      continue;
    }

    if (str[i] === '{') {
      if (currentRaw) {
        parts.push({ type: 'raw', value: currentRaw });
        currentRaw = '';
      }
      i++; // skip '{'
      let depth = 1;
      let expr = '';
      let inQuote = null;
      let escaped = false;

      while (i < len && depth > 0) {
        const c = str[i];
        if (inQuote) {
          expr += c;
          if (escaped) {
            escaped = false;
          } else if (c === '\\') {
            escaped = true;
          } else if (c === inQuote) {
            inQuote = null;
          }
        } else {
          if (c === '"' || c === "'" || c === '`') {
            inQuote = c;
            expr += c;
          } else if (c === '{') {
            depth++;
            expr += c;
          } else if (c === '}') {
            depth--;
            if (depth > 0) expr += c;
          } else {
            expr += c;
          }
        }
        i++;
      }
      parts.push({ type: 'expr', value: expr.trim() });
    } else {
      currentRaw += str[i];
      i++;
    }
  }

  if (currentRaw) {
    parts.push({ type: 'raw', value: currentRaw });
  }

  return parts;
}

/**
 * Parse an 'each' statement:
 * "items as item (item.id)" -> { collection: "items", item: "item", index: null, key: "item.id" }
 * "items as item, idx (item.id)" -> { collection: "items", item: "item", index: "idx", key: "item.id" }
 */
export function parseEachArgs(argsString, loc, file, source) {
  const trimmed = argsString.trim();
  // Match: <collection> as <item> [, <index>] [ (<key>) ]
  const match = trimmed.match(/^(.+?)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?(?:\s*\((.+)\))?$/);

  if (!match) {
    throw new LiquidSyntaxError(
      `Malformed 'each' statement: '${argsString}'. Expected 'each <collection> as <item> [, <index>] [(<key>)]'`,
      { file, line: loc.line, column: loc.column, source }
    );
  }

  const collection = match[1].trim();
  const item = match[2].trim();
  const index = match[3] ? match[3].trim() : null;
  const key = match[4] ? match[4].trim() : null;

  return { collection, item, index, key };
}

/**
 * Parse a flat list of tokens into a Program AST.
 */
export function parse(tokens, options = {}) {
  const file = options.file || 'component.liq';
  const source = options.source || '';

  let logic = { content: '', line: 1, column: 1 };
  let styles = { content: '', line: 1, column: 1 };
  const template = [];

  let pos = 0;
  const total = tokens.length;

  function peek() {
    return tokens[pos] || { type: TokenType.EOF };
  }

  function advance() {
    return tokens[pos++];
  }

  // First pass: extract sections or parse UI
  while (pos < total) {
    const token = peek();

    if (token.type === TokenType.EOF) {
      break;
    }

    if (token.type === TokenType.SECTION) {
      advance();
      if (token.name === 'logic') {
        logic = { content: token.content, line: token.line, column: token.column };
      } else if (token.name === 'style') {
        styles = { content: token.content, line: token.line, column: token.column };
      }
      continue;
    }

    // Must be UI tokens
    const node = parseUINode();
    if (node) {
      template.push(node);
    }
  }

  function parseUINode() {
    const token = peek();

    if (token.type === TokenType.EOF || token.type === TokenType.DEDENT) {
      return null;
    }

    if (token.type === TokenType.TAG) {
      return parseElement();
    }

    if (token.type === TokenType.KEYWORD) {
      return parseKeyword();
    }

    if (token.type === TokenType.TEXT) {
      advance();
      return {
        type: 'Text',
        parts: parseInterpolatedText(token.value),
        loc: { line: token.line, column: token.column }
      };
    }

    // Skip stray tokens
    advance();
    return null;
  }

  function parseElement() {
    const tagToken = advance();
    const attributes = [];
    const events = [];
    const bindings = [];
    const children = [];

    // Collect any attributes/directives that belong to this element
    while (pos < total) {
      const next = peek();
      if (next.type === TokenType.ATTR) {
        advance();
        attributes.push({
          name: next.name,
          value: next.value,
          isDynamic: next.isDynamic,
          isBoolean: next.isBoolean
        });
      } else if (next.type === TokenType.DIRECTIVE_EVENT) {
        advance();
        events.push({
          name: next.name,
          modifiers: next.modifiers,
          handler: next.handler
        });
      } else if (next.type === TokenType.DIRECTIVE_BIND) {
        advance();
        bindings.push({
          prop: next.prop,
          target: next.target
        });
      } else if (next.type === TokenType.TEXT && next.isInline) {
        advance();
        children.push({
          type: 'Text',
          parts: parseInterpolatedText(next.value),
          loc: { line: next.line, column: next.column }
        });
        break; // inline text is at the end of the line
      } else {
        break;
      }
    }

    // Check for child elements indented under this tag
    if (peek().type === TokenType.INDENT) {
      advance(); // consume INDENT
      while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
        const child = parseUINode();
        if (child) children.push(child);
      }
      if (peek().type === TokenType.DEDENT) {
        advance(); // consume DEDENT
      }
    }

    return {
      type: 'Element',
      tag: tagToken.name,
      isComponent: tagToken.isComponent,
      id: tagToken.id,
      classes: tagToken.classes,
      attributes,
      events,
      bindings,
      children,
      loc: { line: tagToken.line, column: tagToken.column }
    };
  }

  function parseKeyword() {
    const kwToken = advance();
    const kw = kwToken.keyword;
    const loc = { line: kwToken.line, column: kwToken.column };

    if (kw === 'if') {
      const test = kwToken.args.trim();
      const consequent = [];
      let alternate = null;

      if (peek().type === TokenType.INDENT) {
        advance(); // consume INDENT
        while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
          const child = parseUINode();
          if (child) consequent.push(child);
        }
        if (peek().type === TokenType.DEDENT) {
          advance(); // consume DEDENT
        }
      }

      // Check for elseif / else siblings
      if (peek().type === TokenType.KEYWORD) {
        const nextKw = peek().keyword;
        if (nextKw === 'elseif') {
          alternate = parseKeyword();
        } else if (nextKw === 'else') {
          advance(); // consume 'else'
          const elseBody = [];
          if (peek().type === TokenType.INDENT) {
            advance();
            while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
              const child = parseUINode();
              if (child) elseBody.push(child);
            }
            if (peek().type === TokenType.DEDENT) {
              advance();
            }
          }
          alternate = elseBody;
        }
      }

      return {
        type: 'IfBlock',
        test,
        consequent,
        alternate,
        loc
      };
    }

    if (kw === 'elseif') {
      // Used internally when chaining from `if`
      const test = kwToken.args.trim();
      const consequent = [];
      let alternate = null;

      if (peek().type === TokenType.INDENT) {
        advance();
        while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
          const child = parseUINode();
          if (child) consequent.push(child);
        }
        if (peek().type === TokenType.DEDENT) {
          advance();
        }
      }

      if (peek().type === TokenType.KEYWORD) {
        const nextKw = peek().keyword;
        if (nextKw === 'elseif') {
          alternate = parseKeyword();
        } else if (nextKw === 'else') {
          advance();
          const elseBody = [];
          if (peek().type === TokenType.INDENT) {
            advance();
            while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
              const child = parseUINode();
              if (child) elseBody.push(child);
            }
            if (peek().type === TokenType.DEDENT) {
              advance();
            }
          }
          alternate = elseBody;
        }
      }

      return {
        type: 'IfBlock',
        test,
        consequent,
        alternate,
        loc
      };
    }

    if (kw === 'each') {
      const parsed = parseEachArgs(kwToken.args, loc, file, source);
      const children = [];

      if (peek().type === TokenType.INDENT) {
        advance();
        while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
          const child = parseUINode();
          if (child) children.push(child);
        }
        if (peek().type === TokenType.DEDENT) {
          advance();
        }
      }

      return {
        type: 'EachBlock',
        collection: parsed.collection,
        item: parsed.item,
        index: parsed.index,
        key: parsed.key,
        children,
        loc
      };
    }

    if (kw === 'slot') {
      let name = null;
      if (kwToken.args) {
        const nameMatch = kwToken.args.match(/name=["']?([a-zA-Z0-9_-]+)["']?/);
        if (nameMatch) {
          name = nameMatch[1];
        }
      }
      const fallback = [];

      if (peek().type === TokenType.INDENT) {
        advance();
        while (pos < total && peek().type !== TokenType.DEDENT && peek().type !== TokenType.EOF) {
          const child = parseUINode();
          if (child) fallback.push(child);
        }
        if (peek().type === TokenType.DEDENT) {
          advance();
        }
      }

      return {
        type: 'Slot',
        name,
        fallback,
        loc
      };
    }

    throw new LiquidSyntaxError(
      `Unexpected keyword '${kw}' outside supported structure.`,
      { file, line: loc.line, column: loc.column, source }
    );
  }

  return {
    type: 'Program',
    logic,
    styles,
    template
  };
}
