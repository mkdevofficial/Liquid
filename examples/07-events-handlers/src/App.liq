--- logic
import { signal } from 'liquid';

const lastAction = signal('None');
const logs = signal([]);
const inputMessage = signal('');

function logEvent(name) {
  lastAction.set(name);
  logs.set([`${new Date().toLocaleTimeString()} — ${name}`, ...logs().slice(0, 4)]);
}

function handleEnter() {
  const val = inputMessage().trim();
  if (!val) return;
  logEvent(`Enter Pressed: "${val}"`);
  inputMessage.set('');
}

function handleInput(e) {
  inputMessage.set(e.target ? e.target.value : e);
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
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 14px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.btn-row {
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
  font-weight: 600;
}
.text-input {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.log-box {
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  margin-top: 6px;
}
.log-line {
  font-size: 12px;
  color: #475569;
  line-height: 18px;
}

--- ui
div.container
  header.header
    span.title 🫟 07 — Events & Modifiers

  div.card
    span.card-title Click Triggers
    div.btn-row
      button.btn @click=logEvent('Single Click') Click Me
      button.btn @click=logEvent('Secondary Button') Action B
      button.btn @click=logEvent('Tertiary Action') Action C

    span.card-title Keydown Modifiers
    input.text-input value="{inputMessage()}" placeholder="Type and press Enter..." @input=handleInput @keydown.enter=handleEnter

  div.card
    span.card-title Event Log (Last: {lastAction()})
    div.log-box
      if logs().length === 0
        span.log-line No events dispatched yet.
      else
        each logs() as item (item)
          span.log-line {item}
