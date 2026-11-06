--- logic
const { icon = '🫟', title = 'No Data', description = '' } = defineProps();

--- style
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  margin: 1rem 0;
}
.empty-icon {
  font-size: 2.75rem;
  margin-bottom: 0.75rem;
  display: inline-block;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.06));
}
.empty-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
}
.empty-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 280px;
  margin: 0 auto 1.25rem auto;
  line-height: 1.4;
}
.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

--- ui
div.empty-state
  div.empty-icon {icon}
  h3.empty-title {title}
  if description
    p.empty-desc {description}
  div.empty-actions
    slot
