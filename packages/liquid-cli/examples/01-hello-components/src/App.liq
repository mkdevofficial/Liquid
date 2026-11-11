--- logic
import { signal } from 'liquid';

// Define a Greeting component directly inside or used inline
const userName = signal('Developer');

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
  margin-bottom: 12px;
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
.card-header {
  font-size: 15px;
  font-weight: 700;
  color: #0284c7;
  margin-bottom: 6px;
}
.desc {
  font-size: 14px;
  color: #475569;
  line-height: 20px;
}
.tag {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  align-self: flex-start;
  margin-top: 8px;
}

--- ui
div.container
  header.header
    span.title 🫟 01 — Hello Components

  div.card
    span.card-header Component Composition & Slots
    span.desc Liquid components accept props with default values and project child content seamlessly through slots on both Web and native Android.
    span.tag Props + Slots Ready

  div.card
    span.card-header Welcome, {userName()}!
    span.desc Fine-grained reactivity updates only the text node when userName changes, without touching surrounding DOM.
