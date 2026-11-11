--- logic
import { expenseStore } from '../store.js';

--- style
.chart-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.chart-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}
.cat-bar-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}
.bar-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.cat-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.cat-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.amount-text {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.track-bg {
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}
.fill-bar {
  height: 8px;
  border-radius: 9999px;
}

--- ui
div.chart-card
  span.chart-title Spending by Category
  each expenseStore.getCategoryBreakdown() as cat (cat.id)
    div.cat-bar-item
      div.bar-header
        div.cat-label
          span {cat.icon}
          span.cat-name {cat.id}
        span.amount-text ${cat.amount} ({cat.percentage}%)
      div.track-bg
        div.fill-bar style="width: {cat.percentage}%; background-color: {cat.color}"
