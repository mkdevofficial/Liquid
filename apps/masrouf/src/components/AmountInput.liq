--- logic
const { amount, currency = 'SAR', type = 'expense', error = '' } = defineProps();

--- style
.amount-container {
  margin-bottom: 1.25rem;
}
.amount-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: 14px;
  padding: 0.5rem 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.amount-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}
.amount-wrapper.is-income:focus-within {
  border-color: var(--success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}
.amount-wrapper.is-expense:focus-within {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
.amount-wrapper.has-error {
  border-color: var(--danger);
}
.currency-badge {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-inline-end: 0.75rem;
  user-select: none;
}
.amount-field {
  flex: 1;
  font-size: 1.75rem;
  font-weight: 700;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}
.error-message {
  display: block;
  font-size: 0.8rem;
  color: var(--danger);
  margin-top: 0.35rem;
  font-weight: 500;
}

--- ui
div.amount-container
  div.amount-wrapper class={error ? 'has-error' : (type === 'income' ? 'is-income' : 'is-expense')}
    span.currency-badge {currency}
    input.amount-field type="number" step="0.01" min="0" placeholder="0.00" $bind=amount
  if error
    span.error-message {error}
