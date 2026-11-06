import test from 'node:test';
import assert from 'node:assert';
import { Window } from 'happy-dom';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;

// Dynamic import so globalThis.window is set when store initializes
const {
  transactions,
  categories,
  settings,
  selectedMonth,
  searchQuery,
  filterType,
  filterCategory,
  sortOrder,
  monthlyIncome,
  monthlyExpense,
  monthlyBalance,
  categoryExpenses,
  filteredHistoryTransactions,
  categoryUsageCounts,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  deleteCategory,
  setCurrency,
  setLanguage,
  setTheme,
  exportData,
  importData
} = await import('../src/store.js');

test('Masrouf Store - initial state has seeded transactions and categories', () => {
  assert.ok(transactions().length >= 8, 'Should have initial seed transactions');
  assert.ok(categories().length >= 10, 'Should have initial seed categories');
  assert.strictEqual(settings().currency, 'SAR');
});

test('Masrouf Store - computed monthly totals for selected month', () => {
  selectedMonth.set('2026-10');
  
  const income = monthlyIncome();
  const expense = monthlyExpense();
  const balance = monthlyBalance();

  assert.ok(income > 0, 'Monthly income should be positive');
  assert.ok(expense > 0, 'Monthly expenses should be positive');
  assert.strictEqual(balance, income - expense, 'Balance must equal income minus expenses');
});

test('Masrouf Store - addTransaction prepends transaction and updates computeds', () => {
  const initialCount = transactions().length;
  const initialExpense = monthlyExpense();

  const newId = addTransaction({
    type: 'expense',
    amount: 150.75,
    category: 'food',
    date: '2026-10-28',
    note: 'Fresh bakery items'
  });

  assert.strictEqual(transactions().length, initialCount + 1);
  const created = transactions().find(t => t.id === newId);
  assert.ok(created, 'Created transaction should exist in store');
  assert.strictEqual(created.amount, 150.75);
  assert.strictEqual(created.note, 'Fresh bakery items');

  assert.strictEqual(monthlyExpense(), initialExpense + 150.75);
});

test('Masrouf Store - updateTransaction modifies transaction in place', () => {
  const tx = transactions()[0];
  const oldAmount = tx.amount;

  updateTransaction(tx.id, {
    amount: oldAmount + 50,
    note: 'Updated note'
  });

  const updated = transactions().find(t => t.id === tx.id);
  assert.strictEqual(updated.amount, oldAmount + 50);
  assert.strictEqual(updated.note, 'Updated note');
});

test('Masrouf Store - deleteTransaction removes transaction', () => {
  const idToDelete = addTransaction({
    type: 'income',
    amount: 500,
    category: 'salary',
    date: '2026-10-29',
    note: 'One-off bonus'
  });

  assert.ok(transactions().some(t => t.id === idToDelete));
  deleteTransaction(idToDelete);
  assert.ok(!transactions().some(t => t.id === idToDelete));
});

test('Masrouf Store - categoryExpenses computes correct percentages and sorts descending', () => {
  selectedMonth.set('2026-10');
  const breakdown = categoryExpenses();

  assert.ok(Array.isArray(breakdown));
  assert.ok(breakdown.length > 0);

  // Assert sorted descending by amount
  for (let i = 0; i < breakdown.length - 1; i++) {
    assert.ok(breakdown[i].amount >= breakdown[i + 1].amount, 'Expenses must be sorted descending');
  }

  // Assert percentages sum is close to 100%
  const sumPercent = breakdown.reduce((sum, item) => sum + item.percentage, 0);
  assert.ok(sumPercent >= 95 && sumPercent <= 105, `Sum of percentages (${sumPercent}%) should be ~100%`);
});

test('Masrouf Store - filteredHistoryTransactions filters by search query and type', () => {
  searchQuery.set('Apartment');
  filterType.set('all');

  let results = filteredHistoryTransactions();
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.ok(r.note.toLowerCase().includes('apartment'));
  }

  // Filter by income only
  searchQuery.set('');
  filterType.set('income');
  results = filteredHistoryTransactions();
  for (const r of results) {
    assert.strictEqual(r.type, 'income');
  }

  // Reset filters
  filterType.set('all');
});

test('Masrouf Store - category deletion guard prevents deleting categories with transactions', () => {
  const counts = categoryUsageCounts();
  const foodCount = counts['food'] || 0;
  assert.ok(foodCount > 0, 'Food category should have transactions');

  const result = deleteCategory('food');
  assert.strictEqual(result.success, false, 'Cannot delete category in use');
  assert.ok(result.message.length > 0);
  assert.ok(categories().some(c => c.id === 'food'), 'Food category must remain in store');

  // Deleting an unused category should succeed
  const unusedCatId = addCategory({
    nameEn: 'Temporary Test Cat',
    nameAr: 'تصنيف تجريبي',
    icon: '🧪',
    type: 'expense'
  });

  const deleteResult = deleteCategory(unusedCatId);
  assert.strictEqual(deleteResult.success, true);
  assert.ok(!categories().some(c => c.id === unusedCatId));
});

test('Masrouf Store - settings toggles currency, language, and theme', () => {
  setCurrency('USD');
  assert.strictEqual(settings().currency, 'USD');

  setLanguage('ar');
  assert.strictEqual(settings().language, 'ar');
  assert.strictEqual(document.documentElement.getAttribute('dir'), 'rtl');

  setLanguage('en');
  assert.strictEqual(settings().language, 'en');
  assert.strictEqual(document.documentElement.getAttribute('dir'), 'ltr');

  setTheme('dark');
  assert.strictEqual(settings().theme, 'dark');
  assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'dark');
});

test('Masrouf Store - exportData and importData preserve state integrity', () => {
  const exported = exportData();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.strictEqual(parsed.version, 1);
  assert.ok(Array.isArray(parsed.transactions));
  assert.ok(Array.isArray(parsed.categories));

  // Invalid import returns false
  assert.strictEqual(importData('invalid json string {'), false);

  // Valid import restores state
  assert.strictEqual(importData(exported), true);
});
