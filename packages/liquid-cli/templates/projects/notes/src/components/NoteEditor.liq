--- logic
import { notesStore } from '../store.js';

function handleTitle(e) {
  const note = notesStore.getSelectedNote();
  if (note) {
    notesStore.updateNote(note.id, e.target ? e.target.value : e, note.tag, note.body);
  }
}

function handleBody(e) {
  const note = notesStore.getSelectedNote();
  if (note) {
    notesStore.updateNote(note.id, note.title, note.tag, e.target ? e.target.value : e);
  }
}

function handleTag(t) {
  const note = notesStore.getSelectedNote();
  if (note) {
    notesStore.updateNote(note.id, note.title, t, note.body);
  }
}

--- style
.editor-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.title-input {
  font-size: 16px;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  color: #0f172a;
  background-color: #ffffff;
}
.tag-selector {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 10px;
}
.tag-opt {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.tag-opt-active {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}
.body-input {
  font-size: 14px;
  padding: 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  color: #0f172a;
  background-color: #ffffff;
  min-height: 120px;
}
.empty-placeholder {
  font-size: 14px;
  color: #94a3b8;
  padding: 24px;
  text-align: center;
}

--- ui
div.editor-card
  if notesStore.getSelectedNote()
    input.title-input value="{notesStore.getSelectedNote().title}" placeholder="Note title..." @input=handleTitle
    div.tag-selector
      button class="{notesStore.getSelectedNote().tag === 'Work' ? 'tag-opt-active' : 'tag-opt'}" @click=handleTag('Work') Work
      button class="{notesStore.getSelectedNote().tag === 'Personal' ? 'tag-opt-active' : 'tag-opt'}" @click=handleTag('Personal') Personal
      button class="{notesStore.getSelectedNote().tag === 'Ideas' ? 'tag-opt-active' : 'tag-opt'}" @click=handleTag('Ideas') Ideas
    textarea.body-input placeholder="Write your note here..." @input=handleBody {notesStore.getSelectedNote().body}
  else
    span.empty-placeholder Select or create a note to begin editing
