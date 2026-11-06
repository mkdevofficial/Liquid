--- logic
const { title = '', subtitle = '', badge = '', badgeType = 'default' } = defineProps();

--- style
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}
.title-group {
  flex: 1;
}
.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.card-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.2rem 0 0 0;
}
.card-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  background: var(--bg-badge);
  color: var(--text-badge);
}
.badge-income {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.badge-expense {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.card-body {
  position: relative;
}

--- ui
div.card
  if title
    div.card-header
      div.title-group
        h2.card-title {title}
        if subtitle
          p.card-subtitle {subtitle}
      if badge
        span.card-badge class={badgeType === 'income' ? 'badge-income' : (badgeType === 'expense' ? 'badge-expense' : '')} {badge}
  div.card-body
    slot
