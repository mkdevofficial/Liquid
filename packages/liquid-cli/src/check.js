import fs from 'node:fs';
import path from 'node:path';
import { compile, LiquidSyntaxError } from '@mkdevofficial/liquid-compiler';
import { printBanner } from './banner.js';

/**
 * Validate all .liq files in a project without building.
 */
export async function checkCommand(options = {}) {
  printBanner('check');
  const rootDir = process.cwd();
  const liqFiles = findLiqFiles(rootDir);

  if (liqFiles.length === 0) {
    console.log('  No .liq files found in project.\n');
    return { success: true, count: 0, errors: 0 };
  }

  console.log(`  Checking ${liqFiles.length} .liq file${liqFiles.length === 1 ? '' : 's'}...\n`);

  let errorCount = 0;
  let warningCount = 0;

  for (const filePath of liqFiles) {
    const relPath = path.relative(rootDir, filePath);
    const source = fs.readFileSync(filePath, 'utf8');

    try {
      const result = compile(source, { file: relPath });
      if (result.warnings && result.warnings.length > 0) {
        for (const w of result.warnings) {
          warningCount++;
          console.warn(`  \x1b[33m⚠ Warning:\x1b[0m ${relPath}:${w.loc?.line || 1}:${w.loc?.column || 1} - ${w.message}`);
        }
      }
    } catch (err) {
      errorCount++;
      if (err instanceof LiquidSyntaxError) {
        console.error(err.message);
      } else {
        console.error(`  \x1b[31m✖ Error:\x1b[0m ${relPath}: ${err.message}\n`);
      }
    }
  }

  if (errorCount > 0) {
    console.error(`  \x1b[31m✖ Found ${errorCount} error${errorCount === 1 ? '' : 's'}.\x1b[0m\n`);
    if (!options.silent) process.exitCode = 1;
    return { success: false, count: liqFiles.length, errors: errorCount, warnings: warningCount };
  }

  console.log(`  \x1b[32m✔ All ${liqFiles.length} .liq files passed validation!\x1b[0m\n`);
  return { success: true, count: liqFiles.length, errors: 0, warnings: warningCount };
}

function findLiqFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findLiqFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.liq')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}
