--- logic
import Layout from '../components/Layout.liq';
import Card from '../components/Card.liq';
import BarChart from '../components/BarChart.liq';
import TransactionItem from '../components/TransactionItem.liq';
import EmptyState from '../components/EmptyState.liq';
import ConfirmDialog from '../components/ConfirmDialog.liq';
import {
  selectedMonth,
  prevMonth,
  nextMonth,
  monthlyIncome,
  monthlyExpense,
  monthlyBalance,
  categoryExpenses,
  recentTransactions,
  currentCurrency,
  currentLang,
  deleteTransaction,
  t
} from '../store.js';
import { formatCurrency, formatMonth } from '../i18n.js';
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

--- style
.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
}
.month-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.month-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}
.month-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.balance-card {
  text-align: center;
  padding: 1.5rem 1rem;
}
.balance-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.35rem;
}
.balance-val {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 1.25rem;
}
.balance-val.positive {
  color: var(--success);
}
.balance-val.negative {
  color: var(--danger);
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: start;
}
.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.stat-icon.income-bg {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}
.stat-icon.expense-bg {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}
.stat-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
}
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.view-all-btn {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
.view-all-btn:hover {
  background: var(--primary-light);
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
  transition: all 0.15s ease;
  width: 100%;
}
.btn-primary:hover {
  background: var(--primary-hover);
}

--- ui
Layout pageTitle={t('dashboard')}
  div.month-bar
    button.month-btn type="button" @click=prevMonth title="Previous Month"
      span ◀
    span.month-label {formatMonth(selectedMonth(), currentLang())}
    button.month-btn type="button" @click=nextMonth title="Next Month"
      span ▶

  Card
    div.balance-card
      div.balance-label {t('balance')}
      div.balance-val class={monthlyBalance() >= 0 ? 'positive' : 'negative'}
        span {formatCurrency(monthlyBalance(), currentCurrency(), currentLang())}
      div.stats-grid
        div.stat-item
          div.stat-icon.income-bg ↗
          div.stat-info
            span.stat-label {t('totalIncome')}
            span.stat-val {formatCurrency(monthlyIncome(), currentCurrency(), currentLang())}
        div.stat-item
          div.stat-icon.expense-bg ↘
          div.stat-info
            span.stat-label {t('totalExpenses')}
            span.stat-val {formatCurrency(monthlyExpense(), currentCurrency(), currentLang())}

  Card title={t('breakdownByCategory')}
    BarChart items={categoryExpenses()}

  div.recent-section
    div.section-header
      h2.section-title {t('recentTransactions')}
      button.view-all-btn type="button" @click=navigate('/history') {t('viewAll')}

    if recentTransactions().length === 0
      EmptyState icon="💸" title={t('noTransactionsMonth')} description={t('addFirstTransaction')}
        button.btn-primary type="button" @click=navigate('/transaction/new') {t('addTransaction')}
    else
      each (recentTransactions() as tx (tx.id))
        TransactionItem transaction={tx} onDelete={requestDelete}

  if deleteTxId()
    ConfirmDialog title={t('confirmDeleteTitle')} confirmText={t('delete')} cancelText={t('cancel')} danger=true onConfirm={confirmDelete} onCancel={cancelDelete}
      p {t('confirmDeleteMsg')}
