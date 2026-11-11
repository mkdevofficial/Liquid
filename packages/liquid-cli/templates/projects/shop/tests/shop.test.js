import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopStore } from '../src/store.js';

test('Shop Template - handles catalog filtering, cart calculations, and checkout', () => {
  assert.equal(shopStore.products.length, 6);
  assert.equal(shopStore.getFilteredProducts().length, 6);

  // Filter by category
  shopStore.setCategory('Audio');
  assert.equal(shopStore.getFilteredProducts().length, 2);
  assert.ok(shopStore.getFilteredProducts().every(p => p.category === 'Audio'));
  shopStore.setCategory('All');

  // Add items to cart
  assert.equal(shopStore.getCartCount(), 0);
  shopStore.addToCart(1); // $129 keyboard
  shopStore.addToCart(2); // $89 buds
  assert.equal(shopStore.getCartCount(), 2);
  assert.equal(shopStore.getSubtotal(), 129 + 89); // 218

  // Free shipping over 100
  assert.equal(shopStore.getShipping(), 0);
  assert.ok(shopStore.getTotal() > 218);

  // Quantity updates
  shopStore.updateQuantity(2, 1); // 2 buds
  assert.equal(shopStore.getCartCount(), 3);
  shopStore.updateQuantity(2, -2); // remove buds
  assert.equal(shopStore.getCartCount(), 1);

  // Place order
  assert.equal(shopStore.orderPlacedId, null);
  shopStore.placeOrder();
  assert.ok(shopStore.orderPlacedId !== null);
  assert.equal(shopStore.getCartCount(), 0);

  // Reset
  shopStore.resetOrder();
  assert.equal(shopStore.orderPlacedId, null);
});
