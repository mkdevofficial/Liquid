/**
 * Terminal Clipboard Integration
 * Supports OSC 52, Termux API (`termux-clipboard-set/get`), and internal fallback register.
 */

import { execSync, spawnSync } from 'node:child_process';

let internalRegister = '';

let hasTermuxClipboard = null;
function checkTermux() {
  if (hasTermuxClipboard !== null) return hasTermuxClipboard;
  try {
    const res = spawnSync('which', ['termux-clipboard-set'], { stdio: 'ignore' });
    hasTermuxClipboard = res.status === 0;
  } catch {
    hasTermuxClipboard = false;
  }
  return hasTermuxClipboard;
}

/**
 * Copy text to system and internal clipboard.
 *
 * @param {string} text
 * @param {import('./screen.js').Screen} [screen]
 */
export function copyToClipboard(text, screen = null) {
  if (!text) return;
  internalRegister = text;

  // 1. Try Termux clipboard if present
  if (checkTermux()) {
    try {
      spawnSync('termux-clipboard-set', [], { input: text, encoding: 'utf8', timeout: 500 });
    } catch {}
  }

  // 2. Emit OSC 52 base64 sequence to terminal screen/stdout
  try {
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    const osc52 = `\x1b]52;c;${b64}\x07`;
    if (screen && !screen.virtual && screen.outStream) {
      screen.outStream.write(osc52);
    } else if (process.stdout.isTTY) {
      process.stdout.write(osc52);
    }
  } catch {}
}

/**
 * Paste / read text from clipboard.
 *
 * @returns {string}
 */
export function getFromClipboard() {
  if (checkTermux()) {
    try {
      const res = spawnSync('termux-clipboard-get', [], { encoding: 'utf8', timeout: 500 });
      if (res.status === 0 && res.stdout) {
        return res.stdout;
      }
    } catch {}
  }

  return internalRegister;
}
