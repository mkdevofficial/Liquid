--- logic
import { signal, onMount } from 'liquid';

const status = signal('idle'); // 'idle' | 'loading' | 'success' | 'error'
const users = signal([]);
const errorMessage = signal('');

async function loadUsers(forceFail = false) {
  status.set('loading');
  errorMessage.set('');

  // Simulate network fetch with 400ms latency
  setTimeout(() => {
    if (forceFail) {
      status.set('error');
      errorMessage.set('Network connection timed out (HTTP 504)');
    } else {
      users.set([
        { id: 1, name: 'Ada Lovelace', role: 'Chief Architect', status: 'online' },
        { id: 2, name: 'Alan Turing', role: 'Cryptographer', status: 'online' },
        { id: 3, name: 'Grace Hopper', role: 'Compiler Pioneer', status: 'away' }
      ]);
      status.set('success');
    }
  }, 400);
}

onMount(() => {
  loadUsers();
});

function retry() {
  loadUsers(false);
}

function triggerError() {
  loadUsers(true);
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
.btn-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 14px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.btn-danger {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.user-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
}
.user-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.user-role {
  font-size: 12px;
  color: #64748b;
}
.badge {
  background-color: #dcfce7;
  color: #166534;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.state-box {
  padding: 20px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}
.loading-box {
  background-color: #e0f2fe;
}
.error-box {
  background-color: #fee2e2;
}
.state-text {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

--- ui
div.container
  header.header
    span.title 🫟 11 — Async Data & Fetch States

  div.btn-row
    button.btn @click=retry Fetch Data
    button.btn-danger @click=triggerError Simulate Error

  div.card
    if status() === 'loading'
      div.state-box.loading-box
        span.state-text Loading team members...
    else
      if status() === 'error'
        div.state-box.error-box
          span.state-text ⚠️ {errorMessage()}
      else
        each users() as user (user.id)
          div.user-item
            div
              span.user-name {user.name}
              span.user-role {user.role}
            span.badge {user.status}
