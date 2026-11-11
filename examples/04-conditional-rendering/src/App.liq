--- logic
import { signal } from 'liquid';

const isLoggedIn = signal(false);
const viewMode = signal('summary'); // 'summary' | 'details' | 'raw'

function toggleLogin() {
  isLoggedIn.set(!isLoggedIn());
}

function setMode(m) {
  viewMode.set(m);
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
  margin-bottom: 12px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  align-self: flex-start;
  margin-top: 8px;
}
.tab-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 12px;
}
.tab-btn {
  padding: 6px 12px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.tab-btn-active {
  padding: 6px 12px;
  border-radius: 6px;
  background-color: #0284c7;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}
.box-green {
  background-color: #dcfce7;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}
.text-green {
  color: #166534;
  font-weight: 600;
  font-size: 14px;
}
.box-gray {
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}
.text-gray {
  color: #475569;
  font-size: 14px;
}

--- ui
div.container
  header.header
    span.title 🫟 04 — Conditional Rendering

  div.card
    if isLoggedIn()
      div.box-green
        span.text-green Welcome back! You have active session privileges.
    else
      div.box-gray
        span.text-gray Please authenticate to view personalized dashboard details.

    button.btn @click=toggleLogin {isLoggedIn() ? 'Sign Out' : 'Sign In'}

  div.card
    div.tab-row
      button class="{viewMode() === 'summary' ? 'tab-btn-active' : 'tab-btn'}" @click=setMode('summary') Summary
      button class="{viewMode() === 'details' ? 'tab-btn-active' : 'tab-btn'}" @click=setMode('details') Details
      button class="{viewMode() === 'raw' ? 'tab-btn-active' : 'tab-btn'}" @click=setMode('raw') Raw JSON

    if viewMode() === 'summary'
      span.text-gray High-level executive overview of app status.
    else
      if viewMode() === 'details'
        span.text-gray Granular per-component breakdown and telemetry metrics.
      else
        span.text-gray &#123; "status": 200, "authenticated": {isLoggedIn() ? 'true' : 'false'} &#125;
