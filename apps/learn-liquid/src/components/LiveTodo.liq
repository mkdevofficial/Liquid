--- logic
import { signal, computed } from 'liquid';

let nextId = 3;
const inputVal = signal('');
const todos = signal([
  { id: 1, text: 'إنشاء مشروع Liquid جديد', done: true },
  { id: 2, text: 'تعلم استخدام الإشارات والدوال المحسوبة', done: false }
]);

const remaining = computed(() => todos.value.filter(t => !t.done).length);

function addTodo() {
  const text = inputVal.value.trim();
  if (!text) return;
  todos.value = [...todos.value, { id: nextId++, text, done: false }];
  inputVal.value = '';
}

function toggleTodo(id) {
  todos.value = todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
}

function deleteTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id);
}

--- style
.todo-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  max-width: 480px;
  margin: 0 auto;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.todo-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.todo-badge {
  font-size: 0.75rem;
  background: var(--primary-glow);
  color: var(--primary);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-weight: 700;
}

.todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.todo-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.todo-input:focus {
  border-color: var(--primary);
}

.add-btn {
  background: var(--primary);
  color: white;
  border: none;
  font-weight: 700;
  padding: 0.65rem 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.add-btn:hover {
  background: var(--primary-hover);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  background: var(--bg-input);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.15s ease;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  flex: 1;
}

.todo-check {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.todo-text {
  font-size: 0.92rem;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.todo-text.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.del-btn {
  background: transparent;
  border: none;
  color: var(--danger);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 0.9rem;
  border-radius: 4px;
}

.del-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.empty-notice {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

--- ui
div.todo-box
  div.todo-header
    h3.todo-title قائمة المهام التفاعلية
    span.todo-badge {remaining()} متبقية

  div.todo-form
    input.todo-input type="text" placeholder="اكتب مهمة جديدة واضغط Enter..." $bind=inputVal @keydown.enter=addTodo
    button.add-btn type="button" @click=addTodo إضافة

  div.todo-list
    if todos.value.length === 0
      div.empty-notice 🎉 أحسنت! اكتملت جميع المهام بنجاح.
    else
      each (todos.value as item (item.id))
        div.todo-item
          div.todo-content @click=toggleTodo(item.id)
            input.todo-check type="checkbox" checked={item.done}
            span.todo-text class={item.done ? 'done' : ''} {item.text}
          button.del-btn type="button" @click=deleteTodo(item.id) title="حذف" ✕
