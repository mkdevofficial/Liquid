--- logic
import { signal, computed, effect } from 'liquid';
import { ERROR_LIST, getErrorById } from '../error-data.js';
import { copyToClipboard } from '../store.js';
import { t } from '../i18n.js';

const searchInput = signal('');
const selectedCategory = signal('all'); // 'all' | 'compiler' | 'runtime' | 'router' | 'cli'
const expandedErrorId = signal(null);

// On mount, read initial ?id= from URL hash
if (typeof window !== 'undefined') {
  function readHashParam() {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const params = new URLSearchParams(hash.slice(qIndex));
      const id = params.get('id');
      if (id) {
        searchInput.value = id.trim().toUpperCase();
        expandedErrorId.value = id.trim().toUpperCase();
      }
    }
  }
  readHashParam();
  window.addEventListener('hashchange', readHashParam);
}

const filteredErrors = computed(() => {
  const query = searchInput.value.trim().toLowerCase();
  const cat = selectedCategory.value;

  return ERROR_LIST.filter(err => {
    // Category filter
    if (cat !== 'all' && err.category !== cat) {
      return false;
    }
    // Search query filter
    if (!query) return true;
    return (
      err.id.toLowerCase().includes(query) ||
      err.titleAr.toLowerCase().includes(query) ||
      err.titleEn.toLowerCase().includes(query) ||
      err.summaryAr.toLowerCase().includes(query) ||
      err.causeAr.toLowerCase().includes(query)
    );
  });
});

function setCategory(cat) {
  selectedCategory.value = cat;
}

function selectId(id) {
  searchInput.value = id;
  expandedErrorId.value = id;
}

function clearSearch() {
  searchInput.value = '';
  selectedCategory.value = 'all';
}

function getErrorUrl(id) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/#/errors?id=${id}`;
  }
  return `http://localhost:4000/#/errors?id=${id}`;
}

--- style
.errors-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

.page-head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.page-tag {
  display: inline-block;
  background: var(--primary-glow);
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 800;
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}

.page-title {
  font-size: 2.4rem;
  font-weight: 900;
  margin: 0 0 0.75rem;
  color: var(--text-primary);
}

.page-desc {
  font-size: 1.05rem;
  color: var(--text-muted);
  max-width: 680px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Search Box */
.search-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.search-input-wrap {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-icon {
  font-size: 1.25rem;
  margin-left: 0.5rem;
}

:global([dir="ltr"]) .search-icon {
  margin-left: 0;
  margin-right: 0.5rem;
}

.search-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--primary);
}

.clear-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.clear-btn:hover {
  color: var(--text-primary);
}

/* Category Filter Pills */
.filter-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pill-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0.4rem 0.95rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--text-primary);
  border-color: var(--primary);
}

.pill-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Quick Jump Codes */
.quick-codes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  font-size: 0.85rem;
}

.quick-label {
  color: var(--text-muted);
  font-weight: 700;
}

