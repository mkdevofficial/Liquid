--- logic
import { signal } from 'liquid';
import { getStoredItem, setStoredItem } from './storage.js';

const KEY = 'liquid_example_notes';
const savedNote = signal(getStoredItem(KEY, 'Persistent notes saved across app reloads.'));
const draft = signal(savedNote());

function handleInput(e) {
  draft.set(e.target ? e.target.value : e);
}

function save() {
  savedNote.set(draft());
  setStoredItem(KEY, draft());
}

function clear() {
  draft.set('');
  savedNote.set('');
  setStoredItem(KEY, '');
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
}
.header {
  background-color: #0f172a;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 14px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.text-area {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
  min-height: 80px;
  margin-bottom: 12px;
}
.btn-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.btn-alt {
  background-color: #f1f5f9;
  color: #475569;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.preview-box {
  background-color: #f0fdf4;
  padding: 12px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #bbf7d0;
}
.preview-text {
  font-size: 13px;
  color: #14532d;
  line-height: 18px;
}

--- ui
div.container
  header.header
    span.title 🫟 12 — Cross-Platform Persistence

  div.card
    span.card-title Offline Storage Buffer
    textarea.text-area value="{draft()}" placeholder="Write something to persist..." @input=handleInput
    div.btn-row
      button.btn @click=save Save to Storage
      button.btn-alt @click=clear Clear Storage

  div.card
    span.card-title Persisted Data Value
    div.preview-box
      span.preview-text {savedNote() || '(Empty storage)'}
