--- logic
import { signal, effect, onMount, onCleanup } from 'liquid';

const seconds = signal(0);
const isRunning = signal(true);
let timerId = null;

onMount(() => {
  timerId = setInterval(() => {
    if (isRunning()) {
      seconds.set(seconds() + 1);
    }
  }, 1000);
});

onCleanup(() => {
  if (timerId) clearInterval(timerId);
});

function toggleTimer() {
  isRunning.set(!isRunning());
}

function resetTimer() {
  seconds.set(0);
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
  padding: 20px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.time-display {
  font-size: 36px;
  font-weight: 800;
  color: #0284c7;
  text-align: center;
  margin: 14px 0;
}
.controls {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 12px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}
.btn-reset {
  background-color: #f1f5f9;
  color: #475569;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}
.status-tag {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-align: center;
  margin-top: 10px;
}

--- ui
div.container
  header.header
    span.title 🫟 03 — Effects & Lifecycle

  div.card
    span.time-display ⏱ {seconds()}s
    div.controls
      button.btn @click=toggleTimer {isRunning() ? 'Pause' : 'Resume'}
      button.btn-reset @click=resetTimer Reset
    span.status-tag State: {isRunning() ? 'Active Timer' : 'Paused'}
