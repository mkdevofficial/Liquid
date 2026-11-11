--- logic
import { expenseStore, CATEGORIES } from './store.js';
import Header from './components/Header.liq';
import SummaryCard from './components/SummaryCard.liq';
import BarChart from './components/BarChart.liq';
import ExpenseForm from './components/ExpenseForm.liq';
import ExpenseList from './components/ExpenseList.liq';

function filterCat(c) {
  expenseStore.setCategoryFilter(c);
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.filter-row {
  display: flex;
  flex-direction: row;
  gap: 6px;
  margin-top: 14px;
}
.filter-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.filter-btn-active {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}

--- ui
div.container
  Header

  SummaryCard

  BarChart

  ExpenseForm

  div.filter-row
    button class="{expenseStore.selectedCategory === 'All' ? 'filter-btn-active' : 'filter-btn'}" @click=filterCat('All') All
    each CATEGORIES as cat (cat.id)
      button class="{expenseStore.selectedCategory === cat.id ? 'filter-btn-active' : 'filter-btn'}" @click=filterCat(cat.id) {cat.id}

  ExpenseList
