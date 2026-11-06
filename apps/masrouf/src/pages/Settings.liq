--- logic
import Layout from '../components/Layout.liq';
import Card from '../components/Card.liq';
import ConfirmDialog from '../components/ConfirmDialog.liq';
import {
  settings,
  categories,
  categoryUsageCounts,
  setCurrency,
  setLanguage,
  setTheme,
  addCategory,
  deleteCategory,
  exportData,
  importData,
  currentCurrency,
  currentLang,
  currentTheme,
  getCategoryName,
  t
} from '../store.js';
import { CURRENCIES } from '../i18n.js';
import { signal } from 'liquid';

// New category form signals
const newCatNameEn = signal('');
const newCatNameAr = signal('');
const newCatIcon = signal('🏷️');
const newCatType = signal('expense'); // 'expense' | 'income' | 'both'
const catFormError = signal('');

function handleAddCategory(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameEn = newCatNameEn().trim();
  const nameAr = newCatNameAr().trim();
  const icon = newCatIcon().trim() || '🏷️';
  const type = newCatType();

  if (!nameEn && !nameAr) {
    catFormError.set('Please provide a category name.');
    return;
  }

  addCategory({
    nameEn: nameEn || nameAr,
    nameAr: nameAr || nameEn,
    icon,
    type
  });

  newCatNameEn.set('');
  newCatNameAr.set('');
  newCatIcon.set('🏷️');
  catFormError.set('');
}

// Category deletion
const deleteCatId = signal(null);
const deleteCatError = signal('');

function requestDeleteCategory(id) {
  const counts = categoryUsageCounts();
  const count = counts[id] || 0;
  if (count > 0) {
    deleteCatError.set(t('errCategoryInUse', { count }));
    return;
  }
  deleteCatError.set('');
  deleteCatId.set(id);
}

function confirmDeleteCategory() {
  const id = deleteCatId();
  if (id) {
    deleteCategory(id);
  }
  deleteCatId.set(null);
}

function cancelDeleteCategory() {
  deleteCatId.set(null);
}

// Currency selection
function handleCurrencyChange(e) {
  setCurrency(e.target.value);
}

// Export / Import
const exportText = signal('');
const importText = signal('');
const importStatus = signal(''); // 'success' | 'error' | ''

function handleExport() {
  const json = exportData();
  exportText.set(json);
}

function handleImport() {
  const raw = importText().trim();
  if (!raw) return;

  const success = importData(raw);
  if (success) {
    importStatus.set('success');
    importText.set('');
  } else {
    importStatus.set('error');
  }
}

--- style
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-color);
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-label-group {
  display: flex;
  flex-direction: column;
}
.setting-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}
.setting-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.setting-control {
  min-width: 140px;
}
.select-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}
.toggle-group {
  display: flex;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.2rem;
  gap: 0.2rem;
}
.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toggle-btn.is-active {
  background: var(--primary);
  color: white;
}
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  background: var(--bg-input);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}
.cat-item-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.cat-icon {
  font-size: 1.25rem;
}
.cat-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}
.cat-item-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.usage-badge {
  font-size: 0.72rem;
  background: var(--bg-card);
  color: var(--text-muted);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  font-weight: 600;
}
.cat-del-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--text-muted);
  border-radius: 6px;
  font-size: 0.95rem;
}
.cat-del-btn:hover:not(:disabled) {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}
.cat-del-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.add-cat-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}
.form-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr;
  gap: 0.5rem;
}
.input-text {
  padding: 0.5rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}
.input-text:focus {
  border-color: var(--primary);
}
.btn-add-cat {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-add-cat:hover {
  background: var(--primary-hover);
}
.alert-error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-top: 0.5rem;
}
.alert-success {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-top: 0.5rem;
}
.json-area {
  width: 100%;
  height: 90px;
  padding: 0.65rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-primary);
  box-sizing: border-box;
  margin-top: 0.5rem;
  resize: vertical;
}
.btn-action {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}
.btn-action:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

--- ui
Layout pageTitle={t('settings')}
  div.settings-section
    Card title={t('preferences')}
      div.setting-row
        div.setting-label-group
          span.setting-title {t('currency')}
        div.setting-control
          select.select-input @change=handleCurrencyChange
            option value="SAR" selected={currentCurrency() === 'SAR'} SAR (ر.س)
            option value="USD" selected={currentCurrency() === 'USD'} USD ($)
            option value="EUR" selected={currentCurrency() === 'EUR'} EUR (€)
            option value="EGP" selected={currentCurrency() === 'EGP'} EGP (ج.م)
            option value="AED" selected={currentCurrency() === 'AED'} AED (د.إ)
            option value="MAD" selected={currentCurrency() === 'MAD'} MAD (د.م)

      div.setting-row
        div.setting-label-group
          span.setting-title {t('language')}
        div.toggle-group
          button.toggle-btn type="button" class={currentLang() === 'ar' ? 'is-active' : ''} @click=setLanguage('ar') العربية
          button.toggle-btn type="button" class={currentLang() === 'en' ? 'is-active' : ''} @click=setLanguage('en') English

      div.setting-row
        div.setting-label-group
          span.setting-title {t('theme')}
        div.toggle-group
          button.toggle-btn type="button" class={currentTheme() === 'light' ? 'is-active' : ''} @click=setTheme('light') ☀️ {t('lightTheme')}
          button.toggle-btn type="button" class={currentTheme() === 'dark' ? 'is-active' : ''} @click=setTheme('dark') 🌙 {t('darkTheme')}

    Card title={t('manageCategories')}
      if deleteCatError()
        div.alert-error {deleteCatError()}

      form.add-cat-form @submit.prevent=handleAddCategory
        div.form-row
          input.input-text type="text" placeholder="Emoji" $bind=newCatIcon
          input.input-text type="text" placeholder={t('categoryNameEn')} $bind=newCatNameEn
          input.input-text type="text" placeholder={t('categoryNameAr')} $bind=newCatNameAr
        div.form-row
          select.input-text $bind=newCatType
            option value="expense" {t('expense')}
            option value="income" {t('income')}
            option value="both" {t('allTypes')}
          button.btn-add-cat type="submit" {t('addCategory')}

      div.cat-list
        each (categories() as cat (cat.id))
          div.cat-item
            div.cat-item-left
              span.cat-icon {cat.icon}
              span.cat-name {getCategoryName(cat)}
            div.cat-item-right
              span.usage-badge {categoryUsageCounts()[cat.id] || 0} used
              button.cat-del-btn type="button" @click=requestDeleteCategory(cat.id) title="Delete category"
                span 🗑️

    Card title={t('dataManagement')}
      div.setting-row
        div.setting-label-group
          span.setting-title {t('exportData')}
        button.btn-action type="button" @click=handleExport Export JSON
      if exportText()
        textarea.json-area readonly {exportText()}

      div.setting-row style="margin-top: 1rem;"
        div.setting-label-group
          span.setting-title {t('importData')}
      textarea.json-area placeholder={t('importPlaceholder')} $bind=importText
      button.btn-action type="button" style="margin-top: 0.5rem;" @click=handleImport {t('importData')}

      if importStatus() === 'success'
        div.alert-success {t('importSuccess')}
      if importStatus() === 'error'
        div.alert-error {t('importError')}

  if deleteCatId()
    ConfirmDialog title={t('confirmDeleteCategoryTitle')} confirmText={t('delete')} cancelText={t('cancel')} danger=true onConfirm={confirmDeleteCategory} onCancel={cancelDeleteCategory}
      p {t('confirmDeleteCategoryMsg')}
