--- logic
import { signal, computed } from 'liquid';
import { globalStore } from '../store.js';
import Card from '../components/Card.liq';

const localCount = signal(0);
const quadruple = computed(() => localCount() * 4);

function inc() {
  localCount.set(localCount() + 1);
}

function dec() {
  localCount.set(localCount() - 1);
}

function reset() {
  localCount.set(0);
}

--- style
.counter-grid {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1.5rem 0;
}
.btn {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn:hover {
  background: #0369a1;
}
.btn-secondary {
  background: #64748b;
}
.btn-secondary:hover {
  background: #475569;
}
.badge {
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
}
.value-display {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}
.info-box {
  background: #f8fafc;
  border-left: 4px solid #38bdf8;
  padding: 0.75rem 1rem;
  margin-top: 1rem;
  border-radius: 4px;
}

--- ui
div.home-page
  Card title="Fine-Grained Signal Counter"
    p Local and shared reactive state with computed values.

    div.counter-grid
      button.btn @click=dec -
      span.value-display {localCount()}
      button.btn @click=inc +
      button.btn.btn-secondary @click=reset Reset

    div.info-box
      p Quadruple (computed): {quadruple()}
      if localCount() % 2 === 0
        span.badge Even Number
      else
        span.badge Odd Number

  Card title="Shared Store State"
    p This state is shared across all routes and components.
    div.counter-grid
      button.btn @click=globalStore.decrementGlobal() -
      span.value-display {globalStore.globalCount}
      button.btn @click=globalStore.incrementGlobal() +
