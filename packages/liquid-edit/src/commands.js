/**
 * Command Registry for liquid-edit
 * Central source of truth for all editor commands, keybindings, and help descriptions.
 */

export class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.keybindings = new Map(); // normalized key string -> commandId
  }

  /**
   * Register a command.
   *
   * @param {object} cmd
   * @param {string} cmd.id
   * @param {string} cmd.title
   * @param {string} cmd.category
   * @param {string} [cmd.description]
   * @param {string} [cmd.keybinding]
   * @param {(editor: any, ...args: any[]) => any} cmd.action
   * @param {(editor: any) => boolean} [cmd.when]
   */
  register(cmd) {
    this.commands.set(cmd.id, cmd);
    if (cmd.keybinding) {
      const normKey = this.normalizeKey(cmd.keybinding);
      this.keybindings.set(normKey, cmd.id);
    }
  }

  get(id) {
    return this.commands.get(id);
  }

  getAll() {
    return Array.from(this.commands.values());
  }

  getByCategory(category) {
    return this.getAll().filter(c => c.category === category);
  }

  findByKey(keyEvent) {
    const keyStr = this.keyEventToString(keyEvent);
    const cmdId = this.keybindings.get(keyStr);
    return cmdId ? this.get(cmdId) : null;
  }

  normalizeKey(keyStr) {
    return keyStr
      .toLowerCase()
      .replace(/\s+/g, '')
      .split('+')
      .sort((a, b) => {
        // Order: ctrl, alt, shift, then key
        const order = { ctrl: 1, alt: 2, shift: 3 };
        return (order[a] || 9) - (order[b] || 9);
      })
      .join('+');
  }

  keyEventToString(ev) {
    if (!ev) return '';
    const keyName = ev.name || ev.char;
    if (!keyName) return '';
    const parts = [];
    if (ev.ctrl) parts.push('ctrl');
    if (ev.alt) parts.push('alt');
    if (ev.shift && keyName.length > 1) parts.push('shift'); // Only add shift modifier for non-printable keys
    parts.push(keyName.toLowerCase());
    return this.normalizeKey(parts.join('+'));
  }

  /**
   * Fuzzy search commands for Command Palette.
   *
   * @param {string} query
   * @returns {Array<object & { score: number }>}
   */
  search(query) {
    if (!query) {
      return this.getAll().map(c => ({ ...c, score: 0 }));
    }

    const q = query.toLowerCase().trim();
    const results = [];

    for (const cmd of this.commands.values()) {
      const target = `${cmd.category}: ${cmd.title} ${cmd.description || ''}`.toLowerCase();
      const score = this._fuzzyScore(q, target);
      if (score > 0) {
        results.push({ ...cmd, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  _fuzzyScore(query, target) {
    // Exact substring bonus
    if (target.includes(query)) {
      return 100 + (query.length / target.length) * 50;
    }

    // Subsequence match
    let qIdx = 0;
    let score = 0;
    let prevMatched = false;

    for (let tIdx = 0; tIdx < target.length && qIdx < query.length; tIdx++) {
      if (target[tIdx] === query[qIdx]) {
        score += 10;
        if (prevMatched) score += 5; // Consecutive character bonus
        if (tIdx === 0 || target[tIdx - 1] === ' ' || target[tIdx - 1] === ':') {
          score += 15; // Word start bonus
        }
        qIdx++;
        prevMatched = true;
      } else {
        prevMatched = false;
      }
    }

    return qIdx === query.length ? score : 0;
  }
}
