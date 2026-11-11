--- logic
import { signal } from 'liquid';
import { getDeviceInfo, triggerHapticFeedback } from './device.js';

const info = signal(getDeviceInfo());
const feedbackStatus = signal('Ready');

function handleVibrate() {
  const ok = triggerHapticFeedback(50);
  feedbackStatus.set(ok ? 'Vibration / Haptic Triggered' : 'Haptics Not Supported in Current Browser');
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
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.info-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
}
.info-label {
  font-size: 13px;
  color: #64748b;
}
.info-val {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
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
.feedback-text {
  font-size: 12px;
  color: #0284c7;
  font-weight: 600;
  margin-top: 8px;
}

--- ui
div.container
  header.header
    span.title 🫟 17 — Native Modules & Platform APIs

  div.card
    span.card-title Device & Runtime Telemetry
    div.info-row
      span.info-label Platform
      span.info-val {info().platform}
    div.info-row
      span.info-label Architecture
      span.info-val {info().arch}
    div.info-row
      span.info-label Native Engine
      span.info-val {info().engine}

  div.card
    span.card-title Native Hardware Capabilities
    span.info-label Invoke native device vibrator or haptic motor via Liquid bridge.
    button.btn @click=handleVibrate Trigger Haptic Pulse
    span.feedback-text Status: {feedbackStatus()}
