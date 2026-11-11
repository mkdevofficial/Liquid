--- logic
import { arabicStore } from '../store.js';

--- style
.wisdom-card {
  display: flex;
  flex-direction: column;
  background-color: #ecfdf5;
  border-radius: 12px;
  padding: 18px;
  margin-top: 14px;
  border-width: 1px;
  border-color: #a7f3d0;
  border-inline-start-width: 4px;
  border-inline-start-color: #059669;
}
.wisdom-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.wisdom-title {
  font-size: 15px;
  font-weight: 700;
  color: #065f46;
}
.wisdom-body {
  font-size: 14px;
  color: #047857;
  line-height: 22px;
}

--- ui
div.wisdom-card
  div.wisdom-header
    span 💡
    span.wisdom-title {arabicStore.getT().wisdomTitle}
  span.wisdom-body {arabicStore.getT().wisdomBody}
