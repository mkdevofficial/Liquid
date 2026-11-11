--- logic
import { expenseStore } from '../store.js';

function del(id) {
  expenseStore.removeExpense(id);
}

--- style
.list-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.list-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.expense-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
}
.item-left {
  display: flex;
  flex-direction: column;
}
.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.item-date {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.item-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.item-amt {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
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
div.list-card
  span.list-title Recent Expenses ({expenseStore.getFilteredExpenses().length})
  each expenseStore.getFilteredExpenses() as item (item.id)
    div.expense-item
      div.item-left
        span.item-title {item.title}
        span.item-date {item.date} • {item.category}
      div.item-right
        span.item-amt ${item.amount}
        button.del-btn @click=del(item.id) ✕
