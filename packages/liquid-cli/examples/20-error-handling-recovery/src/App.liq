--- logic
import { signal } from 'liquid';

const hasError = signal(false);
const errorDetails = signal('');
const dataPayload = signal('Valid Initial Telemetry Data');

function triggerCrash() {
  try {
    throw new Error('Simulated payload deserialization failure in parsing pipeline');
  } catch (err) {
    hasError.set(true);
    errorDetails.set(err.message);
  }
}

function recover() {
  hasError.set(false);
  errorDetails.set('');
  dataPayload.set('Restored Operational State @ ' + new Date().toLocaleTimeString());
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
  margin-bottom: 8px;
}
.error-boundary {
  background-color: #fee2e2;
  border-width: 1px;
  border-color: #fca5a5;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
}
.error-title {
  font-size: 16px;
  font-weight: 800;
  color: #991b1b;
  margin-bottom: 6px;
}
.error-desc {
  font-size: 13px;
  color: #b91c1c;
  line-height: 18px;
  margin-bottom: 14px;
}
.normal-box {
  background-color: #f0fdf4;
  padding: 14px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #bbf7d0;
  margin-bottom: 12px;
}
.normal-text {
  font-size: 14px;
  color: #166534;
  font-weight: 600;
}
.btn-crash {
  background-color: #ef4444;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  align-self: flex-start;
}
.btn-recover {
  background-color: #166534;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  align-self: flex-start;
}

--- ui
div.container
  header.header
    span.title 🫟 20 — Error Handling & Recovery

  if hasError()
    div.error-boundary
      span.error-title ⚠️ Component Crash Caught
      span.error-desc An unhandled exception was captured by the local boundary: "{errorDetails()}"
      button.btn-recover @click=recover Recover Component State
  else
    div.card
      span.card-title Active Operational Subsystem
      div.normal-box
        span.normal-text {dataPayload()}
      button.btn-crash @click=triggerCrash Simulate Pipeline Crash
