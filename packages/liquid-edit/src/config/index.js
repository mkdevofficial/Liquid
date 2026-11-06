/**
 * Configuration and User Preference Manager
 * Supports user-level ~/.config/liquid/liquid-edit.json, project-level overrides,
 * and .editorconfig parsing.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const DEFAULT_CONFIG = {
  theme: 'dark',
  tabSize: 2,
  showLineNumbers: true,
  relativeLineNumbers: false,
  softWrap: false,
  showIndentGuides: true,
  keymapProfile: 'simple', // 'simple' | 'emacs' | 'vim'
  quickActionBar: true
};

export class ConfigManager {
  /**
   * @param {string} [projectDir=process.cwd()]
   */
  constructor(projectDir = process.cwd()) {
    this.projectDir = projectDir;
    this.configPath = this._resolveUserConfigPath();
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  _resolveUserConfigPath() {
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(configHome, 'liquid', 'liquid-edit.json');
  }

  load() {
    // 1. User global config
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        Object.assign(this.config, parsed);
      } catch {}
    }

    // 2. Project config override
    const projectConfigPath = path.join(this.projectDir, 'liquid-edit.json');
    if (fs.existsSync(projectConfigPath)) {
      try {
        const raw = fs.readFileSync(projectConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        Object.assign(this.config, parsed);
      } catch {}
    }

    // 3. .editorconfig detection
    const editorConfigPath = path.join(this.projectDir, '.editorconfig');
    if (fs.existsSync(editorConfigPath)) {
      try {
        const content = fs.readFileSync(editorConfigPath, 'utf8');
        const indentMatch = content.match(/indent_size\s*=\s*(\d+)/);
        if (indentMatch) {
          this.config.tabSize = parseInt(indentMatch[1], 10);
        }
      } catch {}
    }
  }

  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch {}
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }
}
