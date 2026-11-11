import { createStore } from 'liquid';
import { STRINGS } from './i18n.js';

export const arabicStore = createStore({
  lang: 'ar',
  newTitle: '',
  tasks: [
    { id: 1, title: STRINGS.ar.task1, done: true },
    { id: 2, title: STRINGS.ar.task2, done: true },
    { id: 3, title: STRINGS.ar.task3, done: false }
  ],

  getT() {
    return STRINGS[this.lang];
  },

  getDir() {
    return STRINGS[this.lang].dir;
  },

  getCompletedCount() {
    return this.tasks.filter(t => t.done).length;
  },

  toggleLanguage() {
    this.lang = this.lang === 'ar' ? 'en' : 'ar';
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dir = this.getDir();
      document.documentElement.lang = this.lang;
    }
  },

  addTask(title) {
    const text = (title || this.newTitle).trim();
    if (!text) return;
    this.tasks = [...this.tasks, { id: Date.now(), title: text, done: false }];
    this.newTitle = '';
  },

  toggleTask(id) {
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  },

  removeTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }
});
