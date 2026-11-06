--- logic
import { signal } from 'liquid-runtime';

let count = signal(0);
let title = '🫟 Liquid Counter';

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}

function reset() {
  count.value = 0;
}
--- style
.counter-card {
  padding: 16px;
  border-radius: 8px;
  background: #1e1e2e;
  color: #cdd6f4;
  text-align: center;
}

.counter-value {
  font-size: 2rem;
  font-weight: bold;
  color: #89b4fa;
  margin: 12px 0;
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: center;
}

button {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #45475a;
  background: #313244;
  color: #cdd6f4;
  cursor: pointer;
}

button:hover {
  background: #45475a;
}
--- ui
<div class="counter-card">
  <h2>{title}</h2>
  <div class="counter-value">{count.value}</div>
  <div class="button-group">
    <button @click="decrement">-</button>
    <button @click="reset">Reset</button>
    <button @click="increment">+</button>
  </div>
</div>
