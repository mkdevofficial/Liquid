import test from 'node:test';
import assert from 'node:assert/strict';
import { theme, lang, toggleTheme, toggleLang, showToast, toastMessage } from '../src/store.js';
import { t } from '../src/i18n.js';

test('store: toggleLang switches between Arabic and English', () => {
  lang.value = 'ar';
  assert.strictEqual(lang.value, 'ar');
  assert.strictEqual(t('navHome'), 'الرئيسية');

  toggleLang();
  assert.strictEqual(lang.value, 'en');
  assert.strictEqual(t('navHome'), 'Home');

  toggleLang();
  assert.strictEqual(lang.value, 'ar');
  assert.strictEqual(t('navHome'), 'الرئيسية');
});

test('store: toggleTheme switches between dark and light modes', () => {
  theme.value = 'dark';
  assert.strictEqual(theme.value, 'dark');

  toggleTheme();
  assert.strictEqual(theme.value, 'light');

  toggleTheme();
  assert.strictEqual(theme.value, 'dark');
});

test('store: showToast sets and clears toast notification', (t, done) => {
  showToast('اختبار الإشعار');
  assert.strictEqual(toastMessage.value, 'اختبار الإشعار');
  done();
});

test('i18n: translation keys exist for both languages', () => {
  lang.value = 'ar';
  assert.ok(t('siteTitle').includes('Liquid'));
  assert.ok(t('heroTitle').length > 10);
  assert.ok(t('threeStepTitle').length > 5);

  lang.value = 'en';
  assert.ok(t('siteTitle').includes('Liquid'));
  assert.ok(t('heroTitle').includes('Build Complete'));
  assert.ok(t('threeStepTitle').includes('Build Your First Site'));

  // Reset back to Arabic
  lang.value = 'ar';
});
