--- logic
import { notesStore } from '../store.js';

function select(id) {
  notesStore.selectNote(id);
}

function del(e, id) {
  notesStore.promptDelete(id);
}

--- style
.item {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  background-color: #ffffff;
  border-radius: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.item-active {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  background-color: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: #0284c7;
}
.top-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.tag-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #e2e8f0;
  color: #334155;
}
.preview {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  line-height: 18px;
}
.del-btn {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

--- ui
div.notes-list
  each notesStore.getFilteredNotes() as item (item.id)
    div class="{item.id === notesStore.selectedId ? 'item-active' : 'item'}" @click=select(item.id)
      div.top-row
        span.title {item.title}
        div.top-row
          span.tag-badge {item.tag}
          button.del-btn @click=del($event, item.id) ✕
      span.preview {item.body.slice(0, 60)}{item.body.length > 60 ? '...' : ''}
