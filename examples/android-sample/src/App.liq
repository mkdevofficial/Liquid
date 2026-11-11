--- logic
import { signal, computed } from 'liquid';
import Header from './components/Header.liq';

const count = signal(0);
const double = computed(() => count() * 2);
const todos = signal([
  { id: 1, title: 'Write elegant UI in .liq', done: true },
  { id: 2, title: 'Embrace fine-grained signals', done: false }
]);
const newTodoTitle = signal('');
let nextTodoId = 3;

function addTodo() {
  const val = newTodoTitle().trim();
  if (!val) return;
  todos.set([...todos(), { id: nextTodoId++, title: val, done: false }]);
  newTodoTitle.set('');
}

function toggleTodo(id) {
  todos.set(todos().map(t => t.id === id ? { ...t, done: !t.done } : t));
}

function removeTodo(id) {
  todos.set(todos().filter(t => t.id !== id));
}

--- style
:global(body) {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
}
.app-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
.counter-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn:hover {
  background: #0369a1;
}
.input-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.input-text {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
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
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.done {
  text-decoration: line-through;
  color: #94a3b8;
}

--- ui
div.app-container
  Header title="Liquid App"
    span.badge Ready to build

  div.card
    h2 Counter
    div.counter-box
      button.btn @click=count.set(count() - 1) -
      span Count: {count()} (Double: {double()})
      button.btn @click=count.set(count() + 1) +

  div.card
    h2 Todo List
    div.input-row
      input.input-text placeholder="What needs doing?" $value={newTodoTitle} @keydown.enter=addTodo
      button.btn @click=addTodo Add
    ul.todo-list
      each todos() as item (item.id)
        li.todo-item
          span class="{item.done ? 'done' : ''}" @click=toggleTodo(item.id) {item.title}
          button.btn @click=removeTodo(item.id) ✕
