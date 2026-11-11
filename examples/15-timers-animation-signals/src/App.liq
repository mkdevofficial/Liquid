--- logic
import { signal, onMount, onCleanup } from 'liquid';

const progress = signal(45);
const isAnimating = signal(true);
let animInterval = null;

onMount(() => {
  animInterval = setInterval(() => {
    if (isAnimating()) {
      progress.set(progress() >= 100 ? 0 : progress() + 5);
    }
  }, 300);
});

onCleanup(() => {
  if (animInterval) clearInterval(animInterval);
});

function toggle() {
  isAnimating.set(!isAnimating());
}

function resetProgress() {
  progress.set(0);
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
  margin-bottom: 14px;
}
.metric-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.metric-label {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.metric-value {
  font-size: 20px;
  font-weight: 800;
  color: #0284c7;
}
.track-bg {
  height: 12px;
  background-color: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 16px;
}
.fill-bar {
  height: 12px;
  background-color: #0284c7;
  border-radius: 9999px;
}
.btn-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}
.btn-alt {
  background-color: #f1f5f9;
  color: #475569;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

--- ui
div.container
  header.header
    span.title 🫟 15 — Timers & Signal Animations

  div.card
    div.metric-row
      span.metric-label Animation Progress
      span.metric-value {progress()}%

    div.track-bg
      div.fill-bar style="width: {progress()}%"

    div.btn-row
      button.btn @click=toggle {isAnimating() ? 'Pause Animation' : 'Resume Animation'}
      button.btn-alt @click=resetProgress Reset to 0%
