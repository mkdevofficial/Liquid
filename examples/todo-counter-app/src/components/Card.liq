--- logic
const { title = '' } = defineProps();

--- style
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}
.card-header {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e293b;
  font-size: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.5rem;
}

--- ui
div.card
  if title
    h2.card-header {title}
  slot
