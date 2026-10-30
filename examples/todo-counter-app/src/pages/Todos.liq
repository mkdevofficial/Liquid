--- logic
import { signal } from 'liquid';
import { globalStore } from '../store.js';
import Card from '../components/Card.liq';

const newTitle = signal('');

function submit() {
  const val = newTitle().trim();
  if (!val) return;
  globalStore.addTodo(val);
  newTitle.set('');
}

--- style
.todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.todo-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
}
.btn-add {
  background: #059669;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-add:hover {
  background: #047857;
}
.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.todo-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  flex: 1;
}
.todo-text {
  font-size: 1rem;
}
.done {
  text-decoration: line-through;
  color: #94a3b8;
}
.btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.btn-delete:hover {
  background: #fee2e2;
}
.empty-msg {
  color: #64748b;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

--- ui
div.todos-page
  Card title="Task Manager (Keyed Each Reconciliation)"
    div.todo-form
      input.todo-input placeholder="Add a new task..." $value={newTitle} @keydown.enter=submit
      button.btn-add @click=submit Add Task

    if globalStore.todos.length === 0
      p.empty-msg No tasks yet! Add one above.
    else
      ul.todo-list
        each globalStore.todos as todo, idx (todo.id)
          li.todo-item
            div.todo-content @click=globalStore.toggleTodo(todo.id)
              input type="checkbox" checked={todo.done}
              span.todo-text class="{todo.done ? 'done' : ''}" #{idx + 1}: {todo.title}
            button.btn-delete @click=globalStore.removeTodo(todo.id) ✕
