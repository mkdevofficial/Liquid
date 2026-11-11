--- logic
import { expenseStore } from '../store.js';

--- style
.summary-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 18px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.stat-col {
  display: flex;
  flex-direction: column;
}
.label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.val-spent {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}
.val-budget {
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
}
.val-remaining {
  font-size: 15px;
  font-weight: 700;
  color: #059669;
}
.progress-bg {
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 9999px;
  margin-top: 14px;
  overflow: hidden;
}
.progress-bar {
  height: 8px;
  background-color: #0284c7;
  border-radius: 9999px;
}
.progress-meta {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 6px;
}
.pct-text {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

--- ui
div.summary-card
  div.row
    div.stat-col
      span.label Total Spent
      span.val-spent ${expenseStore.getTotalSpent()}
    div.stat-col
      span.label Monthly Budget
      span.val-budget ${expenseStore.monthlyBudget}
    div.stat-col
      span.label Remaining
      span.val-remaining ${expenseStore.getRemainingBudget()}

  div.progress-bg
    div.progress-bar style="width: {expenseStore.getBudgetPercentage()}%"

  div.progress-meta
    span.pct-text {expenseStore.getBudgetPercentage()}% of budget used
    span.pct-text ${expenseStore.monthlyBudget - expenseStore.getTotalSpent()} left
