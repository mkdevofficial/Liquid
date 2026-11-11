--- logic
import { appStore } from './store.js';

function inc() {
  appStore.increment();
}

function dec() {
  appStore.decrement();
}

function toggle() {
  appStore.toggleTheme();
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
  padding: 18px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 14px;
}
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}
.stat-text {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.theme-box {
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}
.theme-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

--- ui
div.container
  header.header
    span.title 🫟 09 — Shared Store

  div.card
    span.stat-text Global Store Counter: {appStore.getCounter()}
    span.stat-text Doubled (Selector): {appStore.getDouble()}
    div.row
      button.btn @click=dec Decrement (-)
      button.btn @click=inc Increment (+)

  div.card
    span.stat-text Logged in as: {appStore.user}
    div.theme-box
      span.theme-label Active Theme Mode: {appStore.theme}
    div.row
      button.btn @click=toggle Toggle Theme Mode
