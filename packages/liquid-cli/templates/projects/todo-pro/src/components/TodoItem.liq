--- logic
import { todoStore } from '../store.js';
const { todo } = defineProps();

function toggle() {
  todoStore.toggleTodo(todo.id);
}

function remove() {
  todoStore.removeTodo(todo.id);
}

--- style
.item-row {
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
  gap: 10px;
  flex: 1;
}
.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border-width: 1px;
  border-color: #0284c7;
  align-items: center;
  justify-content: center;
  background-color: #f0f9ff;
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
.priority-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
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
div.item-row
  div.left-box @click=toggle
    button.checkbox {todo.done ? '✓' : ''}
    span class="{todo.done ? 'title-done' : 'title-text'}" {todo.title}
    span.priority-tag {todo.priority}
  button.del-btn @click=remove ✕
