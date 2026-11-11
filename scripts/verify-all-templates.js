#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compile } from '../packages/liquid-compiler/src/index.js';
import { createAndroidBundle, loadProjectConfig } from '../packages/liquid-cli/src/android.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function findFiles(dir, ext, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.liquid') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, ext, list);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      list.push(full);
    }
  }
  return list;
}

async function verifyTarget(target) {
  const { id, type, dir, testFile } = target;
  const result = {
    id,
    type,
    webBuild: false,
    androidBuild: false,
    zeroCssDiag: false,
    linkCheck: false,
    unitTests: false,
    status: 'FAIL',
    errors: []
  };

  const liqFiles = findFiles(dir, '.liq');
  if (liqFiles.length === 0) {
    result.errors.push('No .liq files found in project');
    return result;
  }

  // 1. Web Build Compilation Check
  try {
    for (const f of liqFiles) {
      const relPath = path.relative(dir, f);
      const code = fs.readFileSync(f, 'utf8');
      compile(code, { target: 'web', file: relPath });
    }
    result.webBuild = true;
  } catch (err) {
    result.errors.push(`Web compilation failed: ${err.message}`);
  }

  // 2. Android Build Compilation & Diagnostics Check
  const unsupportedDiags = [];
  try {
    for (const f of liqFiles) {
      const relPath = path.relative(dir, f);
      const code = fs.readFileSync(f, 'utf8');
      const compRes = compile(code, { target: 'android', file: relPath });
      const unsupp = (compRes.diagnostics || []).filter(d => d.status === 'unsupported');
      if (unsupp.length > 0) {
        unsupportedDiags.push(...unsupp);
      }
    }
    result.androidBuild = true;
    if (unsupportedDiags.length === 0) {
      result.zeroCssDiag = true;
    } else {
      result.errors.push(`Found ${unsupportedDiags.length} unsupported CSS diagnostics:\n` +
        unsupportedDiags.map(d => `  - ${d.file}:${d.line} ${d.property}: ${d.message}`).join('\n')
      );
    }
  } catch (err) {
    result.errors.push(`Android compilation failed: ${err.message}`);
  }

  // 3. Link Check via createAndroidBundle
  try {
    const config = loadProjectConfig(dir);
    createAndroidBundle(dir, config, { mode: 'verify', id: 'verify-all' });
    result.linkCheck = true;
  } catch (err) {
    result.errors.push(`Android link-check failed: ${err.message}`);
  }

  // 4. Unit Test Check
  if (testFile && fs.existsSync(testFile)) {
    try {
      const proc = spawnSync(process.execPath, ['--test', testFile], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 15000
      });
      if (proc.status === 0) {
        result.unitTests = true;
      } else {
        result.errors.push(`Unit tests failed (exit code ${proc.status}):\n${proc.stderr || proc.stdout}`);
      }
    } catch (err) {
      result.errors.push(`Unit test execution error: ${err.message}`);
    }
  } else {
    result.errors.push(`Test file not found: ${testFile}`);
  }

  if (result.webBuild && result.androidBuild && result.zeroCssDiag && result.linkCheck && result.unitTests) {
    result.status = 'PASS';
  }

  return result;
}

async function run() {
  console.log('\n======================================================');
  console.log('   Liquid — Unified Verification for Templates & Examples');
  console.log('======================================================\n');

  const targets = [];

  // 8 Templates
  const templatesBase = path.join(rootDir, 'packages', 'liquid-cli', 'templates', 'projects');
  if (fs.existsSync(templatesBase)) {
    const tDirs = fs.readdirSync(templatesBase, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const td of tDirs) {
      const dir = path.join(templatesBase, td.name);
      const testFile = path.join(dir, 'tests', `${td.name}.test.js`);
      targets.push({
        id: td.name,
        type: 'template',
        dir,
        testFile
      });
    }
  }

  // 20 Examples
  const examplesBase = path.join(rootDir, 'examples');
  if (fs.existsSync(examplesBase)) {
    const exDirs = fs.readdirSync(examplesBase, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{2}-/.test(d.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const ed of exDirs) {
      const dir = path.join(examplesBase, ed.name);
      const testFile = path.join(dir, 'test.js');
      targets.push({
        id: ed.name,
        type: 'example',
        dir,
        testFile
      });
    }
  }

  console.log(`Found ${targets.length} targets to verify (8 templates + ${targets.length - 8} examples).\n`);

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] Verifying ${target.type} '${target.id}'... `);
    const res = await verifyTarget(target);
    results.push(res);
    if (res.status === 'PASS') {
      console.log('\x1b[32m✔ PASS\x1b[0m');
    } else {
      console.log('\x1b[31m✖ FAIL\x1b[0m');
    }
  }

  // Generate Markdown Summary Table
  console.log('\n### Verification Summary Table\n');
  console.log('| Target | Type | Web Build | Android Build | Zero CSS Diag | Link Check | Unit Tests | Status |');
  console.log('|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|');

  for (const r of results) {
    const webMark = r.webBuild ? 'PASS' : 'FAIL';
    const andMark = r.androidBuild ? 'PASS' : 'FAIL';
    const cssMark = r.zeroCssDiag ? 'PASS' : 'FAIL';
    const linkMark = r.linkCheck ? 'PASS' : 'FAIL';
    const testMark = r.unitTests ? 'PASS' : 'FAIL';
    const statusMark = r.status === 'PASS' ? '**PASS**' : '**FAIL**';
    console.log(`| \`${r.id}\` | ${r.type} | ${webMark} | ${andMark} | ${cssMark} | ${linkMark} | ${testMark} | ${statusMark} |`);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;

  console.log(`\n\x1b[1mVerification Result:\x1b[0m Total: ${results.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[${failed > 0 ? '31' : '32'}m${failed}\x1b[0m\n`);

  if (failed > 0) {
    console.error('\x1b[31mErrors detected:\x1b[0m');
    for (const r of results) {
      if (r.errors.length > 0) {
        console.error(`\n\x1b[1m[${r.id}]\x1b[0m:`);
        for (const e of r.errors) {
          console.error(`  - ${e}`);
        }
      }
    }
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ All templates and examples verified successfully!\x1b[0m\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
