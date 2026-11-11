import test from 'node:test';
import assert from 'node:assert';
import {
  signal,
  effect,
  setRenderer,
  element,
  text,
  bindText,
  bindAttr,
  setStyle,
  listen,
  bindInput,
  insert,
  remove,
  mount,
  createIfBlock,
  createEachBlock,
  AndroidBatchRenderer,
  OP_CREATE_NODE,
  OP_CREATE_TEXT,
  OP_SET_PROP,
  OP_SET_STYLE,
  OP_SET_TEXT,
  OP_INSERT,
  OP_REMOVE,
  OP_LISTEN,
  OP_UNLISTEN,
  TYPE_VIEW,
  TYPE_TEXT,
  TYPE_IMAGE,
  TYPE_INPUT,
  TYPE_BUTTON,
  TYPE_SCROLL
} from '../src/index.js';

test('AndroidBatchRenderer - node and text creation generates compact op batch', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const viewNode = element('view', 'data-scope-1', ['container']);
  const btnNode = element('button');
  const txtNode = text('Click Me');
  insert(btnNode, txtNode);
  insert(viewNode, btnNode);

  const batch = renderer.flush();
  assert.ok(Array.isArray(batch));

  // Check opcodes
  const creates = batch.filter(op => op[0] === OP_CREATE_NODE);
  assert.strictEqual(creates.length, 2);
  assert.strictEqual(creates[0][2], TYPE_VIEW);
  assert.strictEqual(creates[1][2], TYPE_BUTTON);

  const texts = batch.filter(op => op[0] === OP_CREATE_TEXT);
  assert.strictEqual(texts.length, 1);
  assert.strictEqual(texts[0][2], 'Click Me');

  const inserts = batch.filter(op => op[0] === OP_INSERT);
  assert.strictEqual(inserts.length, 2);
  // insert txtNode into btnNode
  assert.strictEqual(inserts[0][1], btnNode.id);
  assert.strictEqual(inserts[0][2], txtNode.id);
});

test('AndroidBatchRenderer - HTML tags map to native Android primitives', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const d = element('div');
  const s = element('span');
  const img = element('img');
  const inp = element('input');
  const b = element('button');
  const scr = element('scroll');

  assert.strictEqual(d.nativeType, TYPE_VIEW);
  assert.strictEqual(s.nativeType, TYPE_TEXT);
  assert.strictEqual(img.nativeType, TYPE_IMAGE);
  assert.strictEqual(inp.nativeType, TYPE_INPUT);
  assert.strictEqual(b.nativeType, TYPE_BUTTON);
  assert.strictEqual(scr.nativeType, TYPE_SCROLL);
});

test('AndroidBatchRenderer - fine-grained signal changes emit minimal ops', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const count = signal(0);
  const txtNode = text('');
  bindText(txtNode, () => `Count: ${count()}`);

  renderer.flush(); // Flush initial render

  // Update signal
  count.set(1);
  const updateBatch = renderer.flush();

  // ONLY OP_SET_TEXT should be emitted! No tree diffing, no extra ops!
  assert.strictEqual(updateBatch.length, 1);
  assert.strictEqual(updateBatch[0][0], OP_SET_TEXT);
  assert.strictEqual(updateBatch[0][1], txtNode.id);
  assert.strictEqual(updateBatch[0][2], 'Count: 1');
});

test('AndroidBatchRenderer - setStyle emits OP_SET_STYLE with normalized object', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const box = element('view');
  setStyle(box, {
    flexDirection: 'column',
    padding: 16,
    backgroundColor: '#ff0000',
    borderRadius: 8
  });

  const batch = renderer.flush();
  const styleOp = batch.find(op => op[0] === OP_SET_STYLE);
  assert.ok(styleOp);
  assert.strictEqual(styleOp[1], box.id);
  assert.deepStrictEqual(styleOp[2], {
    flexDirection: 'column',
    padding: 16,
    backgroundColor: '#ff0000',
    borderRadius: 8
  });
});

test('AndroidBatchRenderer - native event dispatch triggers JS listener and updates UI', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const count = signal(0);
  const btn = element('button');
  const txt = text('');
  bindText(txt, () => String(count()));
  listen(btn, 'click', () => {
    count.update(c => c + 1);
  });

  renderer.flush();

  // Simulate native click event from Android JNI
  renderer.dispatchNativeEvent(btn.id, 'click', {});

  const postClickBatch = renderer.flush();
  assert.strictEqual(count(), 1);
  assert.strictEqual(postClickBatch.length, 1);
  assert.strictEqual(postClickBatch[0][0], OP_SET_TEXT);
  assert.strictEqual(postClickBatch[0][2], '1');
});

