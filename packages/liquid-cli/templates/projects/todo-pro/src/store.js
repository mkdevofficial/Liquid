import { createStore } from 'liquid';
import { loadData, saveData } from './utils/storage.js';

const STORAGE_KEY = 'liquid_todo_pro_items';

const initialItems = loadData(STORAGE_KEY, [
  { id: 1, title: 'Learn Liquid .liq component syntax', done: true, priority: 'high' },
  { id: 2, title: 'Verify native Android flex rendering', done: true, priority: 'medium' },
  { id: 3, title: 'Deploy cross-platform mobile app', done: false, priority: 'high' },
  { id: 4, title: 'Write comprehensive end-to-end tests', done: false, priority: 'low' }
]);

export const todoStore = createStore({
  todos: initialItems,
  filter: 'all', // all | active | completed
  searchQuery: '',
  newTitle: '',
  newPriority: 'medium',

  getTotalCount() {
    return this.todos.length;
  },

  getActiveCount() {
    return this.todos.filter(t => !t.done).length;
  },

  getCompletedCount() {
    return this.todos.filter(t => t.done).length;
  },

  getFilteredTodos() {
    return this.todos.filter(t => {
      const matchFilter = this.filter === 'all'
        ? true
        : this.filter === 'active' ? !t.done : t.done;
      const matchSearch = this.searchQuery
        ? t.title.toLowerCase().includes(this.searchQuery.toLowerCase().trim())
        : true;
      return matchFilter && matchSearch;
    });
  },

  addTodo(title, priority = 'medium') {
    const trimmed = (title || this.newTitle).trim();
    if (!trimmed) return;
    const item = {
      id: Date.now(),
      title: trimmed,
      done: false,
      priority: priority || this.newPriority
    };
    this.todos = [item, ...this.todos];
    this.newTitle = '';
    saveData(STORAGE_KEY, this.todos);
  },

  toggleTodo(id) {
    this.todos = this.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveData(STORAGE_KEY, this.todos);
  },

  removeTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    saveData(STORAGE_KEY, this.todos);
  },

  clearCompleted() {
    this.todos = this.todos.filter(t => !t.done);
    saveData(STORAGE_KEY, this.todos);
  },

  setFilter(f) {
    this.filter = f;
  },

  setSearch(q) {
    this.searchQuery = q;
  }
});
