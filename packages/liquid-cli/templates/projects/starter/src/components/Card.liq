--- logic
const { title = '' } = defineProps();

--- style
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

--- ui
div.card
  span.card-title {title}
  slot
