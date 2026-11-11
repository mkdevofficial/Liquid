--- logic
import { notesStore } from '../store.js';

function handleConfirm() {
  notesStore.confirmDelete();
}

function handleCancel() {
  notesStore.cancelDelete();
}

--- style
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.6);
  justify-content: center;
  align-items: center;
  padding: 24px;
}
.dialog {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 340px;
}
.dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.dialog-msg {
  font-size: 14px;
  color: #64748b;
  margin-top: 8px;
  margin-bottom: 16px;
}
.btn-row {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 10px;
}
.cancel-btn {
  padding: 8px 14px;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
}
.del-btn {
  padding: 8px 14px;
  background-color: #ef4444;
  color: #ffffff;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
}

--- ui
if notesStore.deleteTargetId !== null
  div.overlay
    div.dialog
      span.dialog-title Delete Note?
      span.dialog-msg Are you sure you want to permanently delete this note?
      div.btn-row
        button.cancel-btn @click=handleCancel Cancel
        button.del-btn @click=handleConfirm Delete
