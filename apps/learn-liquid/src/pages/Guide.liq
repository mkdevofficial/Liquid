--- logic
import { t } from '../i18n.js';
import { copyToClipboard, activeChapter } from '../store.js';
import { signal } from 'liquid';

function selectChapter(ch) {
  activeChapter.value = ch;
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

const SEC_LOGIC = '---' + ' logic';
const SEC_STYLE = '---' + ' style';
const SEC_UI = '---' + ' ui';

const codeInstall = `# 1. تثبيت سطر أوامر Liquid عاماً على جهازك
npm install -g liquid-cli

# 2. إنشاء مشروع موقع جديد جاهز للتشغيل
liquid create my-website

# 3. الدخول إلى مجلد المشروع وبدء خادم التطوير
cd my-website
npm run dev`;

const codeTree = `my-website/
├── index.html          # الصفحة الحاوية وعنصر التثبيت (#app)
├── liquid.config.js    # إعدادات المنفذ والاستضافة والبناء
├── package.json        # معلومات المشروع واعتماديات Liquid
├── public/             # الملفات الثابتة والصور والأيقونات
└── src/
    ├── main.js         # نقطة الدخول (Entry Point) وربط التطبيق
    └── App.liq         # المكون الجذري الرئيسي للموقع`;

const codeIndexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>موقعي بـ Liquid</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`;

const codeMainJs = `import { mount } from 'liquid';
import App from './App.liq';

// تثبيت المكون في الـ DOM
mount(App, document.getElementById('app'));`;

const codeCardLiq = `${SEC_LOGIC}
import { signal } from 'liquid';

const likes = signal(0);
function giveLike() {
  likes.value++;
}

${SEC_STYLE}
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.btn-like {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
}

${SEC_UI}
div.card
  h2 بطاقة تفاعلية
  p عدد الإعجابات: {likes.value}
  button.btn-like @click=giveLike إعجاب ❤️`;

const codeSignal = `import { signal } from 'liquid';

// إنشاء إشارة بقيمة مبدئية
const count = signal(0);

// قراءة القيمة
console.log(count.value); // 0 (أو يمكنك استدعاؤها كدالة: count())

// تعديل القيمة يُحدّث الـ DOM فوراً وبدقة بالغة!
count.value++; // أصبحت 1`;

const codeComputed = `import { signal, computed } from 'liquid';

const price = signal(100);
const taxRate = signal(0.15);

// تُحسب الضريبة تلقائياً فقط عند تعديل السعر أو النسبة
const total = computed(() => price.value + (price.value * taxRate.value));`;

const codeEffect = `import { signal, effect } from 'liquid';

const theme = signal('dark');

effect(() => {
  // يتكرر حفظ المظهر تلقائياً كلما تغير theme
  localStorage.setItem('user_theme', theme.value);
  document.body.className = theme.value;
});`;

const codeDirectives = `// حدث النقر البسيط
button @click=increment زيادة العداد

// منع السلوك الافتراضي (Prevent Default)
form @submit.prevent=handleSubmit

// التفاعل مع زر الإدخال Enter فقط
input @keydown.enter=addTodo`;

const codeBind = `input type="text" $bind=searchQuery
p أنت تبحث عن: {searchQuery.value}`;

const codeIf = `if isLoggedIn.value
  h2 مرحباً بك مجدداً يا {username.value}!
  button @click=logout تسجيل الخروج
else
  p الرجاء تسجيل الدخول للمتابعة.
  button @click=login تسجيل الدخول`;

const codeEach = `each products.value as p (p.id)
  div.product-card
    h3 {p.title}
    span السعر: {'$' + p.price}`;

const codeRouter = `import { createRouter } from 'liquid';
import HomePage from './pages/HomePage.liq';
import AboutPage from './pages/AboutPage.liq';
import NotFound from './pages/NotFound.liq';

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '*', component: NotFound }
];

export const router = createRouter({ routes, mode: 'hash' });
export const { RouterView, navigate, currentPath } = router;`;

const codeAppRouter = `${SEC_LOGIC}
import { RouterView, navigate } from './router.js';

${SEC_UI}
div.site-wrapper
  header
    button @click=navigate('/') الرئيسية
    button @click=navigate('/about') حول الموقع

  main
    RouterView`;

const codeStyling = `${SEC_STYLE}
:global(:root) {
  --bg-page: #ffffff;
  --text-main: #0f172a;
  --primary: #0284c7;
}

:global([data-theme="dark"]) {
  --bg-page: #0b0f19;
  --text-main: #f8fafc;
  --primary: #38bdf8;
}

body {
  background: var(--bg-page);
  color: var(--text-main);
  margin: 0;
  font-family: sans-serif;
}`;

const codeBuild = `# إنشاء حزمة الإنتاج في مجلد dist/
liquid build

# تجربة حزمة الإنتاج محلياً للتأكد من كل شيء
liquid preview`;

const codeLqe = `# فتح محرر liquid-edit المدمج
liquid edit src/App.liq

# أو بالأمر المختصر
lqe src/App.liq`;

const codePlatforms = `Vercel: قم بتعيين Output Directory إلى dist
Netlify: اختر المجلد dist للنشر الفوري
GitHub Pages: ارفع محتويات dist إلى فرع gh-pages
Cloudflare Pages: قم بربط المستودع مع أمر liquid build`;

--- style
.guide-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2.5rem;
  align-items: flex-start;
}