.code-chip {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--primary);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.code-chip:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Error Cards List */
.error-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.error-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.error-card:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.12);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.meta-badges {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.id-badge {
  background: #ef4444;
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 900;
  font-size: 0.88rem;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
}

.cat-badge {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.copy-link-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.copy-link-btn:hover {
  background: var(--primary);
  color: white;
}

.err-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: var(--text-primary);
}

.err-title-en {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  margin: 0 0 1rem;
}

.err-summary {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0 0 1.25rem;
}

.explain-box {
  background: var(--bg-input);
  border-right: 4px solid #ef4444;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

:global([dir="ltr"]) .explain-box {
  border-right: none;
  border-left: 4px solid #ef4444;
}

.explain-label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #ef4444;
  margin-bottom: 0.35rem;
}

.explain-text {
  font-size: 0.92rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

/* Codes Grid */
.codes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 768px) {
  .codes-grid {
    grid-template-columns: 1fr;
  }
}

.code-col {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #0f172a;
}

.code-col-head {
  padding: 0.5rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-col.bad .code-col-head {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
}

.code-col.good .code-col-head {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border-bottom: 1px solid rgba(16, 185, 129, 0.3);
}

.code-pre {
  margin: 0;
  padding: 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #f8fafc;
  direction: ltr;
  text-align: left;
  overflow-x: auto;
}

/* Fix Box */
.fix-box {
  background: var(--primary-glow);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.fix-head {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 0.35rem;
}

.fix-desc {
  font-size: 0.92rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

/* Empty State */
.empty-box {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 16px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.empty-desc {
  color: var(--text-muted);
  margin: 0 0 1.25rem;
}

--- ui
div.errors-page
  header.page-head
    span.page-tag تشخيص الأخطاء والحلول
    h1.page-title دليل معرفات الأخطاء (Error Catalog)
    p.page-desc يحمل كل خطأ في Liquid معرّفاً فريداً (مثل LQ-101). اكتب المعرّف هنا لتعرف سبب الخطأ وكود الحل الفوري.

  div.search-card
    div.search-input-wrap
      span.search-icon 🔍
      input.search-input type="text" placeholder="اكتب رمز الخطأ (مثال: LQ-101) أو ابحث بالعنوان..." $bind=searchInput
      if searchInput.value
        button.clear-btn type="button" @click=clearSearch مسح

    div.filter-pills
      button.pill-btn class={selectedCategory.value === 'all' ? 'active' : ''} type="button" @click=setCategory('all') الكل
      button.pill-btn class={selectedCategory.value === 'compiler' ? 'active' : ''} type="button" @click=setCategory('compiler') المصرف والبناء (LQ-100s)
      button.pill-btn class={selectedCategory.value === 'runtime' ? 'active' : ''} type="button" @click=setCategory('runtime') التفاعلية والـ DOM (LQ-200s)
      button.pill-btn class={selectedCategory.value === 'router' ? 'active' : ''} type="button" @click=setCategory('router') الموجه والمسارات (LQ-300s)
      button.pill-btn class={selectedCategory.value === 'cli' ? 'active' : ''} type="button" @click=setCategory('cli') أوامر الطرفية (LQ-400s)

  div.quick-codes
    span.quick-label انتقال سريع لرمز:
    button.code-chip type="button" @click=selectId('LQ-101') LQ-101
    button.code-chip type="button" @click=selectId('LQ-102') LQ-102
    button.code-chip type="button" @click=selectId('LQ-104') LQ-104
    button.code-chip type="button" @click=selectId('LQ-105') LQ-105
    button.code-chip type="button" @click=selectId('LQ-201') LQ-201
    button.code-chip type="button" @click=selectId('LQ-202') LQ-202
    button.code-chip type="button" @click=selectId('LQ-301') LQ-301
    button.code-chip type="button" @click=selectId('LQ-401') LQ-401

  if filteredErrors.value.length === 0
    div.empty-box
      div.empty-icon 🔎
      h3.empty-title لم يتم العثور على أخطاء تطابق بحثك!
      p.empty-desc جرب البحث بكلمات عامة مثل "Tab" أو "Signal" أو "each".
      button.pill-btn.active type="button" @click=clearSearch عرض كافة الأخطاء
  else
    div.error-list
      each filteredErrors.value as err (err.id)
        div.error-card id={err.id}
          div.card-top
            div.meta-badges
              span.id-badge {err.id}
              span.cat-badge {err.category}
            div.card-actions
              button.copy-link-btn type="button" @click=copyToClipboard(getErrorUrl(err.id), 'تم نسخ رابط الخطأ! ✓') نسخ رابط التوثيق 🔗

          h2.err-title {err.titleAr}
          p.err-title-en {err.titleEn}
          p.err-summary {err.summaryAr}

          div.explain-box
            div.explain-label ❓ لماذا يحدث هذا الخطأ؟
            p.explain-text {err.causeAr}

          div.codes-grid
            div.code-col.bad
              div.code-col-head
                span ❌ كود خاطئ يسبب المشكلة
              pre.code-pre
                code {err.badCode}

            div.code-col.good
              div.code-col-head
                span ✅ الكود الصحيح
              pre.code-pre
                code {err.goodCode}

          div.fix-box
            div.fix-head 💡 خطوات الحل السريع
            p.fix-desc {err.fixAr}
