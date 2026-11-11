--- logic
import { todoStore } from './store.js';
import Header from './components/Header.liq';
import FilterBar from './components/FilterBar.liq';
import TodoItem from './components/TodoItem.liq';
import EmptyState from './components/EmptyState.liq';

function handleAdd() {
  todoStore.addTodo();
}

function handleSearch(e) {
  todoStore.setSearch(e.target ? e.target.value : e);
}

function handleTitleInput(e) {
  todoStore.newTitle = e.target ? e.target.value : e;
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.input-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 14px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.search-input {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.add-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 10px;
}
.add-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.add-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}
.todo-feed {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}
.footer-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 8px;
}
.clear-btn {
  background-color: #f1f5f9;
  color: #64748b;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

--- ui
div.container
  Header

  div.input-card
    input.search-input placeholder="🔍 Search tasks..." @input=handleSearch
    div.add-row
      input.add-input placeholder="What needs to be done?" @input=handleTitleInput @keydown.enter=handleAdd
      button.add-btn @click=handleAdd Add

  FilterBar

  div.todo-feed
    if todoStore.getFilteredTodos().length === 0
      EmptyState message="No tasks match your criteria"
    else
      each todoStore.getFilteredTodos() as item (item.id)
        TodoItem todo={item}

  if todoStore.getCompletedCount() > 0
    div.footer-row
      button.clear-btn @click=todoStore.clearCompleted Clear Completed ({todoStore.getCompletedCount()})
