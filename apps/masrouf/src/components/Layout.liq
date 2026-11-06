--- logic
import BottomNav from './BottomNav.liq';
import { toggleTheme, toggleLanguage, currentTheme, currentLang, t } from '../store.js';

const { pageTitle = '' } = defineProps();

--- style
.app-shell {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  color: var(--text-primary);
  position: relative;
  box-shadow: var(--shadow-shell);
}
.app-header {
  position: sticky;
  top: 0;
  z-index: 400;
  background: var(--bg-nav);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.brand-logo {
  font-size: 1.5rem;
  line-height: 1;
}
.brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.action-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}
.main-content {
  flex: 1;
  padding: 1rem 1rem 5.5rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

--- ui
div.app-shell
  header.app-header
    div.brand-group
      span.brand-logo 🫟
      h1.brand-title {pageTitle || t('appTitle')}
    div.header-actions
      button.action-btn type="button" @click=toggleLanguage title="Toggle Language"
        span {currentLang() === 'ar' ? 'English' : 'عربي'}
      button.action-btn type="button" @click=toggleTheme title="Toggle Theme"
        span {currentTheme() === 'dark' ? '☀️' : '🌙'}
  main.main-content
    slot
  BottomNav
