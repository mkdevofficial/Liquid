--- logic
import { notesStore } from '../store.js';

function handleNew() {
  notesStore.createNote();
}

--- style
.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #0f172a;
  border-radius: 12px;
}
.brand {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.new-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

--- ui
header.header
  span.brand 📝 Notes
  button.new-btn @click=handleNew + New Note