.guide-sidebar {
  position: sticky;
  top: 5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.4rem 0.6rem 0.8rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.4rem;
}

.ch-btn {
  background: transparent;
  border: none;
  text-align: inherit;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ch-btn:hover {
  background: var(--bg-hover);
  color: var(--primary);
}

.ch-btn.active {
  background: var(--primary-glow);
  color: var(--primary);
  font-weight: 800;
}

.ch-icon {
  font-size: 1.1rem;
}

.guide-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 2.5rem;
  box-shadow: var(--shadow-sm);
}

.ch-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}

.ch-tag {
  display: inline-block;
  background: var(--primary-glow);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.65rem;
  border-radius: 6px;
  margin-bottom: 0.6rem;
}

.ch-h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 0 0.75rem;
  color: var(--text-primary);
  line-height: 1.25;
}

.ch-lead {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.7;
  margin: 0;
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-block h3 {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.85rem;
  color: var(--text-primary);
}

.section-block p {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.75;
  margin: 0 0 1rem;
}

.code-wrapper {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  overflow: hidden;
  margin: 1.25rem 0;
  direction: ltr;
  text-align: left;
}

.code-header {
  background: #1e293b;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #334155;
}

.code-filename {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #38bdf8;
  font-weight: 600;
}

.copy-btn {
  background: #334155;
  color: #e2e8f0;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: var(--primary);
  color: white;
}

.code-pre {
  margin: 0;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88rem;
  line-height: 1.6;
  color: #f8fafc;
}

.info-callout {
  background: var(--primary-glow);
  border-right: 4px solid var(--primary);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
}

:global([dir="ltr"]) .info-callout {
  border-right: none;
  border-left: 4px solid var(--primary);
}

.callout-title {
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 0.35rem;
  font-size: 0.95rem;
}

.callout-desc {
  font-size: 0.92rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

.ch-nav-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.nav-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

@media (max-width: 900px) {
  .guide-container {
    grid-template-columns: 1fr;
  }
  .guide-sidebar {
    position: static;
  }
  .guide-content {
    padding: 1.5rem;
  }
  .ch-h1 {
    font-size: 1.8rem;
  }
}

--- ui
div.guide-container
  aside.guide-sidebar
    div.sidebar-title {t('chaptersTitle')}
    button.ch-btn class={activeChapter.value === 'overview' ? 'active' : ''} type="button" @click=selectChapter('overview')
      span.ch-icon 🫟
      span {t('chOverview')}
    button.ch-btn class={activeChapter.value === 'structure' ? 'active' : ''} type="button" @click=selectChapter('structure')
      span.ch-icon 📁
      span {t('chStructure')}
    button.ch-btn class={activeChapter.value === 'anatomy' ? 'active' : ''} type="button" @click=selectChapter('anatomy')
      span.ch-icon 🧩
      span {t('chAnatomy')}
    button.ch-btn class={activeChapter.value === 'signals' ? 'active' : ''} type="button" @click=selectChapter('signals')
      span.ch-icon ⚡
      span {t('chSignals')}
    button.ch-btn class={activeChapter.value === 'directives' ? 'active' : ''} type="button" @click=selectChapter('directives')
      span.ch-icon 🎯
      span {t('chDirectives')}
    button.ch-btn class={activeChapter.value === 'routing' ? 'active' : ''} type="button" @click=selectChapter('routing')
      span.ch-icon 🗺️
      span {t('chRouting')}
    button.ch-btn class={activeChapter.value === 'styling' ? 'active' : ''} type="button" @click=selectChapter('styling')
      span.ch-icon 🎨
      span {t('chStyling')}
    button.ch-btn class={activeChapter.value === 'deploy' ? 'active' : ''} type="button" @click=selectChapter('deploy')
      span.ch-icon 🚀
      span {t('chDeployment')}

  main.guide-content
    if activeChapter.value === 'overview'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الأول
          h1.ch-h1 ما هو Liquid ولماذا هو الخيار الأفضل؟
          p.ch-lead نظرة شاملة على فلسفة إطار العمل، كيف يعمل بدون Virtual DOM، وكيف تثبته في جهازك.

        div.guide-body
          div.section-block
            h3 فلسفة Liquid — بساطة فائقة وأداء استثنائي
            p إطار عمل Liquid تم تصميمه لحل مشكلة التعقيد الزائد في أطر العمل الحديثة مثل React و Next.js. بدلاً من محاكاة شجرة عناصر افتراضية (Virtual DOM) وإعادة استدعاء دوال المكونات مراراً وتكراراً مع كل ضغطة زر، يستخدم Liquid مكتبة إشارات تفاعلية (Fine-Grained Signals) ترتبط مباشرة بالعقد الحقيقية في المتصفح.
            p النتيجة هي: أداء فائق السرعة، استهلاك ذاكرة منخفض للغاية، وكود أقل بنسبة تصل إلى 60% مقارنة بالأطر التقليدية.

          div.section-block
            h3 التثبيت وإنشاء أول موقع في ثوانٍ
            p تأكد أولاً من تثبيت Node.js (الإصدار 20 فما فوق)، ثم قم بتشغيل الأمر التالي في الطرفية:
            div.code-wrapper
              div.code-header
                span.code-filename Terminal
                button.copy-btn type="button" @click=copyToClipboard(codeInstall) {t('copyCode')}
              pre.code-pre
                code {codeInstall}

          div.info-callout
            div.callout-title 💡 نصيحة للمطورين على الهواتف و Termux
            p.callout-desc إطار عمل Liquid مبني بنسبة 100% بكود JavaScript نقي خالي من أي مكتبات ثنائية أو C++ Addons. هذا يعني أنه يعمل فوراً وبسلاسة تامة على هواتف Android عبر تطبيق Termux بدون الحاجة لحاسوب محمول!

        div.ch-nav-buttons
          span
          button.nav-btn type="button" @click=selectChapter('structure') التالي: هيكل المشروع ◀

    else if activeChapter.value === 'structure'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الثاني
          h1.ch-h1 هيكل مشروع Liquid والملفات الأساسية
          p.ch-lead فهم البنية التنظيمية للمشروع، دور كل ملف، وكيف يتصل كودك بالمتصفح.

        div.guide-body
          div.section-block
            h3 شجرة ملفات المشروع النموذجي
            div.code-wrapper
              div.code-header
                span.code-filename Project Tree
              pre.code-pre
                code {codeTree}

          div.section-block
            h3 1. ملف index.html
            p ملف HTML قياسي وخفيف جداً، يحتوي على عنصر div يحمل المعرّف id="app" يستهدفه إطار العمل لتثبيت واجهتك فيه:
            div.code-wrapper
              div.code-header
                span.code-filename index.html
                button.copy-btn type="button" @click=copyToClipboard(codeIndexHtml) {t('copyCode')}
              pre.code-pre
                code {codeIndexHtml}

          div.section-block
            h3 2. ملف src/main.js
            p نقطة البداية لتشغيل تطبيقك. يستورد دالة mount من liquid ويقوم بربط المكون الجذري App.liq بعنصر الصفحة:
            div.code-wrapper
              div.code-header
                span.code-filename src/main.js
                button.copy-btn type="button" @click=copyToClipboard(codeMainJs) {t('copyCode')}
              pre.code-pre
                code {codeMainJs}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('overview') ▶ السابق: نظرة عامة
          button.nav-btn type="button" @click=selectChapter('anatomy') التالي: تشريح مكون .liq ◀

    else if activeChapter.value === 'anatomy'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الثالث
          h1.ch-h1 تشريح ملف المكون (.liq)
          p.ch-lead كيف يجمع ملف .liq المنطق والأنماط والواجهة في مكان واحد وبشكل منظم للغاية.

        div.guide-body
          div.section-block
            h3 الأقسام الثلاثة الرئيسية
            p يتكون كل ملف مكون من امتداد .liq من ثلاثة أقسام تفصل بينها إشارات الفواصل الثلاثية (---):
            div.code-wrapper
              div.code-header
                span.code-filename src/components/Card.liq
                button.copy-btn type="button" @click=copyToClipboard(codeCardLiq) {t('copyCode')}
              pre.code-pre
                code {codeCardLiq}

          div.info-callout
            div.callout-title 🛡️ عزل الأنماط التلقائي (Scoped CSS)
            p.callout-desc في قسم الأنماط --- style، يقوم مصرف Liquid تلقائياً بتوليد فئات تجزئة مشفرة فريدة لكل مكون، مما يضمن أن قواعد الـ CSS التي تكتبها لن تتعارض أو تؤثر على أي صفحة أو مكون آخر في الموقع.

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('structure') ▶ السابق: هيكل المشروع
          button.nav-btn type="button" @click=selectChapter('signals') التالي: التفاعلية والإشارات ◀

    else if activeChapter.value === 'signals'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الرابع
          h1.ch-h1 إدارة الحالة والتفاعلية مع Signals
          p.ch-lead قلب نظام Liquid التفاعلي: الإشارات والدوال المحسوبة والتأثيرات الجانبية.

        div.guide-body
          div.section-block
            h3 1. الإشارات الأساسية: signal(initialValue)
            p الإشارة هي صندوق تفاعلي يحمل قيمة. عند تغيير القيمة، يُخطر Liquid فقط عناصر الـ DOM التي تقرأ تلك القيمة دون إعادة تشغيل أو تصيير المكون بأكمله:
            div.code-wrapper
              div.code-header
                span.code-filename JavaScript
                button.copy-btn type="button" @click=copyToClipboard(codeSignal) {t('copyCode')}
              pre.code-pre
                code {codeSignal}

          div.section-block
            h3 2. الدوال المحسوبة: computed(() => ...)
            p تتيح لك اشتقاق قيمة محسوبة من إشارة أو أكثر. تقوم بحفظ النتيجة في الذاكرة المؤقتة (Memoized) ولا تعيد الحساب إلا إذا تغيرت الإشارة الأصلية:
            div.code-wrapper
              div.code-header
                span.code-filename JavaScript
                button.copy-btn type="button" @click=copyToClipboard(codeComputed) {t('copyCode')}
              pre.code-pre
                code {codeComputed}

          div.section-block
            h3 3. التأثيرات الجانبية: effect(() => ...)
            p تراقب التأثيرات الجانبية أي إشارة يتم الوصول إليها داخلها، وتنفذ تلقائياً كلما تغيرت. ممتازة للحفظ في localStorage أو استدعاءات الخوادم:
            div.code-wrapper
              div.code-header
                span.code-filename JavaScript
                button.copy-btn type="button" @click=copyToClipboard(codeEffect) {t('copyCode')}
              pre.code-pre
                code {codeEffect}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('anatomy') ▶ السابق: تشريح المكون
          button.nav-btn type="button" @click=selectChapter('directives') التالي: التوجيهات والأحداث ◀

    else if activeChapter.value === 'directives'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الخامس
          h1.ch-h1 التوجيهات، الأحداث، الكتل الشرطية، والتكرار
          p.ch-lead الأدوات الأساسية لربط واجهة المستخدم بالأحداث والبيانات المتغيرة.

        div.guide-body
          div.section-block
            h3 1. ربط الأحداث: @event
            p لربط أي حدث من أحداث المتصفح (مثل النقر أو الإدخال أو الضغط على مفتاح):
            div.code-wrapper
              div.code-header
                span.code-filename UI Template
                button.copy-btn type="button" @click=copyToClipboard(codeDirectives) {t('copyCode')}
              pre.code-pre
                code {codeDirectives}

          div.section-block
            h3 2. الربط ثنائي الاتجاه للحقول: $bind
            p يتيح ربط قيمة حقل الإدخال مباشرة بإشارة تفاعلية في كلا الاتجاهين:
            div.code-wrapper
              div.code-header
                span.code-filename UI Template
                button.copy-btn type="button" @click=copyToClipboard(codeBind) {t('copyCode')}
              pre.code-pre
                code {codeBind}

          div.section-block
            h3 3. الكتل الشرطية: &lt;if&gt;
            p إظهار أو إخفاء أجزاء من الواجهة بناءً على شرط منطقي:
            div.code-wrapper
              div.code-header
                span.code-filename UI Template
                button.copy-btn type="button" @click=copyToClipboard(codeIf) {t('copyCode')}
              pre.code-pre
                code {codeIf}

          div.section-block
            h3 4. التكرار والقوائم: &lt;each&gt;
            p تكرار المصفوفات بكفاءة مع تحديد مفتاح فريد لكل عنصر (Key):
            div.code-wrapper
              div.code-header
                span.code-filename UI Template
                button.copy-btn type="button" @click=copyToClipboard(codeEach) {t('copyCode')}
              pre.code-pre
                code {codeEach}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('signals') ▶ السابق: إدارة الحالة
          button.nav-btn type="button" @click=selectChapter('routing') التالي: التوجيه والصفحات ◀

    else if activeChapter.value === 'routing'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل السادس
          h1.ch-h1 بناء موقع متعدد الصفحات (Routing)
          p.ch-lead كيفية استخدام موجه Liquid لبناء تطبيقات صفحات أحادية متعددة المسارات (SPA).

        div.guide-body
          div.section-block
            h3 إعداد الموجه: createRouter
            p يأتي Liquid مع موجه صفحات قوي وخفيف مدمج في حزمة liquid الرئيسية:
            div.code-wrapper
              div.code-header
                span.code-filename src/router.js
                button.copy-btn type="button" @click=copyToClipboard(codeRouter) {t('copyCode')}
              pre.code-pre
                code {codeRouter}

          div.section-block
            h3 عرض الصفحة النشطة في App.liq
            p في مكونك الرئيسي، استورد RouterView وضعه في المكان المخصص لعرض الصفحات:
            div.code-wrapper
              div.code-header
                span.code-filename src/App.liq
                button.copy-btn type="button" @click=copyToClipboard(codeAppRouter) {t('copyCode')}
              pre.code-pre
                code {codeAppRouter}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('directives') ▶ السابق: التوجيهات والأحداث
          button.nav-btn type="button" @click=selectChapter('styling') التالي: التصميم والأنماط ◀

    else if activeChapter.value === 'styling'
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل السابع
          h1.ch-h1 التصميم وعزل الأنماط (Scoped CSS)
          p.ch-lead كتابة أنماط CSS حديثة ومعزولة بدون تداخلات، مع دعم الوضع الداكن والفاتح.

        div.guide-body
          div.section-block
            h3 كيف يعمل Scoped CSS في Liquid؟
            p كل قاعدة CSS تكتبها في قسم --- style يتم ربطها تلقائياً بالسمة المشفرة الخاصة بالمكون (مثل [data-l-1a2b3c]). هذا يعني أنه يمكنك استخدام أسماء فئات بسيطة مثل .card و .btn و .title دون القلق من أن تؤثر على مكونات أخرى.

          div.section-block
            h3 الأنماط العامة ومتغيرات CSS
            p لتعريف متغيرات الألوان العامة وخطوط الموقع التي تنطبق على كامل الصفحة، استخدم :global(:root):
            div.code-wrapper
              div.code-header
                span.code-filename src/App.liq
                button.copy-btn type="button" @click=copyToClipboard(codeStyling) {t('copyCode')}
              pre.code-pre
                code {codeStyling}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('routing') ▶ السابق: التوجيه والصفحات
          button.nav-btn type="button" @click=selectChapter('deploy') التالي: الإنتاج والنشر ◀

    else
      div.chapter-pane
        div.ch-header
          span.ch-tag الفصل الثامن
          h1.ch-h1 تجهيز الموقع للإنتاج والاستضافة
          p.ch-lead تجميع الأصول بأعلى أداء، وتقليل الحجم، ونشر موقعك على الإنترنت.

        div.guide-body
          div.section-block
            h3 1. أمر البناء للإنتاج: liquid build
            p يقوم أمر البناء بتجميع واستخراج كافة أكواد JavaScript و CSS، وتوليد حزم مصغرة فائقة السرعة مع هاش للأصول لتسريع التحميل والتخزين المؤقت:
            div.code-wrapper
              div.code-header
                span.code-filename Terminal
                button.copy-btn type="button" @click=copyToClipboard(codeBuild) {t('copyCode')}
              pre.code-pre
                code {codeBuild}

          div.section-block
            h3 2. النشر على منصات الاستضافة المجانية
            p مجلد dist/ الناتج هو موقع ويب ثابت (Static Site) نقي، يمكنك رفعه على:
            div.code-wrapper
              div.code-header
                span.code-filename Hosting Platforms
                button.copy-btn type="button" @click=copyToClipboard(codePlatforms) {t('copyCode')}
              pre.code-pre
                code {codePlatforms}

          div.section-block
            h3 3. التطوير المباشر من الهاتف مع محرر lqe
            p يتيح لك Liquid فتح محرر أكواد طرفي حديث مصمم خصيصاً للهواتف وشاشات اللمس عبر كتابة:
            div.code-wrapper
              div.code-header
                span.code-filename Terminal
                button.copy-btn type="button" @click=copyToClipboard(codeLqe) {t('copyCode')}
              pre.code-pre
                code {codeLqe}

        div.ch-nav-buttons
          button.nav-btn type="button" @click=selectChapter('styling') ▶ السابق: التصميم والأنماط
          button.nav-btn type="button" @click=selectChapter('overview') العودة للبداية ↺
