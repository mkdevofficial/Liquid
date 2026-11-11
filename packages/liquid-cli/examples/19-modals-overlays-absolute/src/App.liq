--- logic
import { signal } from 'liquid';

const isModalOpen = signal(false);
const toastMessage = signal('');
let toastTimer = null;

function showModal() {
  isModalOpen.set(true);
}

function closeModal() {
  isModalOpen.set(false);
}

function triggerToast(msg) {
  toastMessage.set(msg);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.set('');
  }, 2500);
}

function confirmAction() {
  isModalOpen.set(false);
  triggerToast('Action successfully executed!');
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
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
  padding: 18px;
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
.btn-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.btn-alt {
  background-color: #f1f5f9;
  color: #475569;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.modal-scrim {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.65);
  justify-content: center;
  align-items: center;
  padding: 24px;
}
.modal-window {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 22px;
  width: 100%;
  max-width: 320px;
}
.modal-title {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
}
.modal-body {
  font-size: 14px;
  color: #64748b;
  margin-top: 8px;
  margin-bottom: 18px;
  line-height: 20px;
}
.toast-bar {
  position: absolute;
  bottom: 24px;
  left: 20px;
  right: 20px;
  background-color: #0f172a;
  padding: 12px 18px;
  border-radius: 8px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
.toast-text {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

--- ui
div.container
  header.header
    span.title 🫟 19 — Modals & Absolute Overlays

  div.card
    span.card-title Trigger Dialogs & Notifications
    div.btn-row
      button.btn @click=showModal Open Modal Dialog
      button.btn-alt @click=triggerToast('Quick toast notification!') Trigger Toast

  if isModalOpen()
    div.modal-scrim
      div.modal-window
        span.modal-title Important Notice
        span.modal-body Liquid supports full screen scrim overlays and floating dialogs using standard position: absolute.
        div.btn-row
          button.btn-alt @click=closeModal Cancel
          button.btn @click=confirmAction Confirm

  if toastMessage()
    div.toast-bar
      span.toast-text {toastMessage()}
