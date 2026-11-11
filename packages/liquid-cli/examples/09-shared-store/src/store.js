import { createStore } from 'liquid';

export const appStore = createStore({
  counter: 10,
  user: 'Liquid Hacker',
  theme: 'dark',

  getCounter() {
    return this.counter;
  },

  getDouble() {
    return this.counter * 2;
  },

  increment() {
    this.counter++;
  },

  decrement() {
    this.counter--;
  },

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
  }
});
