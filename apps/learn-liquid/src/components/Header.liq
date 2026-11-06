--- logic
import { theme, lang, toggleTheme, toggleLang, toastMessage } from '../store.js';
import { t } from '../i18n.js';
import { navigate, currentPath } from '../router.js';
import { signal } from 'liquid';

const mobileMenuOpen = signal(false);

function toggleMobile() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function goTo(path) {
  navigate(path);
  mobileMenuOpen.value = false;
}

--- style
.nav-header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: var(--bg-nav);
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 800;
  font-size: 1.25rem;
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  font-size: 1.6rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(2, 132, 199, 0.3));
}

.brand-badge {
  font-size: 0.7rem;
  background: var(--primary-glow);
  color: var(--primary);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  font-weight: 600;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.nav-link {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-link.active {
  color: var(--primary);
  background: var(--primary-glow);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: inherit;
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.mobile-toggle {
  display: none;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.25rem;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
}

.mobile-drawer {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem 1.5rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
}

.mobile-link {
  background: transparent;
  border: none;
  text-align: inherit;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.mobile-link.active {
  background: var(--primary-glow);
  color: var(--primary);
}

.mobile-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  background: #0284c7;
  color: #ffffff;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.2s ease-out;
}

:global([dir="rtl"]) .toast {
  right: auto;
  left: 1.5rem;
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .actions .action-btn {
    display: none;
  }
  .mobile-toggle {
    display: block;
  }
}

--- ui
header.nav-header
  div.nav-container
    div.brand @click=goTo('/')
      span.brand-icon 🫟
      span.brand-title Liquid
      span.brand-badge v1.0.0

    nav.nav-links
      button.nav-link class={currentPath() === '/' ? 'active' : ''} @click=goTo('/') {t('navHome')}
      button.nav-link class={currentPath() === '/guide' ? 'active' : ''} @click=goTo('/guide') {t('navGuide')}
      button.nav-link class={currentPath() === '/playground' ? 'active' : ''} @click=goTo('/playground') {t('navPlayground')}
      button.nav-link class={currentPath() === '/cheatsheet' ? 'active' : ''} @click=goTo('/cheatsheet') {t('navCheatsheet')}
      button.nav-link class={currentPath() === '/errors' ? 'active' : ''} @click=goTo('/errors') {t('navErrors')}
      button.nav-link class={currentPath() === '/deploy' ? 'active' : ''} @click=goTo('/deploy') {t('navDeploy')}

    div.actions
      button.action-btn type="button" @click=toggleLang title="تبديل اللغة / Toggle Language"
        span 🌐
        span {t('toggleLang')}
      button.action-btn type="button" @click=toggleTheme title="المظهر / Theme"
        span {theme.value === 'dark' ? '☀️' : '🌙'}
      button.mobile-toggle type="button" @click=toggleMobile aria-label="Menu"
        span {mobileMenuOpen.value ? '✕' : '☰'}

  if mobileMenuOpen.value
    div.mobile-drawer
      button.mobile-link class={currentPath() === '/' ? 'active' : ''} @click=goTo('/') {t('navHome')}
      button.mobile-link class={currentPath() === '/guide' ? 'active' : ''} @click=goTo('/guide') {t('navGuide')}
      button.mobile-link class={currentPath() === '/playground' ? 'active' : ''} @click=goTo('/playground') {t('navPlayground')}
      button.mobile-link class={currentPath() === '/cheatsheet' ? 'active' : ''} @click=goTo('/cheatsheet') {t('navCheatsheet')}
      button.mobile-link class={currentPath() === '/errors' ? 'active' : ''} @click=goTo('/errors') {t('navErrors')}
      button.mobile-link class={currentPath() === '/deploy' ? 'active' : ''} @click=goTo('/deploy') {t('navDeploy')}
      div.mobile-actions
        button.action-btn style="flex: 1;" type="button" @click=toggleLang
          span 🌐
          span {t('toggleLang')}
        button.action-btn style="flex: 1;" type="button" @click=toggleTheme
          span {theme.value === 'dark' ? '☀️ فاتح' : '🌙 داكن'}

  if toastMessage.value
    div.toast {toastMessage.value}
