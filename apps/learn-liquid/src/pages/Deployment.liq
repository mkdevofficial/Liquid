--- logic
import { t } from '../i18n.js';
import { copyToClipboard } from '../store.js';

const nginxConfig = `server {
    listen 80;
    server_name my-liquid-site.com;
    root /var/www/my-liquid-site/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # تخزين الأصول المشفرة بالهاش مؤقتاً
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}`;

--- style
.deploy-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

.deploy-head {
  text-align: center;
  margin-bottom: 3rem;
}

.deploy-title {
  font-size: 2.3rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.deploy-desc {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin: 0;
}

.deploy-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.section-h2 {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.section-p {
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.7;
  margin: 0 0 1rem;
}

.code-box {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  direction: ltr;
  margin: 1rem 0;
}

.code-box code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #38bdf8;
}

.copy-btn {
  background: #334155;
  color: #e2e8f0;
  border: none;
  padding: 0.4rem 0.8rem;
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

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.platform-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.platform-card h3 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.platform-card p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.nginx-pre {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #f8fafc;
  direction: ltr;
  text-align: left;
  margin-top: 1rem;
}

--- ui
div.deploy-page
  div.deploy-head
    h1.deploy-title النشر والإنتاج (Production & Deployment)
    p.deploy-desc كيفية تحويل موقع Liquid إلى حزمة إنتاج فائقة السرعة واستضافته على الإنترنت مجاناً.

  div.deploy-section
    h2.section-h2
      span 📦
      span 1. توليد حزمة الإنتاج
    p.section-p يقوم مصرف ومجمع Liquid بضغط ملفات JavaScript واستخراج كافة أنماط CSS المعزولة وتوليد أسماء ملفات مشفرة بالهاش لمنع مشاكل التخزين المؤقت:
    div.code-box
      code liquid build
      button.copy-btn type="button" @click=copyToClipboard('liquid build') نسخ

    p.section-p يمكنك أيضاً تجربة النسخة المنتجة محلياً لمحاكاة أداء الخادم الحقيقي:
    div.code-box
      code liquid preview
      button.copy-btn type="button" @click=copyToClipboard('liquid preview') نسخ

  div.deploy-section
    h2.section-h2
      span ☁️
      span 2. النشر على منصات الاستضافة السحابية
    p.section-p نظراً لأن ناتج البناء في مجلد dist هو موقع ثابت (Pure Static Site)، يمكنك استضافته مجاناً وبنقرة واحدة:
    div.platforms-grid
      div.platform-card
        h3 ▲ Vercel
        p اربط مستودع GitHub واختر إعداد Output Directory إلى dist واترك الباقي تلقائياً.

      div.platform-card
        h3 🌐 Netlify
        p اختر المجلد dist كنقطة نشر، وأمر البناء npm run build.

      div.platform-card
        h3 🐙 GitHub Pages
        p استخدم أداة gh-pages لنشر محتويات مجلد dist إلى فرع gh-pages مجاناً.

      div.platform-card
        h3 ⚡ Cloudflare Pages
        p استضافة سريعة على شبكة Cloudflare العالمية مع شهادة SSL مجانية وتحديث فوري.

  div.deploy-section
    h2.section-h2
      span 🖥️
      span 3. النشر على خادم VPS أو Nginx
    p.section-p إذا كنت تستضيف موقعك على خادم لينكس خاص، هذا ملف تكوين Nginx الكامل مع دعم التوجيه للتطبيقات أحادية الصفحة (SPA):
    pre.nginx-pre
      code {nginxConfig}
