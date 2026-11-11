--- logic
import { expenseStore, CATEGORIES } from '../store.js';

let titleVal = '';
let amountVal = '';
let selectedCat = 'Food';
let errorMsg = '';

function handleTitle(e) {
  titleVal = e.target ? e.target.value : e;
}

function handleAmount(e) {
  amountVal = e.target ? e.target.value : e;
}

function handleCat(c) {
  selectedCat = c;
}

function add() {
  if (!titleVal.trim() || !amountVal || isNaN(parseFloat(amountVal))) {
    errorMsg = 'Please enter a valid expense title and amount.';
    return;
  }
  const success = expenseStore.addExpense(titleVal, amountVal, selectedCat);
  if (success) {
    titleVal = '';
    amountVal = '';
    errorMsg = '';
  }
}

--- style
.form-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.form-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.input-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.title-input {
  flex: 2;
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.amount-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.cat-picker {
  display: flex;
  flex-direction: row;
  gap: 6px;
  margin-top: 10px;
  margin-bottom: 10px;
}
.cat-opt {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.cat-opt-active {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}
.add-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
}
.err-text {
  font-size: 12px;
  color: #dc2626;
  margin-bottom: 8px;
  font-weight: 600;
}

--- ui
div.form-card
  span.form-title Add New Expense
  if errorMsg
    span.err-text {errorMsg}
  div.input-row
    input.title-input placeholder="Expense name (e.g. Lunch)" @input=handleTitle
    input.amount-input placeholder="$ Amount" @input=handleAmount
  div.cat-picker
    each CATEGORIES as cat (cat.id)
      button class="{selectedCat === cat.id ? 'cat-opt-active' : 'cat-opt'}" @click=handleCat(cat.id) {cat.icon} {cat.id}
  button.add-btn @click=add + Add Expense
