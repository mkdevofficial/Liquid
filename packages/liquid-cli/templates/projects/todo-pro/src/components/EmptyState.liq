--- logic
const { message = 'No tasks found' } = defineProps();

--- style
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  background-color: #ffffff;
  border-radius: 8px;
  border-width: 1px;
  border-color: #e2e8f0;
  margin-top: 8px;
}
.empty-icon {
  font-size: 28px;
  margin-bottom: 8px;
}
.empty-text {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

--- ui
div.empty-box
  span.empty-icon 📋
  span.empty-text {message}
