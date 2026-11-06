import { signal, computed, effect } from 'liquid';
import { translations } from './i18n.js';

const STORAGE_KEY = 'masrouf_data_v1';

export const DEFAULT_CATEGORIES = [
  { id: 'food', nameEn: 'Food & Dining', nameAr: 'طعام ومطاعم', icon: '🍔', type: 'expense', color: '#f97316' },
  { id: 'housing', nameEn: 'Housing & Rent', nameAr: 'سكن وإيجار', icon: '🏠', type: 'expense', color: '#3b82f6' },
  { id: 'transport', nameEn: 'Transportation', nameAr: 'مواصلات', icon: '🚗', type: 'expense', color: '#8b5cf6' },
  { id: 'utilities', nameEn: 'Utilities & Bills', nameAr: 'فواتير وخدمات', icon: '⚡', type: 'expense', color: '#eab308' },
  { id: 'entertainment', nameEn: 'Entertainment', nameAr: 'ترفيه', icon: '🎬', type: 'expense', color: '#ec4899' },
  { id: 'shopping', nameEn: 'Shopping', nameAr: 'تسوق', icon: '🛍️', type: 'expense', color: '#06b6d4' },
  { id: 'health', nameEn: 'Health & Care', nameAr: 'صحة وعناية', icon: '💊', type: 'expense', color: '#10b981' },
  { id: 'salary', nameEn: 'Salary', nameAr: 'راتب شهري', icon: '💼', type: 'income', color: '#22c55e' },
  { id: 'freelance', nameEn: 'Freelance & Projects', nameAr: 'عمل حر ومشاريع', icon: '💻', type: 'income', color: '#14b8a6' },
  { id: 'investment', nameEn: 'Investment', nameAr: 'استثمار', icon: '📈', type: 'income', color: '#6366f1' },
  { id: 'other', nameEn: 'Other', nameAr: 'أخرى', icon: '📦', type: 'both', color: '#64748b' }
];

export const DEFAULT_TRANSACTIONS = [
  { id: 'tx_1', type: 'income', amount: 8500, category: 'salary', date: '2026-10-01', note: 'Monthly Salary' },
  { id: 'tx_2', type: 'expense', amount: 2400, category: 'housing', date: '2026-10-02', note: 'Apartment Rent' },
  { id: 'tx_3', type: 'expense', amount: 650, category: 'food', date: '2026-10-05', note: 'Pantry & Supermarket' },
  { id: 'tx_4', type: 'expense', amount: 180, category: 'utilities', date: '2026-10-10', note: 'Electricity Bill' },
  { id: 'tx_5', type: 'income', amount: 1200, category: 'freelance', date: '2026-10-15', note: 'Liquid Web App Client' },
  { id: 'tx_6', type: 'expense', amount: 220, category: 'transport', date: '2026-10-18', note: 'Fuel & Highway Toll' },
  { id: 'tx_7', type: 'expense', amount: 145, category: 'food', date: '2026-10-22', note: 'Dinner with colleagues' },
  { id: 'tx_8', type: 'expense', amount: 90, category: 'entertainment', date: '2026-10-25', note: 'Weekend Movie Night' }
];

export const DEFAULT_SETTINGS = {
  currency: 'SAR',
  language: 'ar',
  theme: 'light'
};

// Safe storage reader with validation and default fallback
function loadInitialState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      transactions: DEFAULT_TRANSACTIONS,
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        transactions: DEFAULT_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES,
        settings: DEFAULT_SETTINGS
      };
    }

    const parsed = JSON.parse(raw);
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : DEFAULT_TRANSACTIONS;
    const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES;
    const settings = parsed.settings && typeof parsed.settings === 'object' ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS;

    return { transactions, categories, settings };
  } catch (err) {
    console.warn('[Masrouf] Storage corrupted or empty, using defaults:', err);
    return {
      transactions: DEFAULT_TRANSACTIONS,
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS
    };
  }
}

const initial = loadInitialState();

// Core reactive signals
export const transactions = signal(initial.transactions);
export const categories = signal(initial.categories);
export const settings = signal(initial.settings);

