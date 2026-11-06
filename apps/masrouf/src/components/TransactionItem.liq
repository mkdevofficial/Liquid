--- logic
import { getCategory, getCategoryName, currentLang, currentCurrency } from '../store.js';
import { formatCurrency, formatDate } from '../i18n.js';
import { navigate } from '../router.js';

const { transaction, onDelete = () => {} } = defineProps();

const cat = getCategory(transaction?.category);
const isIncome = transaction?.type === 'income';

function handleClick() {
  if (transaction?.id) {
    navigate(`/transaction/${transaction.id}`);
  }
}

function handleDelete(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof onDelete === 'function' && transaction?.id) {
    onDelete(transaction.id);
  }
}

--- style
.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  margin-bottom: 0.65rem;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.tx-item:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
}
.tx-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
}
.tx-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 1.3rem;
  flex-shrink: 0;
}
.tx-icon-income {
  background: rgba(16, 185, 129, 0.15);
}
.tx-icon-expense {
  background: rgba(239, 68, 68, 0.15);
}
.tx-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tx-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.tx-note {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.tx-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}
.tx-amount {
  font-size: 1rem;
  font-weight: 700;
  text-align: end;
}
.tx-amount.is-income {
  color: var(--success);
}
.tx-amount.is-expense {
  color: var(--danger);
}
.tx-del-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  padding: 0.35rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}
.tx-del-btn:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.12);
}

--- ui
div.tx-item @click=handleClick
  div.tx-left
    div.tx-icon-badge class={isIncome ? 'tx-icon-income' : 'tx-icon-expense'}
      span {cat.icon}
    div.tx-details
      span.tx-title {getCategoryName(cat)}
      div.tx-meta
        span.tx-date {formatDate(transaction.date, currentLang())}
        if transaction.note
          span.tx-bullet •
          span.tx-note {transaction.note}
  div.tx-right
    span.tx-amount class={isIncome ? 'is-income' : 'is-expense'}
      span {isIncome ? '+' : '-'}
      span {formatCurrency(transaction.amount, currentCurrency(), currentLang())}
    button.tx-del-btn type="button" @click.stop=handleDelete(e) title="Delete"
      span 🗑️
