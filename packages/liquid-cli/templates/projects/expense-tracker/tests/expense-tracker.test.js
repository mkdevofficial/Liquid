import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expenseStore } from '../src/store.js';

test('Expense Tracker Template - adds expenses, computes budget and category breakdown', () => {
  const initialSpent = expenseStore.getTotalSpent();
  assert.ok(initialSpent > 0);
  assert.equal(expenseStore.monthlyBudget, 800);
  assert.equal(expenseStore.getRemainingBudget(), 800 - initialSpent);

  // Category breakdown calculation
  const breakdown = expenseStore.getCategoryBreakdown();
  assert.equal(breakdown.length, 5);
  const totalPercentage = breakdown.reduce((sum, b) => sum + b.percentage, 0);
  assert.ok(totalPercentage >= 95 && totalPercentage <= 105);

  // Add expense
  const ok = expenseStore.addExpense('Coffee with Team', 15, 'Food');
  assert.ok(ok);
  assert.equal(expenseStore.getTotalSpent(), initialSpent + 15);
  const created = expenseStore.expenses[0];
  assert.equal(created.title, 'Coffee with Team');
  assert.equal(created.amount, 15);
  assert.equal(created.category, 'Food');

  // Filter
  expenseStore.setCategoryFilter('Food');
  assert.ok(expenseStore.getFilteredExpenses().every(e => e.category === 'Food'));
  expenseStore.setCategoryFilter('All');

  // Remove
  expenseStore.removeExpense(created.id);
  assert.equal(expenseStore.getTotalSpent(), initialSpent);
});