// Navigation & Filter signals
const now = new Date();
const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
export const selectedMonth = signal('2026-10'); // Default to target test month
export const searchQuery = signal('');
export const filterType = signal('all'); // 'all' | 'income' | 'expense'
export const filterCategory = signal('all');
export const filterMonth = signal('all'); // 'all' | 'YYYY-MM'
export const sortOrder = signal('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'
export const pageLimit = signal(10);

// Auto-save effect
if (typeof window !== 'undefined' && window.localStorage) {
  effect(() => {
    const data = {
      transactions: transactions(),
      categories: categories(),
      settings: settings()
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Masrouf] Failed to write localStorage:', e);
    }
  });

  // Apply theme and direction to document root
  effect(() => {
    const s = settings();
    const doc = document.documentElement;
    if (doc) {
      doc.setAttribute('data-theme', s.theme || 'light');
      doc.setAttribute('dir', s.language === 'ar' ? 'rtl' : 'ltr');
      doc.setAttribute('lang', s.language || 'en');
    }
  });
}

// Translations lookup computed
export const currentLang = computed(() => settings().language || 'en');
export const currentTheme = computed(() => settings().theme || 'light');
export const currentCurrency = computed(() => settings().currency || 'SAR');

export function t(key, params = {}) {
  const lang = currentLang();
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;

  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

// Category helper lookup
export const categoryMap = computed(() => {
  const map = new Map();
  for (const c of categories()) {
    map.set(c.id, c);
  }
  return map;
});

export function getCategory(id) {
  return categoryMap().get(id) || {
    id: 'unknown',
    nameEn: id,
    nameAr: id,
    icon: '❓',
    type: 'both',
    color: '#94a3b8'
  };
}

export function getCategoryName(cat) {
  if (!cat) return '';
  const lang = currentLang();
  return lang === 'ar' ? (cat.nameAr || cat.nameEn) : (cat.nameEn || cat.nameAr);
}

// Monthly calculations for Dashboard
export const monthlyTransactions = computed(() => {
  const month = selectedMonth();
  return transactions().filter(t => t.date && t.date.startsWith(month));
});

export const monthlyIncome = computed(() => {
  return monthlyTransactions()
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
});

export const monthlyExpense = computed(() => {
  return monthlyTransactions()
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
});

export const monthlyBalance = computed(() => {
  return monthlyIncome() - monthlyExpense();
});

// Category expense breakdown for Bar Chart
export const categoryExpenses = computed(() => {
  const expenses = monthlyTransactions().filter(t => t.type === 'expense');
  const total = monthlyExpense();
  if (total === 0 || expenses.length === 0) return [];

  const grouped = new Map();
  for (const t of expenses) {
    const current = grouped.get(t.category) || 0;
    grouped.set(t.category, current + Number(t.amount));
  }

  const items = [];
  for (const [catId, amount] of grouped.entries()) {
    const cat = getCategory(catId);
    const percentage = Math.round((amount / total) * 100);
    items.push({
      id: catId,
      name: getCategoryName(cat),
      icon: cat.icon || '📦',
      color: cat.color || '#0284c7',
      amount,
      percentage
    });
  }

  // Sort descending by amount
  return items.sort((a, b) => b.amount - a.amount);
});

// Recent 5 transactions for Dashboard
export const recentTransactions = computed(() => {
  return [...transactions()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
});

// Category usage count map
export const categoryUsageCounts = computed(() => {
  const counts = {};
  for (const t of transactions()) {
    counts[t.category] = (counts[t.category] || 0) + 1;
  }
  return counts;
});

// Filtered & Sorted History Transactions
export const filteredHistoryTransactions = computed(() => {
  const query = searchQuery().toLowerCase().trim();
  const type = filterType();
  const cat = filterCategory();
  const month = filterMonth();
  const sort = sortOrder();

  let list = transactions().filter(t => {
    // Type filter
    if (type !== 'all' && t.type !== type) return false;
    // Category filter
    if (cat !== 'all' && t.category !== cat) return false;
    // Month filter
    if (month !== 'all' && (!t.date || !t.date.startsWith(month))) return false;
    // Search query
    if (query) {
      const catObj = getCategory(t.category);
      const catEn = (catObj.nameEn || '').toLowerCase();
      const catAr = (catObj.nameAr || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      const match = note.includes(query) || catEn.includes(query) || catAr.includes(query);
      if (!match) return false;
    }
    return true;
  });

  // Sorting
  list = [...list].sort((a, b) => {
    if (sort === 'newest') return new Date(b.date) - new Date(a.date);
    if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
    if (sort === 'highest') return Number(b.amount) - Number(a.amount);
    if (sort === 'lowest') return Number(a.amount) - Number(b.amount);
    return 0;
  });

  return list;
});

export const paginatedHistoryTransactions = computed(() => {
  const limit = pageLimit();
  return filteredHistoryTransactions().slice(0, limit);
});

export const hasMoreHistory = computed(() => {
  return pageLimit() < filteredHistoryTransactions().length;
});

// Available months from existing transactions
export const availableMonths = computed(() => {
  const set = new Set();
  set.add(selectedMonth());
  for (const t of transactions()) {
    if (t.date && t.date.length >= 7) {
      set.add(t.date.slice(0, 7));
    }
  }
  return Array.from(set).sort().reverse();
});

// Actions
let nextIdCounter = 100;

export function addTransaction(data) {
  const id = `tx_${Date.now()}_${nextIdCounter++}`;
  const newTx = {
    id,
    type: data.type || 'expense',
    amount: Math.abs(Number(data.amount) || 0),
    category: data.category || 'other',
    date: data.date || new Date().toISOString().slice(0, 10),
    note: (data.note || '').trim()
  };

  transactions.set([newTx, ...transactions()]);
  return id;
}

export function updateTransaction(id, updates) {
  transactions.set(
    transactions().map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          amount: Math.abs(Number(updates.amount !== undefined ? updates.amount : t.amount) || 0)
        };
      }
      return t;
    })
  );
}

