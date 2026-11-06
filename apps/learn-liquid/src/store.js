import { signal, effect } from 'liquid';

// Load initial theme from localStorage or system preference
const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('liquid_docs_theme') : null;
const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
export const theme = signal(storedTheme || (prefersDark ? 'dark' : 'dark'));

// Load initial language from localStorage (default: 'ar')
const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('liquid_docs_lang') : null;
export const lang = signal(storedLang || 'ar');

// Toast notification message
export const toastMessage = signal(null);
let toastTimer = null;

export function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
    toastTimer = null;
  }, 2400);
}

export function copyToClipboard(text, successMsg = 'تم النسخ إلى الحافظة! ✓') {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(successMsg);
  } catch (err) {
    showToast('فشل النسخ!');
  }
}

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

export function toggleLang() {
  lang.value = lang.value === 'ar' ? 'en' : 'ar';
}

// Active chapter in the guide
export const activeChapter = signal('overview');

// Global search query
export const searchQuery = signal('');

// Synchronize DOM attributes with reactive state
if (typeof window !== 'undefined') {
  effect(() => {
    const currentTheme = theme.value;
    document.documentElement.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem('liquid_docs_theme', currentTheme);
    } catch {}
  });

  effect(() => {
    const currentLang = lang.value;
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    try {
      localStorage.setItem('liquid_docs_lang', currentLang);
    } catch {}
  });
}
