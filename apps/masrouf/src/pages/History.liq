--- logic
import Layout from '../components/Layout.liq';
import Card from '../components/Card.liq';
import TransactionItem from '../components/TransactionItem.liq';
import EmptyState from '../components/EmptyState.liq';
import ConfirmDialog from '../components/ConfirmDialog.liq';
import {
  transactions,
  categories,
  searchQuery,
  filterType,
  filterCategory,
  filterMonth,
  sortOrder,
  availableMonths,
  paginatedHistoryTransactions,
  hasMoreHistory,
  loadMore,
  deleteTransaction,
  currentLang,
  getCategoryName,
  t
} from '../store.js';
import { formatMonth } from '../i18n.js';
import { navigate } from '../router.js';
import { signal } from 'liquid';

const deleteTxId = signal(null);

function requestDelete(id) {
  deleteTxId.set(id);
}

function confirmDelete() {
  const id = deleteTxId();
  if (id) {
    deleteTransaction(id);
  }
  deleteTxId.set(null);
}

function cancelDelete() {
  deleteTxId.set(null);
}

function setType(type) {
  filterType.set(type);
}

--- style
.filters-card {
  padding: 1rem;
  margin-bottom: 1.25rem;
}
.search-row {
  margin-bottom: 0.85rem;
}
.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-input);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}
.type-filter-chips {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}
.type-chip {
  flex: 1;
  padding: 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}
.type-chip:hover {
  border-color: var(--primary);
  color: var(--text-primary);
}
.type-chip.is-active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.select-control {
  width: 100%;
  padding: 0.65rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
}
.select-control:focus {
  border-color: var(--primary);
}
.sort-row {
  margin-top: 0.65rem;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0 0.75rem 0;
  padding: 0 0.25rem;
}
.list-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}
.load-more-btn {
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  margin: 1.25rem auto 0 auto;
  display: block;
  width: 100%;
  transition: all 0.15s ease;
}
.load-more-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

--- ui
Layout pageTitle={t('history')}
  Card
    div.filters-card
      div.search-row
        input.search-input type="text" placeholder={t('searchPlaceholder')} $bind=searchQuery

      div.type-filter-chips
        button.type-chip type="button" class={filterType() === 'all' ? 'is-active' : ''} @click=setType('all') {t('allTypes')}
        button.type-chip type="button" class={filterType() === 'income' ? 'is-active' : ''} @click=setType('income') {t('income')}
        button.type-chip type="button" class={filterType() === 'expense' ? 'is-active' : ''} @click=setType('expense') {t('expense')}

      div.select-grid
        select.select-control $bind=filterCategory
          option value="all" {t('allCategories')}
          each (categories() as cat (cat.id))
            option value={cat.id} {getCategoryName(cat)}

        select.select-control $bind=filterMonth
          option value="all" {t('allMonths')}
          each (availableMonths() as m (m))
            option value={m} {formatMonth(m, currentLang())}

      div.sort-row
        select.select-control $bind=sortOrder
          option value="newest" {t('sortNewest')}
          option value="oldest" {t('sortOldest')}
          option value="highest" {t('sortHighest')}
          option value="lowest" {t('sortLowest')}

  div.list-header
    span.list-count Showing {paginatedHistoryTransactions().length} transactions

  if paginatedHistoryTransactions().length === 0
    EmptyState icon="🔍" title={t('noTransactionsFound')} description={t('searchPlaceholder')}
      button.btn-primary type="button" @click=navigate('/transaction/new') {t('addTransaction')}
  else
    each (paginatedHistoryTransactions() as tx (tx.id))
      TransactionItem transaction={tx} onDelete={requestDelete}

    if hasMoreHistory()
      button.load-more-btn type="button" @click=loadMore {t('loadMore')}

  if deleteTxId()
    ConfirmDialog title={t('confirmDeleteTitle')} confirmText={t('delete')} cancelText={t('cancel')} danger=true onConfirm={confirmDelete} onCancel={cancelDelete}
      p {t('confirmDeleteMsg')}
