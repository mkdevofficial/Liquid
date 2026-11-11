import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todoStore } from '../src/store.js';

test('Todo Pro Template - manages tasks, priorities, filters and counts', () => {
  const initialTotal = todoStore.getTotalCount();
  assert.ok(initialTotal >= 4);

  // Add new task
  todoStore.addTodo('Test newly created task', 'high');
  assert.equal(todoStore.getTotalCount(), initialTotal + 1);
  const created = todoStore.todos[0];
  assert.equal(created.title, 'Test newly created task');
  assert.equal(created.priority, 'high');
  assert.equal(created.done, false);

  // Toggle task
  todoStore.toggleTodo(created.id);
  assert.equal(todoStore.todos[0].done, true);

  // Test filter
  todoStore.setFilter('completed');
  assert.ok(todoStore.getFilteredTodos().every(t => t.done));

  todoStore.setFilter('active');
  assert.ok(todoStore.getFilteredTodos().every(t => !t.done));

  // Search filter
  todoStore.setFilter('all');
  todoStore.setSearch('newly created');
  assert.equal(todoStore.getFilteredTodos().length, 1);
  assert.equal(todoStore.getFilteredTodos()[0].id, created.id);

  // Clean up
  todoStore.removeTodo(created.id);
  assert.equal(todoStore.getTotalCount(), initialTotal);
  todoStore.setSearch('');
});
