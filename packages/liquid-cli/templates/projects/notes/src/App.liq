--- logic
import { notesStore } from './store.js';
import Header from './components/Header.liq';
import NoteList from './components/NoteList.liq';
import NoteEditor from './components/NoteEditor.liq';
import ConfirmDialog from './components/ConfirmDialog.liq';

function handleSearch(e) {
  notesStore.setSearch(e.target ? e.target.value : e);
}

function setTag(t) {
  notesStore.setTag(t);
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.search-bar {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
  margin-top: 14px;
}
.tags-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 12px;
}
.tag-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.tag-btn-active {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}

--- ui
div.container
  Header

  input.search-bar placeholder="🔍 Search notes..." @input=handleSearch

  div.tags-row
    button class="{notesStore.activeTag === 'All' ? 'tag-btn-active' : 'tag-btn'}" @click=setTag('All') All
    button class="{notesStore.activeTag === 'Work' ? 'tag-btn-active' : 'tag-btn'}" @click=setTag('Work') Work
    button class="{notesStore.activeTag === 'Personal' ? 'tag-btn-active' : 'tag-btn'}" @click=setTag('Personal') Personal
    button class="{notesStore.activeTag === 'Ideas' ? 'tag-btn-active' : 'tag-btn'}" @click=setTag('Ideas') Ideas

  NoteList

  NoteEditor

  ConfirmDialog
