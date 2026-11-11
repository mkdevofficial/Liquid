--- logic
import { signal } from 'liquid';

const fullName = signal('Alex Morgan');
const bio = signal('Passionate mobile and web developer building with Liquid.');
const newsletter = signal(true);
const tier = signal('pro'); // 'free' | 'pro' | 'enterprise'

function setTier(t) {
  tier.set(t);
}

function toggleNewsletter() {
  newsletter.set(!newsletter());
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
.form-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-bottom: 14px;
}
.field-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}
.text-input {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  color: #0f172a;
  background-color: #ffffff;
  margin-bottom: 12px;
}
.text-area {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  color: #0f172a;
  background-color: #ffffff;
  min-height: 80px;
  margin-bottom: 12px;
}
.options-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 12px;
}
.opt-btn {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.opt-btn-active {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}
.check-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.check-box {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border-width: 1px;
  border-color: #0284c7;
  background-color: #f0f9ff;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #0284c7;
  font-weight: 700;
}
.check-label {
  font-size: 14px;
  color: #0f172a;
}
.preview-card {
  background-color: #f0fdf4;
  padding: 14px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #bbf7d0;
}
.preview-title {
  font-size: 14px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 6px;
}
.preview-text {
  font-size: 13px;
  color: #14532d;
  line-height: 18px;
}

--- ui
div.container
  header.header
    span.title 🫟 06 — Forms & Two-Way Binding

  div.form-card
    span.field-label Full Name
    input.text-input $value={fullName} placeholder="Enter your name"

    span.field-label Bio
    textarea.text-area $value={bio} placeholder="Tell us about yourself"

    span.field-label Subscription Plan
    div.options-row
      button class="{tier() === 'free' ? 'opt-btn-active' : 'opt-btn'}" @click=setTier('free') Free
      button class="{tier() === 'pro' ? 'opt-btn-active' : 'opt-btn'}" @click=setTier('pro') Pro
      button class="{tier() === 'enterprise' ? 'opt-btn-active' : 'opt-btn'}" @click=setTier('enterprise') Enterprise

    div.check-row @click=toggleNewsletter
      button.check-box {newsletter() ? '✓' : ''}
      span.check-label Receive developer updates & product releases

  div.preview-card
    span.preview-title Live State Preview
    span.preview-text Name: {fullName()} | Plan: {tier()} | Newsletter: {newsletter() ? 'Yes' : 'No'}
    span.preview-text Bio: {bio()}
