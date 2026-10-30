import { createStore } from 'liquid';

export const globalStore = createStore({
  appName: 'Liquid 🫟 Showcase',
  globalCount: 42,
  todos: [
    { id: 1, title: 'Learn the .liq indentation syntax', done: true },
    { id: 2, title: 'Experiment with fine-grained signals', done: true },
    { id: 3, title: 'Deploy tiny < 5 KB bundle to production', done: false }
  ],

  incrementGlobal() {
    this.globalCount++;
  },

  decrementGlobal() {
    this.globalCount--;
  },

  addTodo(title) {
    if (!title.trim()) return;
    this.todos = [
      ...this.todos,
      { id: Date.now(), title: title.trim(), done: false }
    ];
  },

  toggleTodo(id) {
    this.todos = this.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  },

  removeTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
  }
});
