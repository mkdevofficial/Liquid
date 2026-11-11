--- logic
import { todoStore } from '../store.js';

function setAll() {
  todoStore.setFilter('all');
}
function setActive() {
  todoStore.setFilter('active');
}
function setCompleted() {
  todoStore.setFilter('completed');
}

--- style
.filter-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 12px;
}
.filter-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.filter-btn-active {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}

--- ui
div.filter-row
  button class="{todoStore.filter === 'all' ? 'filter-btn-active' : 'filter-btn'}" @click=setAll All ({todoStore.getTotalCount()})
  button class="{todoStore.filter === 'active' ? 'filter-btn-active' : 'filter-btn'}" @click=setActive Active ({todoStore.getActiveCount()})
  button class="{todoStore.filter === 'completed' ? 'filter-btn-active' : 'filter-btn'}" @click=setCompleted Done ({todoStore.getCompletedCount()})
