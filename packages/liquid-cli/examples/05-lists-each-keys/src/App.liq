--- logic
import { signal } from 'liquid';

const items = signal([
  { id: 1, text: 'Item Alpha', score: 85 },
  { id: 2, text: 'Item Beta', score: 92 },
  { id: 3, text: 'Item Gamma', score: 78 }
]);
let nextId = 4;

function addItem() {
  items.set([...items(), { id: nextId++, text: `Item Dynamic #${nextId}`, score: Math.floor(60 + Math.random() * 40) }]);
}

function removeItem(id) {
  items.set(items().filter(i => i.id !== id));
}

function sortByScore() {
  items.set([...items()].sort((a, b) => b.score - a.score));
}

function reverseOrder() {
  items.set([...items()].reverse());
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
.actions-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 12px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.btn-alt {
  background-color: #f1f5f9;
  color: #475569;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.list-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background-color: #ffffff;
  border-radius: 8px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 8px;
}
.item-text {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.score-badge {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.del-btn {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}
.right-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

--- ui
div.container
  header.header
    span.title 🫟 05 — Lists & Keyed Each

  div.actions-row
    button.btn @click=addItem + Add Item
    button.btn-alt @click=sortByScore Sort by Score
    button.btn-alt @click=reverseOrder Reverse

  each items() as item (item.id)
    div.list-item
      span.item-text {item.text}
      div.right-box
        span.score-badge Score: {item.score}
        button.del-btn @click=removeItem(item.id) ✕
