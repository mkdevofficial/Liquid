import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starterStore } from '../src/store.js';

test('Starter Template - store increments, decrements, and navigates', () => {
  assert.equal(starterStore.count, 0);
  starterStore.increment();
  assert.equal(starterStore.count, 1);
  starterStore.increment();
  assert.equal(starterStore.count, 2);
  starterStore.decrement();
  assert.equal(starterStore.count, 1);

  assert.equal(starterStore.currentRoute, '/');
  starterStore.navigate('/about');
  assert.equal(starterStore.currentRoute, '/about');
  starterStore.navigate('/');
  assert.equal(starterStore.currentRoute, '/');
});
