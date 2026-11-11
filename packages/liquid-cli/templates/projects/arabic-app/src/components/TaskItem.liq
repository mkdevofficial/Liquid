--- logic
import { arabicStore } from '../store.js';
const { task } = defineProps();

function toggle() {
  arabicStore.toggleTask(task.id);
}

function remove() {
  arabicStore.removeTask(task.id);
}

--- style
.task-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background-color: #ffffff;
  border-radius: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.left-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.check-box {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border-width: 1px;
  border-color: #059669;
  background-color: #ecfdf5;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #059669;
  font-weight: 700;
}
.title-text {
  font-size: 14px;
  color: #0f172a;
}
.title-done {
  font-size: 14px;
  color: #94a3b8;
  text-decoration: line-through;
}
.del-btn {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

--- ui
div.task-row
  div.left-box @click=toggle
    button.check-box {task.done ? '✓' : ''}
    span class="{task.done ? 'title-done' : 'title-text'}" {task.title}
  button.del-btn @click=remove ✕
