--- logic
import { signal } from 'liquid';
import { themes } from './tokens.js';

const isDark = signal(false);

function toggle() {
  isDark.set(!isDark());
}

--- style
.container-light {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.container-dark {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #0f172a;
  min-height: 100%;
}
.header-light {
  background-color: #0f172a;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.header-dark {
  background-color: #1e293b;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.card-light {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 18px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 14px;
}
.card-dark {
  display: flex;
  flex-direction: column;
  background-color: #1e293b;
  padding: 18px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #334155;
  margin-bottom: 14px;
}
.text-light {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}
.text-dark {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 8px;
}
.subtext-light {
  font-size: 14px;
  color: #64748b;
  line-height: 20px;
}
.subtext-dark {
  font-size: 14px;
  color: #94a3b8;
  line-height: 20px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  align-self: flex-start;
  margin-top: 12px;
}

--- ui
div class="{isDark() ? 'container-dark' : 'container-light'}"
  header class="{isDark() ? 'header-dark' : 'header-light'}"
    span.title 🫟 13 — Styling, Theming & Dark Mode

  div class="{isDark() ? 'card-dark' : 'card-light'}"
    span class="{isDark() ? 'text-dark' : 'text-light'}" Active Theme: {isDark() ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
    span class="{isDark() ? 'subtext-dark' : 'subtext-light'}" Liquid themes map directly to native view background and text colors with zero runtime style recalculation lag.
    button.btn @click=toggle Switch to {isDark() ? 'Light Mode' : 'Dark Mode'}
