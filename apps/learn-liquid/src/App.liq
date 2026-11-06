--- logic
import Header from './components/Header.liq';
import { RouterView, navigate } from './router.js';
import { t } from './i18n.js';

--- style
:global(:root) {
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-input: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-nav: rgba(255, 255, 255, 0.92);
  --text-primary: #0f172a;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --primary-glow: rgba(2, 132, 199, 0.12);
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
}

:global([data-theme="dark"]) {
  --bg-page: #0b0f19;
  --bg-card: #151d2f;
  --bg-input: #1e293b;
  --bg-hover: #243048;
  --bg-nav: rgba(11, 15, 25, 0.92);
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: #243048;
  --primary: #38bdf8;
  --primary-hover: #0284c7;
  --primary-glow: rgba(56, 189, 248, 0.15);
  --success: #34d399;
  --danger: #f87171;
  --warning: #fbbf24;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.5);
}

:global(body) {
  margin: 0;
  padding: 0;
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

:global([dir="ltr"] body) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:global(*), :global(*::before), :global(*::after) {
  box-sizing: border-box;
}

.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

.site-footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: 3rem 1.25rem;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.1rem;
}

.footer-tagline {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0;
}

.footer-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: none;
  font-family: inherit;
  padding: 0;
}

.footer-link:hover {
  color: var(--primary);
}

.footer-copy {
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding-top: 1.5rem;
  margin-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

--- ui
div.app-wrapper
  Header

  main.main-content
    RouterView

  footer.site-footer
    div.footer-container
      div.footer-info
        div.footer-brand
          span 🫟
          span Liquid Framework
        p.footer-tagline {t('siteTagline')}

      div.footer-links
        button.footer-link type="button" @click=navigate('/') {t('navHome')}
        button.footer-link type="button" @click=navigate('/guide') {t('navGuide')}
        button.footer-link type="button" @click=navigate('/playground') {t('navPlayground')}
        button.footer-link type="button" @click=navigate('/cheatsheet') {t('navCheatsheet')}
        button.footer-link type="button" @click=navigate('/deploy') {t('navDeploy')}

      div.footer-copy {t('footerMadeWith')}
