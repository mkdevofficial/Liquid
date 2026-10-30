/**
 * Scoped CSS Transformer for Liquid components.
 * Appends [data-l-xxxx] to component selectors, preserving :global() and @global {}.
 */

export function transformScopedCSS(css, scopeAttr) {
  if (!css || !css.trim()) return '';

  let output = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(css[i])) {
      output += css[i];
      i++;
    }
    if (i >= len) break;

    // Check comments
    if (css[i] === '/' && css[i + 1] === '*') {
      const endComment = css.indexOf('*/', i + 2);
      if (endComment === -1) {
        output += css.slice(i);
        break;
      }
      output += css.slice(i, endComment + 2);
      i = endComment + 2;
      continue;
    }

    // Check for @global { ... }
    if (css.slice(i).startsWith('@global')) {
      const openBrace = css.indexOf('{', i);
      if (openBrace !== -1) {
        const matchingClose = findMatchingBrace(css, openBrace);
        if (matchingClose !== -1) {
          const innerCss = css.slice(openBrace + 1, matchingClose);
          output += innerCss;
          i = matchingClose + 1;
          continue;
        }
      }
    }

    // Check for @keyframes or other at-rules
    if (css[i] === '@') {
      const atRuleMatch = css.slice(i).match(/^@([a-zA-Z0-9_-]+)/);
      if (atRuleMatch) {
        const atRuleName = atRuleMatch[1].toLowerCase();
        const openBrace = css.indexOf('{', i);
        if (openBrace !== -1) {
          const header = css.slice(i, openBrace + 1);
          const closeBrace = findMatchingBrace(css, openBrace);
          if (closeBrace !== -1) {
            const body = css.slice(openBrace + 1, closeBrace);
            if (atRuleName === 'media' || atRuleName === 'supports') {
              output += header + transformScopedCSS(body, scopeAttr) + '}';
            } else {
              // Keyframes, font-face, etc. output untouched
              output += header + body + '}';
            }
            i = closeBrace + 1;
            continue;
          }
        }
      }
    }

    // Read selector until '{'
    const openBrace = css.indexOf('{', i);
    if (openBrace === -1) {
      output += css.slice(i);
      break;
    }

    const rawSelector = css.slice(i, openBrace).trim();
    const closeBrace = findMatchingBrace(css, openBrace);
    if (closeBrace === -1) {
      output += css.slice(i);
      break;
    }

    const decls = css.slice(openBrace, closeBrace + 1);
    const scopedSelector = scopeSelectorList(rawSelector, scopeAttr);
    output += scopedSelector + ' ' + decls + '\n';
    i = closeBrace + 1;
  }

  return output.trim();
}

function findMatchingBrace(str, openIdx) {
  let depth = 1;
  for (let j = openIdx + 1; j < str.length; j++) {
    if (str[j] === '{') depth++;
    else if (str[j] === '}') {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/**
 * Scope a comma-separated selector list: e.g. "h1, p.lead, :global(.nav)"
 */
export function scopeSelectorList(selectorList, scopeAttr) {
  const parts = selectorList.split(',');
  const attrSelector = `[${scopeAttr}]`;

  return parts
    .map(sel => sel.trim())
    .filter(Boolean)
    .map(sel => {
      // Check if :global(innerSelector)
      if (sel.includes(':global(')) {
        return sel.replace(/:global\((.*?)\)/g, '$1');
      }

      // If selector is :root, html, or body, keep as is
      if (/^(:root|html|body)$/.test(sel)) {
        return sel;
      }

      // Split by combinators: spaces, >, +, ~
      const tokens = sel.split(/(\s*[>+~]\s*|\s+)/);
      const scopedTokens = tokens.map(token => {
        const trimmed = token.trim();
        // If it's a combinator, leave as is
        if (!trimmed || trimmed === '>' || trimmed === '+' || trimmed === '~') {
          return token;
        }

        // Insert [data-l-xxxx] before pseudo-classes or pseudo-elements
        const pseudoMatch = trimmed.match(/::?[a-zA-Z0-9_-]+/);
        if (pseudoMatch) {
          const pseudoIdx = pseudoMatch.index;
          const base = trimmed.slice(0, pseudoIdx);
          const rest = trimmed.slice(pseudoIdx);
          return (base ? `${base}${attrSelector}` : attrSelector) + rest;
        }

        return `${trimmed}${attrSelector}`;
      });

      return scopedTokens.join('');
    })
    .join(', ');
}
