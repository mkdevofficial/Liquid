--- logic
import { chatStore } from '../store.js';

function handleInput(e) {
  chatStore.inputText = e.target ? e.target.value : e;
}

function handleSend() {
  chatStore.sendMessage();
}

--- style
.input-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 12px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-top: 10px;
}
.chat-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.send-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}

--- ui
div.input-row
  input.chat-input value="{chatStore.inputText}" placeholder="Type a message..." @input=handleInput @keydown.enter=handleSend
  button.send-btn @click=handleSend Send
