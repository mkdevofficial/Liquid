--- logic
import { signal } from 'liquid';

// Generate 500 records
const allItems = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: `Telemetry Node #${i + 1}`,
  latency: Math.floor(10 + Math.random() * 80) + 'ms',
  status: i % 7 === 0 ? 'warning' : 'healthy'
}));

const visibleCount = signal(30);

function loadMore() {
  visibleCount.set(Math.min(500, visibleCount() + 30));
}

function loadAll() {
  visibleCount.set(500);
}

function resetList() {
  visibleCount.set(30);
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
.toolbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.count-text {
  font-size: 13px;
  font-weight: 700;
  color: #0284c7;
}
.btn-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.btn-alt {
  background-color: #f1f5f9;
  color: #475569;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.item-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: #ffffff;
  border-radius: 8px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 6px;
}
.node-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.node-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.latency-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.status-badge {
  background-color: #dcfce7;
  color: #166534;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}
.status-warn {
  background-color: #fef3c7;
  color: #b45309;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

--- ui
div.container
  header.header
    span.title 🫟 18 — Large Lists & Scroll Performance

  div.toolbar
    span.count-text Displaying {visibleCount()} of 500 items
    div.btn-row
      button.btn @click=loadMore +30 More
      button.btn @click=loadAll Render 500
      button.btn-alt @click=resetList Reset

  each allItems.slice(0, visibleCount()) as item (item.id)
    div.item-row
      span.node-name {item.name}
      div.node-meta
        span.latency-text {item.latency}
        span class="{item.status === 'warning' ? 'status-warn' : 'status-badge'}" {item.status}
