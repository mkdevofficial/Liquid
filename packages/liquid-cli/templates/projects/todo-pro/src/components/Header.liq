--- logic
import { todoStore } from '../store.js';

--- style
.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #0f172a;
  border-radius: 12px;
}
.brand-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.counts-badge {
  background-color: #0284c7;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}

--- ui
header.header
  div.brand-box
    span.brand-title ✓ Todo Pro
  span.counts-badge {todoStore.getActiveCount()} open
