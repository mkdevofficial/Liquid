--- logic
import { currentPath, navigate } from '../router.js';
import { t } from '../store.js';

function goTo(path) {
  navigate(path);
}

const path = currentPath();

--- style
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-nav);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 0.5rem;
  z-index: 500;
  max-width: 480px;
  margin: 0 auto;
}
.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  flex: 1;
  height: 100%;
  padding: 0.35rem 0;
  transition: all 0.15s ease;
  user-select: none;
}
.nav-btn:hover {
  color: var(--primary);
}
.nav-btn.is-active {
  color: var(--primary);
}
.nav-icon {
  font-size: 1.25rem;
  line-height: 1.2;
}
.nav-label {
  font-size: 0.68rem;
  font-weight: 600;
  margin-top: 0.15rem;
}
.nav-btn-add {
  position: relative;
  top: -12px;
  background: var(--primary);
  color: white !important;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
  flex: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--bg-page);
}
.nav-btn-add:hover {
  transform: scale(1.05);
  background: var(--primary-hover);
}
.nav-btn-add .nav-icon {
  font-size: 1.5rem;
  line-height: 1;
}

--- ui
nav.bottom-nav
  button.nav-btn type="button" class={path === '/' ? 'is-active' : ''} @click=goTo('/')
    span.nav-icon 📊
    span.nav-label {t('dashboard')}
  button.nav-btn type="button" class={path === '/history' ? 'is-active' : ''} @click=goTo('/history')
    span.nav-icon 📑
    span.nav-label {t('history')}
  button.nav-btn.nav-btn-add type="button" @click=goTo('/transaction/new') title={t('addTransaction')}
    span.nav-icon ➕
  button.nav-btn type="button" class={path === '/settings' ? 'is-active' : ''} @click=goTo('/settings')
    span.nav-icon ⚙️
    span.nav-label {t('settings')}
