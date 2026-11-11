--- logic
import { signal } from 'liquid';

const activeTab = signal('first');

function setTab(t) {
  activeTab.set(t);
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
.card-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.badge {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}
.body-text {
  font-size: 14px;
  color: #475569;
  line-height: 20px;
}
.tab-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 12px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.tab-btn-active {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}

--- ui
div.container
  header.header
    span.title 🫟 08 — Props, Slots & Composition

  div.card
    div.card-header-row
      span.card-title Card With Slot Projection
      span.badge Active
    span.body-text This card projects arbitrary nested content inside its slot boundary while managing uniform outer border and padding.

  div.card
    div.tab-row
      button class="{activeTab() === 'first' ? 'tab-btn-active' : 'tab-btn'}" @click=setTab('first') Section 1
      button class="{activeTab() === 'second' ? 'tab-btn-active' : 'tab-btn'}" @click=setTab('second') Section 2

    if activeTab() === 'first'
      span.body-text Section 1: Liquid slots support reactive switching between nested views with fine-grained DOM updates.
    else
      span.body-text Section 2: Props pass immutable data down the component hierarchy, ensuring predictable state flow.
