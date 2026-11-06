--- logic
import Layout from '../components/Layout.liq';
import Card from '../components/Card.liq';
import AmountInput from '../components/AmountInput.liq';
import CategoryPicker from '../components/CategoryPicker.liq';
import ConfirmDialog from '../components/ConfirmDialog.liq';
import {
  transactions,
  categories,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  currentCurrency,
  currentLang,
  t
} from '../store.js';
import { navigate, currentParams } from '../router.js';
import { signal, computed, effect } from 'liquid';

const { params = {} } = defineProps();

// Form fields signals
const txType = signal('expense'); // 'expense' | 'income'
const amount = signal('');
const category = signal('food');
const date = signal(new Date().toISOString().slice(0, 10));
const note = signal('');
const isRecurring = signal(false); // Checkbox exercise

// Track whether we are in edit mode
const editId = signal(params.id || currentParams().id || null);
const isEditMode = computed(() => Boolean(editId()));

// Initialize form from existing transaction if editing
function initForm() {
  const id = editId();
  if (id && id !== 'new') {
    const existing = transactions().find(t => t.id === id);
    if (existing) {
      txType.set(existing.type || 'expense');
      amount.set(String(existing.amount || ''));
      category.set(existing.category || 'other');
      date.set(existing.date || new Date().toISOString().slice(0, 10));
      note.set(existing.note || '');
      isRecurring.set(Boolean(existing.isRecurring));
      return;
    }
  }
  // Default values for new transaction
  txType.set('expense');
  amount.set('');
  category.set('food');
  date.set(new Date().toISOString().slice(0, 10));
  note.set('');
  isRecurring.set(false);
}

initForm();

// Filter categories for the active type
const availableCategories = computed(() => {
  const currentT = txType();
  return categories().filter(c => c.type === currentT || c.type === 'both');
});

// Live validation computeds
const amountError = computed(() => {
  const val = amount().trim();
  if (!val) return '';
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return t('errAmount');
  }
  return '';
});

const categoryError = computed(() => {
  if (!category()) return t('errCategory');
  return '';
});

const dateError = computed(() => {
  if (!date()) return t('errDate');
  return '';
});

const isValid = computed(() => {
  const num = Number(amount());
  return num > 0 && Boolean(category()) && Boolean(date()) && !amountError();
});

// Category selection
function handleSelectCategory(catId) {
  category.set(catId);
}

// Type selection
function setExpenseType() {
  txType.set('expense');
  // If current category is not available for expense, reset to first
  const valid = categories().filter(c => c.type === 'expense' || c.type === 'both');
  if (!valid.some(c => c.id === category())) {
    category.set(valid[0]?.id || 'food');
  }
}

function setIncomeType() {
  txType.set('income');
  const valid = categories().filter(c => c.type === 'income' || c.type === 'both');
  if (!valid.some(c => c.id === category())) {
    category.set(valid[0]?.id || 'salary');
  }
}

// Submit handler
function handleSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isValid()) return;

  const data = {
    type: txType(),
    amount: Number(amount()),
    category: category(),
    date: date(),
    note: note().trim(),
    isRecurring: isRecurring()
  };

  if (isEditMode()) {
    updateTransaction(editId(), data);
  } else {
    addTransaction(data);
  }

  navigate('/history');
}

// Delete handling in edit mode
const showDeleteConfirm = signal(false);

function handleDeleteClick() {
  showDeleteConfirm.set(true);
}

function confirmDelete() {
  if (editId()) {
    deleteTransaction(editId());
  }
  showDeleteConfirm.set(false);
  navigate('/history');
}

function cancelDelete() {
  showDeleteConfirm.set(false);
}

--- style
.form-card {
  padding: 1.5rem 1rem;
}
.type-selector {
  display: flex;
  background: var(--bg-input);
  padding: 0.35rem;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
  gap: 0.35rem;
}
.type-radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 0.5rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  gap: 0.35rem;
}
.type-radio-input {
  display: none;
}
.type-radio-label.is-expense-active {
  background: var(--danger);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}
.type-radio-label.is-income-active {
  background: var(--success);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}
.form-group {
  margin-bottom: 1.25rem;
}
.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.45rem;
}
.input-control {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-input);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}
.textarea-control {
  resize: vertical;
  min-height: 80px;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 1rem 0 1.5rem 0;
  cursor: pointer;
  user-select: none;
}
.checkbox-input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}
.checkbox-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}
.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.btn-submit {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}
.btn-submit:hover:not(:disabled) {
  background: var(--primary-hover);
}
.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-delete {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
  padding: 0.75rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

--- ui
Layout pageTitle={isEditMode() ? t('editTransaction') : t('newTransaction')}
  Card
    form @submit.prevent=handleSubmit
      div.type-selector
        label.type-radio-label class={txType() === 'expense' ? 'is-expense-active' : ''} @click=setExpenseType
          input.type-radio-input type="radio" name="txType" value="expense" checked={txType() === 'expense'}
          span ↘ {t('expense')}
        label.type-radio-label class={txType() === 'income' ? 'is-income-active' : ''} @click=setIncomeType
          input.type-radio-input type="radio" name="txType" value="income" checked={txType() === 'income'}
          span ↗ {t('income')}

      AmountInput amount={amount} currency={currentCurrency()} type={txType()} error={amountError()}

      div.form-group
        label.form-label {t('category')}
        CategoryPicker categories={availableCategories()} selected={category()} type={txType()} onSelect={handleSelectCategory}

      div.form-group
        label.form-label {t('date')}
        input.input-control type="date" $bind=date

      div.form-group
        label.form-label {t('note')}
        textarea.input-control.textarea-control placeholder={t('notePlaceholder')} $bind=note

      label.checkbox-row
        input.checkbox-input type="checkbox" $bind=isRecurring
        span.checkbox-label Repeat monthly (recurring)

      div.form-actions
        button.btn-submit type="submit" disabled={!isValid()}
          span {isEditMode() ? t('save') : t('addTransaction')}
        if isEditMode()
          button.btn-delete type="button" @click=handleDeleteClick
            span 🗑️ {t('delete')}

  if showDeleteConfirm()
    ConfirmDialog title={t('confirmDeleteTitle')} confirmText={t('delete')} cancelText={t('cancel')} danger=true onConfirm={confirmDelete} onCancel={cancelDelete}
      p {t('confirmDeleteMsg')}
