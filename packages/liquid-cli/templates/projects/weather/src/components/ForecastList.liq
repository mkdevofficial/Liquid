--- logic
import { weatherStore } from '../store.js';

--- style
.forecast-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.forecast-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}
.forecast-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
}
.day-label {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  width: 45px;
}
.center-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.cond-text {
  font-size: 13px;
  color: #64748b;
}
.temp-val {
  font-size: 14px;
  font-weight: 700;
  color: #0284c7;
}

--- ui
div.forecast-card
  span.forecast-title 7-Day Forecast
  each weatherStore.weather.forecast as item (item.day)
    div.forecast-row
      span.day-label {item.day}
      div.center-box
        span {item.emoji}
        span.cond-text {item.condition}
      span.temp-val {weatherStore.formatTemp(item.tempC)}
