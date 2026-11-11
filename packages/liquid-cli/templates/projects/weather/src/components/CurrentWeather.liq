--- logic
import { weatherStore } from '../store.js';

--- style
.current-card {
  display: flex;
  flex-direction: column;
  background-color: #0284c7;
  border-radius: 14px;
  padding: 24px 20px;
  margin-bottom: 16px;
}
.location-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.city-name {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
}
.country-tag {
  font-size: 13px;
  color: #bae6fd;
}
.main-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}
.temp-large {
  font-size: 44px;
  font-weight: 800;
  color: #ffffff;
}
.emoji-large {
  font-size: 48px;
}
.condition-text {
  font-size: 16px;
  font-weight: 600;
  color: #e0f2fe;
  margin-top: 4px;
}
.meta-row {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-top: 16px;
  padding-top: 12px;
  border-top-width: 1px;
  border-top-color: rgba(255, 255, 255, 0.2);
}
.meta-item {
  font-size: 12px;
  color: #bae6fd;
}

--- ui
div.current-card
  div.location-row
    span.city-name {weatherStore.selectedCity.name}
    span.country-tag {weatherStore.selectedCity.country}

  div.main-row
    div
      span.temp-large {weatherStore.formatTemp(weatherStore.weather.current.tempC)}
      span.condition-text {weatherStore.weather.current.condition}
    span.emoji-large {weatherStore.weather.current.emoji}

  div.meta-row
    span.meta-item 💨 Wind: {weatherStore.weather.current.wind}
    span.meta-item 💧 Humidity: {weatherStore.weather.current.humidity}
