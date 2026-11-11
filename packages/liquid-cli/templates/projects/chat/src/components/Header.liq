--- logic
import { chatStore } from '../store.js';

--- style
.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background-color: #0f172a;
  border-radius: 12px;
}
.brand-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.brand {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.active-user {
  font-size: 13px;
  color: #38bdf8;
  font-weight: 600;
}

--- ui
header.header
  div.brand-box
    span.brand 💬 Liquid Chat
  span.active-user {chatStore.getActiveConversation().name}
