--- logic
import { signal, computed } from 'liquid';

const income = signal(5000);
const rent = signal(1500);
const food = signal(800);
const utilities = signal(400);

const totalExpenses = computed(() => Number(rent.value) + Number(food.value) + Number(utilities.value));
const savings = computed(() => Number(income.value) - totalExpenses());
const savingsRate = computed(() => {
  const inc = Number(income.value);
  if (inc <= 0) return 0;
  return Math.max(0, Math.round((savings() / inc) * 100));
});

--- style
.calc-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  max-width: 480px;
  margin: 0 auto;
}

.calc-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0 0 1rem;
  color: var(--text-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calc-rate {
  font-size: 0.8rem;
  background: var(--primary-glow);
  color: var(--primary);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 700;
}

.calc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.calc-input {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  outline: none;
}

.calc-input:focus {
  border-color: var(--primary);
}

.calc-summary {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-bottom: 1rem;
}

.sum-item {
  display: flex;
  flex-direction: column;
}

.sum-lbl {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
}

.sum-val {
  font-size: 1.2rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 0.2rem;
}

.sum-val.sav {
  color: var(--success);
}

.sum-val.exp {
  color: var(--danger);
}

.bar-track {
  width: 100%;
  height: 10px;
  background: var(--border-color);
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #0284c7);
  transition: width 0.2s ease;
}

--- ui
div.calc-box
  div.calc-title
    span حاسبة الميزانية الفورية
    span.calc-rate نسبة الادخار: {savingsRate()}%

  div.calc-grid
    div.input-group
      span.input-label الدخل الشهري ($)
      input.calc-input type="number" $bind=income
    div.input-group
      span.input-label الإيجار ($)
      input.calc-input type="number" $bind=rent
    div.input-group
      span.input-label الطعام والتموين ($)
      input.calc-input type="number" $bind=food
    div.input-group
      span.input-label الفواتير والخدمات ($)
      input.calc-input type="number" $bind=utilities

  div.calc-summary
    div.sum-item
      span.sum-lbl إجمالي النفقات
      span.sum-val.exp {'$' + totalExpenses()}
    div.sum-item
      span.sum-lbl المتبقي (الادخار)
      span.sum-val.sav {'$' + savings()}

  div.bar-track
    div.bar-fill style={`width: ${Math.min(100, savingsRate())}%;`}
