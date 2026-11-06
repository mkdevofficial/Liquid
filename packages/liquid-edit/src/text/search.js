/**
 * Search and Replace Engine for liquid-edit
 */

export class SearchEngine {
  /**
   * Search for all occurrences of a query in the piece table.
   *
   * @param {import('./piece-table.js').PieceTable} table
   * @param {string} query
   * @param {object} [options={}]
   * @param {boolean} [options.isRegex=false]
   * @param {boolean} [options.caseSensitive=false]
   * @param {boolean} [options.wholeWord=false]
   * @returns {{ matches: Array<{ offset: number, length: number, line: number, col: number }>, error?: string }}
   */
  static find(table, query, options = {}) {
    if (!query) return { matches: [] };

    const text = table.getText();
    const matches = [];

    try {
      let regex;
      if (options.isRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(query, flags);
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        const flags = options.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(pattern, flags);
      }

      let m;
      while ((m = regex.exec(text)) !== null) {
        if (m[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        const offset = m.index;
        const length = m[0].length;
        const pos = table.offsetToPosition(offset);
        matches.push({
          offset,
          length,
          line: pos.line,
          col: pos.col
        });
      }

      return { matches };
    } catch (err) {
      return { matches: [], error: err.message };
    }
  }

  /**
   * Replace all matches in table.
   *
   * @param {import('./piece-table.js').PieceTable} table
   * @param {string} query
   * @param {string} replacement
   * @param {object} [options={}]
   * @returns {{ count: number, error?: string }}
   */
  static replaceAll(table, query, replacement, options = {}) {
    const { matches, error } = this.find(table, query, options);
    if (error) return { count: 0, error };
    if (matches.length === 0) return { count: 0 };

    // Apply replacements from back to front so offsets remain valid
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      table.delete(match.offset, match.length);
      table.insert(match.offset, replacement);
    }

    return { count: matches.length };
  }
}
