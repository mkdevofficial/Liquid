import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notesStore } from '../src/store.js';

test('Notes Template - creates, edits, tags, searches, and deletes notes', () => {
  const initialCount = notesStore.notes.length;
  assert.ok(initialCount >= 3);

  // Create note
  notesStore.createNote();
  assert.equal(notesStore.notes.length, initialCount + 1);
  const created = notesStore.notes[0];
  assert.equal(created.title, 'Untitled Note');

  // Update note
  notesStore.updateNote(created.id, 'My Custom Plan', 'Work', 'Finish all 8 templates');
  const updated = notesStore.notes.find(n => n.id === created.id);
  assert.equal(updated.title, 'My Custom Plan');
  assert.equal(updated.tag, 'Work');
  assert.equal(updated.body, 'Finish all 8 templates');

  // Filter by tag
  notesStore.setTag('Work');
  assert.ok(notesStore.getFilteredNotes().some(n => n.id === created.id));
  notesStore.setTag('Personal');
  assert.ok(!notesStore.getFilteredNotes().some(n => n.id === created.id));

  // Search
  notesStore.setTag('All');
  notesStore.setSearch('Custom Plan');
  assert.equal(notesStore.getFilteredNotes().length, 1);
  assert.equal(notesStore.getFilteredNotes()[0].id, created.id);

  // Delete flow
  notesStore.promptDelete(created.id);
  assert.equal(notesStore.deleteTargetId, created.id);
  notesStore.confirmDelete();
  assert.equal(notesStore.deleteTargetId, null);
  assert.equal(notesStore.notes.length, initialCount);
  notesStore.setSearch('');
});
