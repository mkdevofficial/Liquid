--- logic
import { weatherStore } from '../store.js';

function toggle() {
  weatherStore.toggleUnit();
}

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
.unit-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

--- ui
header.header
  span.brand ☀️ Liquid Weather
  button.unit-btn @click=toggle °{weatherStore.unit} (Switch to °{weatherStore.unit === 'C' ? 'F' : 'C'})
