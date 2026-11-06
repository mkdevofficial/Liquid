--- logic
import { currentLang, getCategoryName } from '../store.js';

const { categories = [], selected = '', type = 'expense', onSelect = () => {} } = defineProps();

function selectCat(id) {
  if (typeof onSelect === 'function') {
    onSelect(id);
  }
}

--- style
.category-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.65rem;
  margin: 0.75rem 0 1.25rem 0;
}
.cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 0.35rem;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.cat-chip:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}
.cat-chip.is-selected {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 0 0 2px var(--primary);
}
.cat-chip-icon {
  font-size: 1.5rem;
  margin-bottom: 0.35rem;
}
.cat-chip-name {
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.cat-chip.is-selected .cat-chip-name {
  color: var(--primary);
}

--- ui
div.category-picker
  each (categories as cat (cat.id))
    button.cat-chip type="button" class={cat.id === selected ? 'is-selected' : ''} @click=selectCat(cat.id)
      span.cat-chip-icon {cat.icon}
      span.cat-chip-name {getCategoryName(cat)}
