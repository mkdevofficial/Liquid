--- logic
import { t } from '../i18n.js';
import { copyToClipboard } from '../store.js';

--- style
.sheet-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

.sheet-head {
  text-align: center;
  margin-bottom: 3rem;
}

.sheet-title {
  font-size: 2.3rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.sheet-desc {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin: 0;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 1.75rem;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.item-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.item-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.snippet {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: #38bdf8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  direction: ltr;
}

.mini-copy {
  background: #334155;
  color: #e2e8f0;
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s ease;
}

.mini-copy:hover {
  background: var(--primary);
  color: white;
}

@media (max-width: 600px) {
  .sheet-grid {
    grid-template-columns: 1fr;
  }
}

--- ui
div.sheet-page
  div.sheet-head
    h1.sheet-title {t('cheatsheetTitle')}
    p.sheet-desc {t('cheatsheetDesc')}

  div.sheet-grid
    div.card
      h2.card-title
        span ⚡
        span أوامر سطر الأوامر (CLI Commands)

      div.item-row
        div.item-header
          span.item-label إنشاء مشروع جديد
          span.item-desc Scaffold
        div.snippet
          code liquid create my-site
          button.mini-copy type="button" @click=copyToClipboard('liquid create my-site') نسخ

      div.item-row
        div.item-header
          span.item-label تشغيل خادم التطوير
          span.item-desc Dev Server
        div.snippet
          code liquid dev --port 3000
          button.mini-copy type="button" @click=copyToClipboard('liquid dev') نسخ

      div.item-row
        div.item-header
          span.item-label بناء الموقع للإنتاج
          span.item-desc Production Bundle
        div.snippet
          code liquid build --outDir dist
          button.mini-copy type="button" @click=copyToClipboard('liquid build') نسخ

      div.item-row
        div.item-header
          span.item-label تجربة حزمة الإنتاج
          span.item-desc Preview Server
        div.snippet
          code liquid preview
          button.mini-copy type="button" @click=copyToClipboard('liquid preview') نسخ

      div.item-row
        div.item-header
          span.item-label التحقق من صحة ملفات .liq
          span.item-desc Type & Syntax Check
        div.snippet
          code liquid check
          button.mini-copy type="button" @click=copyToClipboard('liquid check') نسخ

      div.item-row
        div.item-header
          span.item-label فتح محرر الأكواد المدمج
          span.item-desc Phone-first TUI Editor
        div.snippet
          code liquid edit src/App.liq
          button.mini-copy type="button" @click=copyToClipboard('liquid edit src/App.liq') نسخ

    div.card
      h2.card-title
        span 📡
        span التفاعلية وإدارة الحالة (Reactivity API)

      div.item-row
        div.item-header
          span.item-label إنشاء إشارة
          span.item-desc signal(val)
        div.snippet
          code const count = signal(0);
          button.mini-copy type="button" @click=copyToClipboard('const count = signal(0);') نسخ

      div.item-row
        div.item-header
          span.item-label قراءة وتعديل الإشارة
          span.item-desc Get / Set
        div.snippet
          code count.value++; // أو count()
          button.mini-copy type="button" @click=copyToClipboard('count.value++;') نسخ

      div.item-row
        div.item-header
          span.item-label قيمة مشتقة محسوبة
          span.item-desc computed(fn)
        div.snippet
          code const double = computed(() => count.value * 2);
          button.mini-copy type="button" @click=copyToClipboard('const double = computed(() => count.value * 2);') نسخ

      div.item-row
        div.item-header
          span.item-label تأثير جانبي
          span.item-desc effect(fn)
        div.snippet
          code effect(() => console.log(count.value));
          button.mini-copy type="button" @click=copyToClipboard('effect(() => console.log(count.value));') نسخ

    div.card
      h2.card-title
        span 🎯
        span توجيهات القالب (Directives & Events)

      div.item-row
        div.item-header
          span.item-label ربط حدث النقر
          span.item-desc "@click"
        div.snippet
          code button @click=handleClick زر
          button.mini-copy type="button" @click=copyToClipboard('button @click=handleClick زر') نسخ

      div.item-row
        div.item-header
          span.item-label منع السلوك الافتراضي
          span.item-desc ".prevent"
        div.snippet
          code form @submit.prevent=save
          button.mini-copy type="button" @click=copyToClipboard('form @submit.prevent=save') نسخ

      div.item-row
        div.item-header
          span.item-label مفتاح محدد (Enter)
          span.item-desc "@keydown.enter"
        div.snippet
          code input @keydown.enter=submit
          button.mini-copy type="button" @click=copyToClipboard('input @keydown.enter=submit') نسخ

      div.item-row
        div.item-header
          span.item-label ربط الحقول ثنائي الاتجاه
          span.item-desc "$bind"
        div.snippet
          code input type="text" $bind=name
          button.mini-copy type="button" @click=copyToClipboard('input type="text" $bind=name') نسخ

    div.card
      h2.card-title
        span 🗺️
        span موجه الصفحات (Liquid Router)

      div.item-row
        div.item-header
          span.item-label إنشاء الموجه
          span.item-desc createRouter
        div.snippet
          code const r = createRouter({ routes });
          button.mini-copy type="button" @click=copyToClipboard('const router = createRouter({ routes });') نسخ

      div.item-row
        div.item-header
          span.item-label التنقل البرمجي
          span.item-desc navigate(path)
        div.snippet
          code navigate('/about');
          button.mini-copy type="button" @click=copyToClipboard("navigate('/about');") نسخ

      div.item-row
        div.item-header
          span.item-label عرض الصفحة النشطة
          span.item-desc RouterView
        div.snippet
          code RouterView
          button.mini-copy type="button" @click=copyToClipboard('RouterView') نسخ
