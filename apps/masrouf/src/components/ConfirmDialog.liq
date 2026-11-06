--- logic
const { open = true, title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm = () => {}, onCancel = () => {} } = defineProps();

function handleConfirm() {
  if (typeof onConfirm === 'function') onConfirm();
}

function handleCancel() {
  if (typeof onCancel === 'function') onCancel();
}

--- style
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}
.dialog-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  max-width: 400px;
  width: 100%;
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.15s ease-out;
}
.dialog-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}
.dialog-body {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin-bottom: 1.5rem;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-cancel {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-cancel:hover {
  background: var(--bg-hover);
}
.btn-confirm {
  background: var(--primary);
  border: none;
  color: white;
  padding: 0.55rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-confirm:hover {
  background: var(--primary-hover);
}
.btn-danger {
  background: var(--danger);
}
.btn-danger:hover {
  background: #dc2626;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

--- ui
if open
  div.dialog-backdrop @click=handleCancel
    div.dialog-box @click.stop
      h3.dialog-title {title}
      div.dialog-body
        slot
      div.dialog-actions
        button.btn-cancel type="button" @click=handleCancel {cancelText}
        button.btn-confirm type="button" class={danger ? 'btn-danger' : ''} @click=handleConfirm {confirmText}
