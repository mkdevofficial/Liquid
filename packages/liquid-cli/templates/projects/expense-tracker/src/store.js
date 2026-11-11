import { createStore } from 'liquid';
import { loadData, saveData } from './utils/storage.js';

const STORAGE_KEY = 'liquid_expenses_data';

export const CATEGORIES = [
  { id: 'Food', color: '#f97316', icon: '🍔' },
  { id: 'Transport', color: '#0284c7', icon: '🚇' },
  { id: 'Bills', color: '#8b5cf6', icon: '⚡' },
  { id: 'Entertainment', color: '#ec4899', icon: '🎬' },
  { id: 'Health', color: '#10b981', icon: '💊' }
];

const initialExpenses = loadData(STORAGE_KEY, [
  { id: 1, title: 'Weekly Groceries', amount: 84, category: 'Food', date: '2026-11-10' },
  { id: 2, title: 'Monthly Subway Pass', amount: 90, category: 'Transport', date: '2026-11-09' },
  { id: 3, title: 'High-Speed Fiber Internet', amount: 65, category: 'Bills', date: '2026-11-08' },
  { id: 4, title: 'Cinema Tickets', amount: 32, category: 'Entertainment', date: '2026-11-07' },
  { id: 5, title: 'Pharmacy Vitamins', amount: 28, category: 'Health', date: '2026-11-06' }
]);

export const expenseStore = createStore({
  expenses: initialExpenses,
  monthlyBudget: 800,
  selectedCategory: 'All',

  getTotalSpent() {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  },

  getRemainingBudget() {
    return this.monthlyBudget - this.getTotalSpent();
  },

  getBudgetPercentage() {
    const total = this.getTotalSpent();
    return Math.min(100, Math.round((total / this.monthlyBudget) * 100));
  },

  getCategoryBreakdown() {
    const total = this.getTotalSpent() || 1;
    return CATEGORIES.map(cat => {
      const catExpenses = this.expenses.filter(e => e.category === cat.id);
      const amount = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      const pct = Math.round((amount / total) * 100);
      return {
        ...cat,
        amount,
        percentage: pct
      };
    });
  },

  getFilteredExpenses() {
    if (this.selectedCategory === 'All') return this.expenses;
    return this.expenses.filter(e => e.category === this.selectedCategory);
  },

  addExpense(title, amount, category) {
    const t = (title || '').trim();
    const a = parseFloat(amount);
    if (!t || isNaN(a) || a <= 0) return false;

    const item = {
      id: Date.now(),
      title: t,
      amount: Math.round(a),
      category: category || 'Food',
      date: new Date().toISOString().slice(0, 10)
    };
    this.expenses = [item, ...this.expenses];
    saveData(STORAGE_KEY, this.expenses);
    return true;
  },

  removeExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    saveData(STORAGE_KEY, this.expenses);
  },

  setCategoryFilter(cat) {
    this.selectedCategory = cat;
  }
});
