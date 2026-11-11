import { createStore } from 'liquid';
import { loadData, saveData } from './utils/storage.js';

const STORAGE_KEY = 'liquid_notes_data';

const initialNotes = loadData(STORAGE_KEY, [
  {
    id: 1,
    title: 'Architecture Overview',
    tag: 'Work',
    body: 'Liquid uses pure JS signals for fine-grained reactivity and QuickJS on Android for 1:1 parity without WebView.',
    updatedAt: '2026-11-10'
  },
  {
    id: 2,
    title: 'Weekend Project Ideas',
    tag: 'Ideas',
    body: 'Build a weather dashboard with open-meteo API and a real-time chat demo using websockets.',
    updatedAt: '2026-11-09'
  },
  {
    id: 3,
    title: 'Grocery Checklist',
    tag: 'Personal',
    body: 'Apples, almond milk, coffee beans, dark chocolate, and sourdough bread.',
    updatedAt: '2026-11-08'
  }
]);

export const notesStore = createStore({
  notes: initialNotes,
  selectedId: 1,
  activeTag: 'All', // All | Work | Personal | Ideas
  searchQuery: '',
  isEditing: false,
  deleteTargetId: null,

  getSelectedNote() {
    return this.notes.find(n => n.id === this.selectedId) || this.notes[0] || null;
  },

  getFilteredNotes() {
    return this.notes.filter(n => {
      const matchTag = this.activeTag === 'All' ? true : n.tag === this.activeTag;
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = q
        ? n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
        : true;
      return matchTag && matchSearch;
    });
  },

  selectNote(id) {
    this.selectedId = id;
    this.isEditing = false;
  },

  createNote() {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      tag: this.activeTag === 'All' ? 'Ideas' : this.activeTag,
      body: '',
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    this.notes = [newNote, ...this.notes];
    this.selectedId = newNote.id;
    this.isEditing = true;
    saveData(STORAGE_KEY, this.notes);
  },

  updateNote(id, title, tag, body) {
    this.notes = this.notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          title: title !== undefined ? title : n.title,
          tag: tag !== undefined ? tag : n.tag,
          body: body !== undefined ? body : n.body,
          updatedAt: new Date().toISOString().slice(0, 10)
        };
      }
      return n;
    });
    saveData(STORAGE_KEY, this.notes);
  },

  promptDelete(id) {
    this.deleteTargetId = id;
  },

  confirmDelete() {
    if (!this.deleteTargetId) return;
    this.notes = this.notes.filter(n => n.id !== this.deleteTargetId);
    if (this.selectedId === this.deleteTargetId) {
      this.selectedId = this.notes.length > 0 ? this.notes[0].id : null;
    }
    this.deleteTargetId = null;
    this.isEditing = false;
    saveData(STORAGE_KEY, this.notes);
  },

  cancelDelete() {
    this.deleteTargetId = null;
  },

  setTag(t) {
    this.activeTag = t;
  },

  setSearch(q) {
    this.searchQuery = q;
  }
});
