--- logic
import { weatherStore } from './store.js';
import Header from './components/Header.liq';
import CityPicker from './components/CityPicker.liq';
import CurrentWeather from './components/CurrentWeather.liq';
import ForecastList from './components/ForecastList.liq';

function retry() {
  weatherStore.fetchWeather();
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.loading-box {
  background-color: #e0f2fe;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.loading-text {
  font-size: 13px;
  color: #0369a1;
  font-weight: 600;
  text-align: center;
}
.error-card {
  background-color: #fee2e2;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}
.error-text {
  font-size: 13px;
  color: #b91c1c;
  font-weight: 600;
}
.retry-btn {
  background-color: #ef4444;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  margin-top: 8px;
  align-self: flex-start;
}

--- ui
div.container
  Header

  CityPicker

  if weatherStore.isLoading
    div.loading-box
      span.loading-text Fetching live forecast...

  if weatherStore.error
    div.error-card
      span.error-text {weatherStore.error}
      button.retry-btn @click=retry Retry

  CurrentWeather

  ForecastList