test('AndroidBatchRenderer - two-way input binding works with native events', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const message = signal('hello');
  const input = element('input');
  bindInput(input, message);

  renderer.flush();

  assert.strictEqual(input.value, 'hello');

  // Simulate user typing on Android soft keyboard
  renderer.dispatchNativeEvent(input.id, 'input', { target: { value: 'world' } });

  assert.strictEqual(message(), 'world');
});

test('AndroidBatchRenderer - reactive if-block and each-block render natively', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const show = signal(true);
  const container = element('view');
  const anchor = renderer.createComment('if');
  insert(container, anchor);

  createIfBlock(
    anchor,
    () => show(),
    () => [text('Visible')],
    () => [text('Hidden')]
  );

  let batch = renderer.flush();
  assert.ok(batch.some(op => op[0] === OP_CREATE_TEXT && op[2] === 'Visible'));

  show.set(false);
  batch = renderer.flush();
  assert.ok(batch.some(op => op[0] === OP_REMOVE));
  assert.ok(batch.some(op => op[0] === OP_CREATE_TEXT && op[2] === 'Hidden'));
});

test('AndroidBatchRenderer - multi-chunk text elements aggregate text and emit parent OP_SET_TEXT (Regression Fix)', () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  const activeCount = signal(3);
  const badge = element('text');
  const t1 = text('');
  bindText(t1, () => String(activeCount()));
  badge.appendChild(t1);

  const t2 = text(' tasks remaining');
  badge.appendChild(t2);

  const initialBatch = renderer.flush();
  assert.strictEqual(badge.textContent, '3 tasks remaining');

  // Verify that an OP_SET_TEXT was emitted for the parent badge TextView with the combined text
  const setTextOp = initialBatch.reverse().find(op => op[0] === OP_SET_TEXT && op[1] === badge.id);
  assert.ok(setTextOp, 'OP_SET_TEXT must target parent TextView');
  assert.strictEqual(setTextOp[2], '3 tasks remaining');

  // Now update the reactive signal
  activeCount.set(4);
  const updateBatch = renderer.flush();

  assert.strictEqual(badge.textContent, '4 tasks remaining');
  const updateOp = updateBatch.find(op => op[0] === OP_SET_TEXT && op[1] === badge.id);
  assert.ok(updateOp, 'Reactive update must emit OP_SET_TEXT for parent TextView');
  assert.strictEqual(updateOp[2], '4 tasks remaining');
});

test('AndroidBatchRenderer - button click dispatches, increments signal, and auto-flushes update (Regression Fix)', async () => {
  const renderer = new AndroidBatchRenderer();
  setRenderer(renderer);

  let bridgeReceived = null;
  globalThis.__liquid_native_bridge = {
    applyBatch(batchJson) {
      bridgeReceived = JSON.parse(batchJson);
    }
  };

  const count = signal(0);
  const counterVal = element('text');
  const tCount = text('');
  bindText(tCount, () => String(count()));
  counterVal.appendChild(tCount);

  const btnPlus = element('button');
  const tPlus = text('+');
  btnPlus.appendChild(tPlus);

  listen(btnPlus, 'click', () => {
    count.update(c => c + 1);
  });

  renderer.flush();
  assert.strictEqual(counterVal.textContent, '0');
  assert.strictEqual(btnPlus.textContent, '+');

  // Simulate user tapping the '+' button
  bridgeReceived = null;
  renderer.dispatchNativeEvent(btnPlus.id, 'click', {});

  // Wait for scheduled microtask flush
  await Promise.resolve();

  assert.strictEqual(count(), 1, 'Signal must be incremented by click handler');
  assert.strictEqual(counterVal.textContent, '1', 'Counter text must update to 1');

  // Verify that dispatchNativeEvent automatically flushed the update to the native bridge
  assert.ok(bridgeReceived, 'Bridge must receive op batch automatically upon event dispatch');
  const setOp = bridgeReceived.find(op => op[0] === OP_SET_TEXT && op[1] === counterVal.id);
  assert.ok(setOp, 'Bridge must receive OP_SET_TEXT for counterVal');
  assert.strictEqual(setOp[2], '1');
});
