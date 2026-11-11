import fs from 'node:fs';
import path from 'node:path';
import { formatExcerpt } from '@mkdevofficial/liquid-compiler';

/**
 * Resolves a runtime exception's stack trace in bundle.js back to original .liq source location.
 *
 * @param {object} params
 * @param {string} params.message - Error message (e.g. "ReferenceError: ...")
 * @param {string} params.stack - Stack trace from JS engine
 * @param {string} [params.bundleCode=''] - The generated bundle.js source
 * @param {Array<object>} [params.sourceFiles=[]] - List of { path, content }
 * @param {string} [params.rootDir=process.cwd()]
 * @returns {{ file: string, line: number, column: number, message: string, frame: string }}
 */
export function resolveRuntimeError({ message, stack, bundleCode = '', sourceFiles = [], rootDir = process.cwd() }) {
  const stackStr = String(stack || message || '');
  const parsed = parseBundleLocation(stackStr);

  let mappedFile = 'bundle.js';
  let mappedLine = parsed.line || 1;
  let mappedCol = parsed.column || 1;

  // 1. Extract embedded __LIQUID_SOURCEMAP__ from bundleCode if available
  let sourcemapEntries = [];
  if (bundleCode) {
    const smMatch = bundleCode.match(/__LIQUID_SOURCEMAP__\s*=\s*(\[[^;]+\]);/);
    if (smMatch) {
      try {
        sourcemapEntries = JSON.parse(smMatch[1]);
      } catch (_) {}
    }
  }

  // 2. Map bundle line to original source file and line
  if (parsed.line && sourcemapEntries.length > 0) {
    for (const entry of sourcemapEntries) {
      if (parsed.line >= entry.bundleStart && parsed.line <= entry.bundleEnd) {
        mappedFile = entry.file;
        const relLine = parsed.line - entry.bundleStart + 1;
        if (entry.lineMap && entry.lineMap[relLine]) {
          mappedLine = entry.lineMap[relLine];
        } else {
          mappedLine = Math.max(1, relLine);
        }
        break;
      }
    }
  }

  // 3. Obtain original source file content
  let sourceContent = '';
  const foundSf = sourceFiles.find(sf => sf.path === mappedFile || sf.path.endsWith(mappedFile));
  if (foundSf && foundSf.content) {
    sourceContent = foundSf.content;
  } else {
    const diskPath = path.isAbsolute(mappedFile) ? mappedFile : path.join(rootDir, mappedFile);
    if (fs.existsSync(diskPath)) {
      try {
        sourceContent = fs.readFileSync(diskPath, 'utf8');
      } catch (_) {}
    }
  }

  // If source file available, attempt exact statement match to locate line in .liq
  if (sourceContent && bundleCode) {
    const bundleLines = bundleCode.split(/\r?\n/);
    const targetBundleLine = bundleLines[parsed.line - 1];
    if (targetBundleLine) {
      const trimmedTarget = targetBundleLine.trim();
      if (trimmedTarget && trimmedTarget.length > 3 && !['{', '}', 'return;', '});', '};'].includes(trimmedTarget)) {
        const origLines = sourceContent.split(/\r?\n/);
        for (let i = 0; i < origLines.length; i++) {
          if (origLines[i].includes(trimmedTarget)) {
            mappedLine = i + 1;
            const colIdx = origLines[i].indexOf(trimmedTarget);
            mappedCol = colIdx !== -1 ? colIdx + 1 : 1;
            break;
          }
        }
      }
    }
  }

  // If source file not found or line exceeds content, fallback to bundleCode
  if (!sourceContent) {
    sourceContent = bundleCode;
    mappedFile = 'bundle.js';
    mappedLine = parsed.line || 1;
  }

  const frame = formatExcerpt({
    message,
    code: 'LQ-RUNTIME-ERR',
    file: mappedFile,
    line: mappedLine,
    column: mappedCol,
    source: sourceContent
  });

  return {
    file: mappedFile,
    line: mappedLine,
    column: mappedCol,
    message,
    frame,
    originalStack: stack
  };
}

export function parseBundleLocation(stackStr) {
  // Regex to match (bundle.js:123:45), (main.bundle.js:123:45), evalmachine.<anonymous>:123:45
  const patterns = [
    /(?:bundle\.js|main\.bundle\.js|evalmachine\.<anonymous>|\[eval[^\]]*\]):(\d+):(\d+)/i,
    /(?:bundle\.js|main\.bundle\.js|evalmachine\.<anonymous>|\[eval[^\]]*\]):(\d+)/i,
    /:(\d+):(\d+)\)?$/m,
    /:(\d+)\)?$/m
  ];

  for (const p of patterns) {
    const m = stackStr.match(p);
    if (m) {
      return {
        line: parseInt(m[1], 10),
        column: m[2] ? parseInt(m[2], 10) : 1
      };
    }
  }

  return { line: 1, column: 1 };
}
