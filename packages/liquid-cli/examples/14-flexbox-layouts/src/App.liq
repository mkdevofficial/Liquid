--- logic
import { signal } from 'liquid';

const justifyContent = signal('space-between');

function setJustify(val) {
  justifyContent.set(val);
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
  margin-bottom: 14px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.row-between {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
}
.row-gap {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
}
.row-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
}
.box-blue {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.box-green {
  background-color: #10b981;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.box-purple {
  background-color: #8b5cf6;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.box-push-right {
  background-color: #f59e0b;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  margin-left: auto;
}

--- ui
div.container
  header.header
    span.title 🫟 14 — Flexbox Layout Patterns

  div.card
    span.card-title 1. justify-content: space-between
    div.row-between
      span.box-blue Left
      span.box-green Center
      span.box-purple Right

  div.card
    span.card-title 2. gap & margin-left: auto
    div.row-gap
      span.box-blue Box 1
      span.box-green Box 2
      span.box-push-right margin-left: auto

  div.card
    span.card-title 3. flex-wrap: wrap
    div.row-wrap
      span.box-blue Tag One
      span.box-green Tag Two
      span.box-purple Tag Three
      span.box-blue Tag Four
      span.box-green Tag Five
      span.box-purple Tag Six
