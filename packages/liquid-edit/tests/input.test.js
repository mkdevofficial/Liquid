import test from 'node:test';
import assert from 'node:assert';
import { InputParser } from '../src/terminal/input.js';

test('InputParser - parses standard characters and enter/tab/backspace', (t, done) => {
  const parser = new InputParser();
  const keys = [];
  parser.on('key', k => keys.push(k));

  parser.feed('A');
  parser.feed('b');
  parser.feed('\t');
  parser.feed('\r');
  parser.feed('\x7f');

  assert.strictEqual(keys.length, 5);
  assert.strictEqual(keys[0].name, 'A');
  assert.strictEqual(keys[0].shift, true);
  assert.strictEqual(keys[1].name, 'b');
  assert.strictEqual(keys[2].name, 'tab');
  assert.strictEqual(keys[3].name, 'enter');
  assert.strictEqual(keys[4].name, 'backspace');
  done();
});

test('InputParser - parses Ctrl keys', (t, done) => {
  const parser = new InputParser();
  const keys = [];
  parser.on('key', k => keys.push(k));

  // Ctrl-A (code 1), Ctrl-S (code 19), Ctrl-C (code 3)
  parser.feed(String.fromCharCode(1));
  parser.feed(String.fromCharCode(19));
  parser.feed(String.fromCharCode(3));

  assert.strictEqual(keys[0].name, 'a');
  assert.strictEqual(keys[0].ctrl, true);

  assert.strictEqual(keys[1].name, 's');
  assert.strictEqual(keys[1].ctrl, true);

  assert.strictEqual(keys[2].name, 'c');
  assert.strictEqual(keys[2].ctrl, true);
  done();
});

test('InputParser - parses CSI arrow keys and modified arrows', (t, done) => {
  const parser = new InputParser();
  const keys = [];
  parser.on('key', k => keys.push(k));

  parser.feed('\x1b[A'); // Up
  parser.feed('\x1b[B'); // Down
  parser.feed('\x1b[1;5C'); // Ctrl+Right
  parser.feed('\x1b[1;2D'); // Shift+Left

  assert.strictEqual(keys[0].name, 'up');
  assert.strictEqual(keys[1].name, 'down');

  assert.strictEqual(keys[2].name, 'right');
  assert.strictEqual(keys[2].ctrl, true);

  assert.strictEqual(keys[3].name, 'left');
  assert.strictEqual(keys[3].shift, true);
  done();
});

test('InputParser - parses SGR mouse coordinates and drag', (t, done) => {
  const parser = new InputParser();
  const mouseEvents = [];
  parser.on('mouse', m => mouseEvents.push(m));

  // Press left button at col 15, row 8: \x1b[<0;16;9M (1-based in sequence)
  parser.feed('\x1b[<0;16;9M');

  // Drag to col 25, row 8: \x1b[<32;26;9M (button + 32)
  parser.feed('\x1b[<32;26;9M');

  // Release at col 25, row 8: \x1b[<0;26;9m
  parser.feed('\x1b[<0;26;9m');

  // Scroll down at col 20, row 5: \x1b[<65;21;6M
  parser.feed('\x1b[<65;21;6M');

  assert.strictEqual(mouseEvents.length, 4);

  assert.strictEqual(mouseEvents[0].action, 'press');
  assert.strictEqual(mouseEvents[0].button, 'left');
  assert.strictEqual(mouseEvents[0].col, 15);
  assert.strictEqual(mouseEvents[0].row, 8);

  assert.strictEqual(mouseEvents[1].action, 'drag');
  assert.strictEqual(mouseEvents[1].col, 25);
  assert.strictEqual(mouseEvents[1].row, 8);

  assert.strictEqual(mouseEvents[2].action, 'release');

  assert.strictEqual(mouseEvents[3].action, 'wheeldown');
  assert.strictEqual(mouseEvents[3].col, 20);
  assert.strictEqual(mouseEvents[3].row, 5);
  done();
});

test('InputParser - parses bracketed paste without interpreting internal sequences', (t, done) => {
  const parser = new InputParser();
  let pasted = '';
  parser.on('paste', text => {
    pasted = text;
  });

  parser.feed('\x1b[200~const x = 42;\nfunction foo() {}\x1b[201~');

  assert.strictEqual(pasted, 'const x = 42;\nfunction foo() {}');
  done();
});

test('InputParser - resolves lone escape after brief timeout', async () => {
  const parser = new InputParser();
  parser.escTimeoutMs = 15;

  let gotEscape = false;
  parser.on('key', k => {
    if (k.name === 'escape') gotEscape = true;
  });

  parser.feed('\x1b');
  assert.strictEqual(gotEscape, false, 'Should wait briefly for possible sequence');

  await new Promise(r => setTimeout(r, 30));
  assert.strictEqual(gotEscape, true, 'Should emit lone escape after timeout');
});
