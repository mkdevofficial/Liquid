--- logic
import { weatherStore, CITIES } from '../store.js';

function pick(name) {
  weatherStore.selectCity(name);
}

--- style
.city-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 12px;
}
.city-chip {
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.city-chip-active {
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}

--- ui
div.city-row
  each CITIES as city (city.name)
    button class="{city.name === weatherStore.selectedCity.name ? 'city-chip-active' : 'city-chip'}" @click=pick(city.name) {city.name}
