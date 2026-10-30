#!/usr/bin/env node
import { runCLI } from '../src/index.js';

runCLI().catch((err) => {
  console.error('\n\x1b[31mFatal CLI error:\x1b[0m', err.message);
  process.exit(1);
});