export function deleteTransaction(id) {
  transactions.set(transactions().filter(t => t.id !== id));
}

export function addCategory(category) {
  const id = category.id || `cat_${Date.now()}_${nextIdCounter++}`;
  const newCat = {
    id,
    nameEn: category.nameEn || 'New Category',
    nameAr: category.nameAr || category.nameEn || 'تصنيف جديد',
    icon: category.icon || '📦',
    type: category.type || 'expense',
    color: category.color || '#0284c7'
  };

  categories.set([...categories(), newCat]);
  return id;
}

export function updateCategory(id, updates) {
  categories.set(
    categories().map(c => (c.id === id ? { ...c, ...updates } : c))
  );
}

export function deleteCategory(id) {
  const count = categoryUsageCounts()[id] || 0;
  if (count > 0) {
    return { success: false, message: t('errCategoryInUse', { count }) };
  }
  categories.set(categories().filter(c => c.id !== id));
  return { success: true };
}

export function setCurrency(currency) {
  settings.set({ ...settings(), currency });
}

export function setLanguage(language) {
  settings.set({ ...settings(), language });
}

export function setTheme(theme) {
  settings.set({ ...settings(), theme });
}

export function toggleTheme() {
  const current = settings().theme;
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export function toggleLanguage() {
  const current = settings().language;
  setLanguage(current === 'ar' ? 'en' : 'ar');
}

export function setSelectedMonth(monthStr) {
  selectedMonth.set(monthStr);
}

export function nextMonth() {
  const [year, month] = selectedMonth().split('-').map(Number);
  const nextDate = new Date(year, month, 1);
  const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  selectedMonth.set(nextStr);
}

export function prevMonth() {
  const [year, month] = selectedMonth().split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  selectedMonth.set(prevStr);
}

export function loadMore() {
  pageLimit.set(pageLimit() + 10);
}

export function exportData() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: transactions(),
      categories: categories(),
      settings: settings()
    },
    null,
    2
  );
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data.transactions)) {
      transactions.set(data.transactions);
    }
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      categories.set(data.categories);
    }
    if (data.settings && typeof data.settings === 'object') {
      settings.set({ ...settings(), ...data.settings });
    }
    return true;
  } catch (e) {
    console.error('[Masrouf] Import error:', e);
    return false;
  }
}
