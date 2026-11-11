--- logic
import { signal, computed, batch } from 'liquid';

const count = signal(5);
const factor = signal(3);

const multiplied = computed(() => count() * factor());
const isEven = computed(() => multiplied() % 2 === 0);

function inc() {
  count.set(count() + 1);
}

function dec() {
  count.set(count() - 1);
}

function resetAll() {
  batch(() => {
    count.set(1);
    factor.set(2);
  });
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
}
.header {
  background-color: #0f172a;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 12px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}
.val-text {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.computed-box {
  background-color: #f0fdf4;
  padding: 12px;
  border-radius: 8px;
  margin-top: 10px;
}
.comp-label {
  font-size: 14px;
  font-weight: 700;
  color: #166534;
}

--- ui
div.container
  header.header
    span.title 🫟 02 — Signals & Computed

  div.card
    span.card-title Reactive Signals
    div.row
      button.btn @click=dec -
      span.val-text Base Count: {count()}
      button.btn @click=inc +
      button.btn @click=resetAll Reset (Batch)

  div.card
    span.card-title Computed Derived State
    div.computed-box
      span.comp-label Result: {count()} × {factor()} = {multiplied()} ({isEven() ? 'Even' : 'Odd'})
