import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arabicStore } from '../src/store.js';

test('Arabic App Template - toggles language, verifies RTL direction and manages daily tasks', () => {
  assert.equal(arabicStore.lang, 'ar');
  assert.equal(arabicStore.getDir(), 'rtl');
  assert.equal(arabicStore.getT().lang, 'ar');
  assert.equal(arabicStore.getCompletedCount(), 2);

  // Switch to English
  arabicStore.toggleLanguage();
  assert.equal(arabicStore.lang, 'en');
  assert.equal(arabicStore.getDir(), 'ltr');
  assert.equal(arabicStore.getT().lang, 'en');
  assert.equal(arabicStore.getT().switchLang, 'العربية');

  // Switch back to Arabic
  arabicStore.toggleLanguage();
  assert.equal(arabicStore.lang, 'ar');
  assert.equal(arabicStore.getDir(), 'rtl');

  // Add Arabic task
  const initialCount = arabicStore.tasks.length;
  arabicStore.addTask('مراجعة توثيق ليكويد النهائي');
  assert.equal(arabicStore.tasks.length, initialCount + 1);
  const created = arabicStore.tasks[arabicStore.tasks.length - 1];
  assert.equal(created.title, 'مراجعة توثيق ليكويد النهائي');
  assert.equal(created.done, false);

  // Toggle & delete
  arabicStore.toggleTask(created.id);
  const toggled = arabicStore.tasks.find(t => t.id === created.id);
  assert.equal(toggled.done, true);
  arabicStore.removeTask(created.id);
  assert.equal(arabicStore.tasks.length, initialCount);
});
