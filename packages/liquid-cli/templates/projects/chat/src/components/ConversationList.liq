--- logic
import { chatStore } from '../store.js';

function select(id) {
  chatStore.setActiveChat(id);
}

--- style
.conv-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 12px;
}
.conv-chip {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #ffffff;
  border-radius: 9999px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.conv-chip-active {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #0284c7;
  border-radius: 9999px;
  border-width: 1px;
  border-color: #0284c7;
}
.name-text {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.name-text-active {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

--- ui
div.conv-row
  each chatStore.conversations as conv (conv.id)
    button class="{conv.id === chatStore.activeChatId ? 'conv-chip-active' : 'conv-chip'}" @click=select(conv.id)
      span {conv.avatar}
      span class="{conv.id === chatStore.activeChatId ? 'name-text-active' : 'name-text'}" {conv.name}
