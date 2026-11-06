import test from 'node:test';
import assert from 'node:assert';
import {
  signal,
  computed,
  effect,
  batch,
  untrack,
  createScope,
  onDestroy
} from '../src/signals.js';

test('Signals - basic read, write, set, update, peek', () => {
  const count = signal(0);
  assert.strictEqual(count(), 0);

  count(1);
  assert.strictEqual(count(), 1);

  count.set(5);
  assert.strictEqual(count(), 5);

  count.update(n => n + 2);
  assert.strictEqual(count(), 7);

  assert.strictEqual(count.peek(), 7);
});

test('Signals - computed is lazily evaluated and cached', () => {
  let runs = 0;
  const num = signal(2);
  const squared = computed(() => {
    runs++;
    return num() * num();
  });

  // Not read yet -> runs should be 0
  assert.strictEqual(runs, 0);

  // First read -> runs should be 1
  assert.strictEqual(squared(), 4);
  assert.strictEqual(runs, 1);

  // Second read with no dependency change -> runs should still be 1 (cached!)
  assert.strictEqual(squared(), 4);
  assert.strictEqual(runs, 1);

  // Change dependency -> dirty flag set, but computeFn doesn't run until read
  num.set(3);
  assert.strictEqual(runs, 1);

  assert.strictEqual(squared(), 9);
  assert.strictEqual(runs, 2);
});

test('Signals - effect runs immediately, tracks signals, runs cleanup', () => {
  const name = signal('Alice');
  const log = [];
  const cleanups = [];

  const dispose = effect(() => {
    const current = name();
    log.push(`Hello ${current}`);
    return () => {
      cleanups.push(`Cleanup ${current}`);
    };
  });

  assert.deepStrictEqual(log, ['Hello Alice']);
  assert.deepStrictEqual(cleanups, []);

  name.set('Bob');
  assert.deepStrictEqual(log, ['Hello Alice', 'Hello Bob']);
  assert.deepStrictEqual(cleanups, ['Cleanup Alice']);

  dispose();
  assert.deepStrictEqual(cleanups, ['Cleanup Alice', 'Cleanup Bob']);

  // After disposal, changes should not trigger effect
  name.set('Charlie');
  assert.deepStrictEqual(log, ['Hello Alice', 'Hello Bob']);
});

test('Signals - batch guarantees glitch-free execution and no duplicate effect runs', () => {
  const first = signal('John');
  const last = signal('Doe');
  const runs = [];

  const fullName = computed(() => `${first()} ${last()}`);

  effect(() => {
    runs.push(fullName());
  });

  assert.deepStrictEqual(runs, ['John Doe']);

  // Update both signals inside a batch
  batch(() => {
    first.set('Jane');
    last.set('Smith');
  });

  // Effect should run only ONCE with the combined state (no intermediate "Jane Doe")
  assert.deepStrictEqual(runs, ['John Doe', 'Jane Smith']);
});

test('Signals - untrack avoids registering dependencies', () => {
  const count = signal(0);
  const extra = signal(100);
  const runs = [];

  effect(() => {
    const c = count();
    const e = untrack(() => extra());
    runs.push(`${c}-${e}`);
  });

  assert.deepStrictEqual(runs, ['0-100']);

  // Changing extra should NOT trigger the effect because it was untracked
  extra.set(200);
  assert.deepStrictEqual(runs, ['0-100']);

  // Changing count should trigger it and read updated extra
  count.set(1);
  assert.deepStrictEqual(runs, ['0-100', '1-200']);
});

test('Signals - createScope disposes all contained effects and cleanups', () => {
  const count = signal(0);
  let effectRan = 0;
  let cleanupRan = 0;

  const scope = createScope(() => {
    effect(() => {
      count();
      effectRan++;
    });

    onDestroy(() => {
      cleanupRan++;
    });
  });

  assert.strictEqual(effectRan, 1);
  assert.strictEqual(cleanupRan, 0);

  count.set(1);
  assert.strictEqual(effectRan, 2);

  // Dispose scope
  scope.dispose();
  assert.strictEqual(cleanupRan, 1);

  // After scope disposal, effect must not run on signal change
  count.set(2);
  assert.strictEqual(effectRan, 2);
});

test('Signals - property .value reads, writes, and reactively tracks', () => {
  const count = signal(10);
  const double = computed(() => count.value * 2);

  assert.strictEqual(count.value, 10);
  assert.strictEqual(double.value, 20);

  let observed = null;
  effect(() => {
    observed = double.value;
  });
  assert.strictEqual(observed, 20);

  count.value = 25;
  assert.strictEqual(count.value, 25);
  assert.strictEqual(double.value, 50);
  assert.strictEqual(observed, 50);
});
