import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printBanner } from './banner.js';
import { devCommand } from './dev.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getExamplesDir() {
  const localCandidates = [
    path.resolve(__dirname, '../examples'),
    path.resolve(__dirname, '../../../examples')
  ];

  for (const c of localCandidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export function loadAllExamples() {
  const dir = getExamplesDir();
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const examples = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^\d{2}-/.test(entry.name)) continue;

    const exampleDir = path.join(dir, entry.name);
    const metaPath = path.join(exampleDir, 'liquid.example.json');
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (_) {}
    }

    examples.push({
      id: entry.name,
      title: meta.title || entry.name,
      category: meta.category || 'General',
      description: meta.description || '',
      difficulty: meta.difficulty || 'intermediate',
      platforms: meta.platforms || ['web', 'android'],
      keywords: meta.keywords || [],
      dir: exampleDir
    });
  }

  return examples.sort((a, b) => a.id.localeCompare(b.id));
}

export function listExamples() {
  const examples = loadAllExamples();
  console.log('\n  \x1b[1;36mAvailable Liquid Examples:\x1b[0m\n');

  let currentCategory = '';
  for (const ex of examples) {
    if (ex.category !== currentCategory) {
      currentCategory = ex.category;
      console.log(`  \x1b[1;35m${currentCategory}\x1b[0m`);
    }
    const diffColor = ex.difficulty === 'beginner' ? '\x1b[32m' : (ex.difficulty === 'advanced' ? '\x1b[31m' : '\x1b[33m');
    console.log(`    \x1b[1;32m${ex.id.padEnd(34)}\x1b[0m ${diffColor}[${ex.difficulty.padEnd(12)}]\x1b[0m ${ex.description}`);
  }

  console.log('\n  Usage:');
  console.log('    \x1b[36mliquid examples <id>\x1b[0m                  Run the example directly in dev server');
  console.log('    \x1b[36mliquid examples <id> --copy [dest]\x1b[0m    Copy the example to current directory to edit\n');
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export async function examplesCommand(exampleArg, options = {}) {
  printBanner('examples');

  const examples = loadAllExamples();

  if (!exampleArg || options.list || exampleArg === '--list' || exampleArg === '-l') {
    listExamples();
    return;
  }

  // Find matching example
  const arg = String(exampleArg).trim().toLowerCase();
  let found = examples.find(e => e.id === arg);
  if (!found) {
    found = examples.find(e => e.id.toLowerCase() === arg || e.id.toLowerCase().endsWith(`-${arg}`) || e.id.toLowerCase().startsWith(`${arg}-`));
  }
  if (!found) {
    const num = parseInt(arg, 10);
    if (!isNaN(num)) {
      const prefix = String(num).padStart(2, '0') + '-';
      found = examples.find(e => e.id.startsWith(prefix));
    }
  }

  if (!found) {
    console.error(`  \x1b[31mError: Example '${exampleArg}' not found.\x1b[0m\n`);
    listExamples();
    process.exitCode = 1;
    return;
  }

  if (options.copy || options.c) {
    const destName = (typeof options.copy === 'string' && options.copy.length > 0)
      ? options.copy
      : (typeof options.c === 'string' && options.c.length > 0)
        ? options.c
        : (options._ && options._[1] ? options._[1] : found.id);

    const destDir = path.resolve(process.cwd(), destName);
    if (fs.existsSync(destDir)) {
      console.error(`  \x1b[31mError: Destination '${destDir}' already exists.\x1b[0m\n`);
      process.exitCode = 1;
      return;
    }

    copyDirRecursive(found.dir, destDir);
    console.log(`  \x1b[32m✔ Copied example '${found.id}' to ./${path.relative(process.cwd(), destDir)}\x1b[0m\n`);
    console.log(`  To run your copied example:\n`);
    console.log(`    \x1b[36mcd ${path.relative(process.cwd(), destDir)}\x1b[0m`);
    console.log(`    \x1b[36mliquid dev\x1b[0m\n`);
    return;
  }

  console.log(`  \x1b[36mRunning example: \x1b[1;37m${found.title}\x1b[0m \x1b[90m(${found.id})\x1b[0m\n`);
  await devCommand({ ...options, root: found.dir });
}
