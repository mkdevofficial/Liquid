--- logic
const { title = 'Liquid App' } = defineProps();

--- style
.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #0f172a;
  border-radius: 12px;
}
.brand {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

--- ui
header.header
  span.brand 🫟 {title}
  div.actions
    slot
