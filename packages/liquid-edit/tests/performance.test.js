import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/editor.js';
import { TextBuffer } from '../src/text/buffer.js';
import { SyntaxHighlighter } from '../src/highlight/tokenizer.js';

test('10,000-line buffer keystroke and differential render latency is <16ms', () => {
  // Generate 10,000 lines of typical code
  const lines = [];
  for (let i = 0; i < 10000; i++) {
    lines.push(`const item_${i} = signal({ index: ${i}, active: ${i % 2 === 0} });`);
  }
  const bigContent = lines.join('\n');

  const ed = new Editor({
    virtual: true,
    cols: 80,
    rows: 24
  });
  ed.start();
  ed.activeBuffer.insertText(bigContent);

  // Jump to middle of buffer
  ed.activeBuffer.setCursor(5000, 10);
  ed.render();

  // Warmup keystrokes for V8 JIT compilation
  for (let i = 0; i < 3; i++) {
    ed.handleKey({ char: 'a' });
    ed.render();
  }

  // Benchmark 20 keystrokes with render
  const start = performance.now();
  const iterations = 20;

  for (let i = 0; i < iterations; i++) {
    ed.handleKey({ char: 'x' });
    ed.render();
  }

  const elapsed = performance.now() - start;
  const avgLatencyPerKeystroke = elapsed / iterations;

  // Latency target is under 16ms (60 FPS interactive budget)
  assert.ok(
    avgLatencyPerKeystroke < 16,
    `Average keystroke-to-render latency on 10,000-line file must be <16ms (actual: ${avgLatencyPerKeystroke.toFixed(2)}ms)`
  );
});

test('Incremental line syntax highlighting takes <0.1ms per line', () => {
  const highlighter = new SyntaxHighlighter();
  const sampleLiqLine = '  <button @click="increment" class="btn primary">{count.value}</button>';

  // Warmup
  for (let i = 0; i < 50; i++) {
    highlighter.tokenizeLine(sampleLiqLine, 'liq', { section: 'ui' });
  }

  const iterations = 1000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    highlighter.tokenizeLine(sampleLiqLine, 'liq', { section: 'ui' });
  }
  const elapsed = performance.now() - start;
  const perLineMs = elapsed / iterations;

  assert.ok(
    perLineMs < 0.1,
    `Syntax highlighting must be <0.1ms per line (actual: ${perLineMs.toFixed(4)}ms)`
  );
});

test('Cold editor initialization time is <200ms', () => {
  const start = performance.now();
  const ed = new Editor({
    virtual: true,
    cols: 80,
    rows: 24
  });
  ed.start();
  ed.render();
  const duration = performance.now() - start;

  assert.ok(
    duration < 200,
    `Cold editor startup must be <200ms (actual: ${duration.toFixed(2)}ms)`
  );
});
