import { lang } from './store.js';

export const translations = {
  ar: {
    siteTitle: 'Liquid 🫟 — تعلم كيف تصنع موقعك الخاص',
    siteTagline: 'إطار العمل الحديث وفائق الإيجاز للويب مبني على Signals وبدون Virtual DOM',
    navHome: 'الرئيسية',
    navGuide: 'الدليل التعليمي',
    navPlayground: 'المعمل التفاعلي',
    navCheatsheet: 'مرجع الأوامر',
    navErrors: 'دليل الأخطاء',
    navDeploy: 'النشر والإنتاج',
    navGithub: 'المستودع',
    toggleTheme: 'تبديل المظهر',
    toggleLang: 'English',
    copiedText: 'تم النسخ إلى الحافظة! ✓',
    copyCode: 'نسخ الكود',
    livePreview: 'معاينة حية',
    viewCode: 'عرض الكود',
    tryItOut: 'جرب بنفسك',

    // Hero Section
    heroBadge: '🫟 الإصدار 0.2.0 — جاهز للإنتاج',
    heroTitle: 'اصنع موقع ويب متكامل، سريع، وفائق الإيجاز',
    heroDesc: 'Liquid يجمع بين قوة الإشارات التفاعلية (Signals) والبنية المدمجة لملفات .liq (المنطق + الأنماط + الواجهة) لتطوير مواقع ويب سريعة البرق بدون أي اعتماديات خارجية أو تعقيد.',
    btnStartLearning: 'ابدأ التعلم الآن 🚀',
    btnTryPlayground: 'جرب المعمل التفاعلي ⚡',
    quickStartCommand: 'npm install -g @mkdevofficial/liquid-cli && liquid create my-website',

    // Value propositions
    feat1Title: 'ملف واحد لكل مكون (.liq)',
    feat1Desc: 'توديع التشتت بين عشرات الملفات! يجمع المنطق (JS)، الأنماط المعزولة (CSS)، وقالب الواجهة في ملف واحد واضح.',
    feat2Title: 'تفاعلية فائقة عبر Signals',
    feat2Desc: 'تحديث دقيق ومباشر لعناصر الـ DOM المتغيرة فقط بدون الحاجة لمحاكاة شجرة افتراضية (Virtual DOM) ثقيلة.',
    feat3Title: 'بناء وإنتاج بدون اعتماديات أصلية',
    feat3Desc: 'يعمل 100% بكود جافاسكريبت نقي (ESM). يثبت ويعمل فوراً على أي خادم، هاتف محمول (Termux)، أو حاسوب شخصي.',

    // Step-by-Step 3 Minute Guide
    threeStepTitle: 'اصنع موقعك الأول في 3 خطوات بسيطة',
    step1Num: '1',
    step1Title: 'تثبيت وإنشاء المشروع',
    step1Desc: 'استخدم سطر أوامر Liquid لإنشاء مشروعك الجاهز في ثوانٍ معدودة:',
    step2Num: '2',
    step2Title: 'بدء خادم التطوير المحلي',
    step2Desc: 'ادخل إلى مجلد المشروع وشغّل خادم التطوير الفوري مع التحديث المباشر (HMR):',
    step3Num: '3',
    step3Title: 'اكتب كود الواجهة والمنطق',
    step3Desc: 'افتح ملف src/App.liq وشاهد تغييراتك تظهر في المتصفح في أجزاء من الثانية:',

    // Chapters
    chaptersTitle: 'فهرس الدليل الشامل',
    chOverview: '١. ما هو Liquid وفلسفته؟',
    chStructure: '٢. هيكل المشروع والملفات الأساسية',
    chAnatomy: '٣. تشريح مكون .liq (المنطق، الأنماط، الواجهة)',
    chSignals: '٤. إدارة الحالة والتفاعلية (Signals)',
    chDirectives: '٥. التوجيهات والأحداث والقوائم',
    chRouting: '٦. بناء موقع متعدد الصفحات (Routing)',
    chStyling: '٧. التصميم وعزل الأنماط (Scoped CSS)',
    chDeployment: '٨. البناء للإنتاج والاستضافة',

    // Playground
    playgroundTitle: 'المعمل التفاعلي للأمثلة الحية',
    playgroundDesc: 'استكشف مكونات حقيقية تعمل بـ Liquid وجرب التفاعل معها وانسخ الكود الجاهز لمشروعك:',
    tabCounter: 'عداد تفاعلي (Counter)',
    tabTodo: 'قائمة مهام (Todo List)',
    tabForm: 'نموذج مع التحقق (Live Form)',
    tabCalculator: 'حاسبة نفقات سريعة (Budget)',

    // Cheatsheet
    cheatsheetTitle: 'المرجع السريع لقواعد Liquid',
    cheatsheetDesc: 'نظرة سريعة على جميع الأوامر، التوجيهات، والخصائص التي تحتاجها لبناء أي موقع.',

    // Footer
    footerMadeWith: 'صُنع بكل فخر بواسطة إطار عمل Liquid 🫟 — بدون أي مكتبة خارجية.',
    footerDocs: 'دليل التوثيق الرسمي لـ Liquid'
  },
  en: {
    siteTitle: 'Liquid 🫟 — Learn How to Build Websites with Liquid',
    siteTagline: 'The ultra-concise, signal-based web framework without a Virtual DOM',
    navHome: 'Home',
    navGuide: 'Guide & Tutorial',
    navPlayground: 'Playground',
    navCheatsheet: 'Cheatsheet',
    navErrors: 'Error Catalog',
    navDeploy: 'Deployment',
    navGithub: 'GitHub',
    toggleTheme: 'Toggle Theme',
    toggleLang: 'العربية',
    copiedText: 'Copied to clipboard! ✓',
    copyCode: 'Copy Code',
    livePreview: 'Live Preview',
    viewCode: 'View Code',
    tryItOut: 'Try It Out',

    // Hero Section
    heroBadge: '🫟 Version 0.2.0 — Production Ready',
    heroTitle: 'Build Complete, Fast, Ultra-Concise Websites',
    heroDesc: 'Liquid unites the reactive power of Signals with single-file .liq components (logic + scoped styles + template) to craft lightning-fast web apps with zero native dependencies.',
    btnStartLearning: 'Start Learning 🚀',
    btnTryPlayground: 'Try Playground ⚡',
    quickStartCommand: 'npm install -g @mkdevofficial/liquid-cli && liquid create my-website',

    // Value propositions
    feat1Title: 'Single File Components (.liq)',
    feat1Desc: 'No more jumping between files! Logic (JS), Scoped Styles (CSS), and UI Templates live in one clean, readable file.',
    feat2Title: 'Fine-Grained Signals Reactivity',
    feat2Desc: 'Surgically updates only the exact DOM nodes that change, completely eliminating heavy Virtual DOM reconciliation.',
    feat3Title: 'Zero Native Dependencies',
    feat3Desc: 'Pure modern JavaScript (ESM). Installs and runs instantly on any server, phone (Termux), or desktop.',

    // Step-by-Step 3 Minute Guide
    threeStepTitle: 'Build Your First Site in 3 Simple Steps',
    step1Num: '1',
    step1Title: 'Install & Scaffold Project',
    step1Desc: 'Use the official Liquid CLI to generate a ready-to-run project in seconds:',
    step2Num: '2',
    step2Title: 'Start Fast Dev Server',
    step2Desc: 'Enter your project folder and launch the instant dev server with hot module reloading:',
    step3Num: '3',
    step3Title: 'Write Your Component Code',
    step3Desc: 'Open src/App.liq and watch your changes render in your browser in milliseconds:',

    // Chapters
    chaptersTitle: 'Documentation Chapters',
    chOverview: '1. What is Liquid & Core Philosophy',
    chStructure: '2. Project Structure & Core Files',
    chAnatomy: '3. Anatomy of a .liq Component',
    chSignals: '4. Reactive State & Signals',
    chDirectives: '5. Directives, Events & Lists',
    chRouting: '6. Multi-Page Routing',
    chStyling: '7. Scoped Styling & Themes',
    chDeployment: '8. Production Build & Hosting',

    // Playground
    playgroundTitle: 'Interactive Live Playground',
    playgroundDesc: 'Explore real Liquid components in action, interact with live state, and copy the code to your app:',
    tabCounter: 'Interactive Counter',
    tabTodo: 'Todo List',
    tabForm: 'Validated Form',
    tabCalculator: 'Quick Budget Calculator',

    // Cheatsheet
    cheatsheetTitle: 'Liquid Syntax Cheatsheet',
    cheatsheetDesc: 'Quick reference for all directives, signal primitives, CLI commands, and lifecycle methods.',

    // Footer
    footerMadeWith: 'Proudly built with the Liquid 🫟 framework — 100% pure JS with zero UI libraries.',
    footerDocs: 'Official Liquid Documentation'
  }
};

export function t(key) {
  const current = translations[lang.value] || translations.ar;
  return current[key] || translations.ar[key] || key;
}
