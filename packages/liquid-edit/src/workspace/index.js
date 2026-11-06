/**
 * Workspace and Project Manager
 * Project root detection, recent files tracking, and fuzzy file finding.
 */

import fs from 'node:fs';
import path from 'node:path';

export class WorkspaceManager {
  /**
   * @param {string} [startDir=process.cwd()]
   */
  constructor(startDir = process.cwd()) {
    this.rootDir = this.detectProjectRoot(startDir);
    this.recentFiles = [];
  }

  detectProjectRoot(startDir) {
    let current = path.resolve(startDir);
    while (current !== path.dirname(current)) {
      if (
        fs.existsSync(path.join(current, 'liquid.config.js')) ||
        fs.existsSync(path.join(current, 'package.json')) ||
        fs.existsSync(path.join(current, '.git'))
      ) {
        return current;
      }
      current = path.dirname(current);
    }
    return path.resolve(startDir);
  }

  addRecent(filePath) {
    const abs = path.resolve(filePath);
    this.recentFiles = [abs, ...this.recentFiles.filter(f => f !== abs)].slice(0, 20);
  }

  /**
   * Recursively list files in workspace for fuzzy file finder.
   *
   * @returns {Array<{ name: string, fullPath: string, relPath: string }>}
   */
  findFiles() {
    const results = [];
    const walk = (dir, depth = 0) => {
      if (depth > 6) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith('.') && item.name !== '.liq') continue;
          if (item.name === 'node_modules' || item.name === 'dist') continue;

          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            walk(fullPath, depth + 1);
          } else {
            results.push({
              name: item.name,
              fullPath,
              relPath: path.relative(this.rootDir, fullPath)
            });
          }
        }
      } catch {}
    };

    walk(this.rootDir);
    return results;
  }
}
