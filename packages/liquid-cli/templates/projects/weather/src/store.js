import { createStore } from 'liquid';

export const CITIES = [
  { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194 }
];

const fallbackData = {
  current: {
    tempC: 19,
    condition: 'Partly Cloudy',
    emoji: '⛅',
    wind: '14 km/h',
    humidity: '62%'
  },
  forecast: [
    { day: 'Mon', tempC: 21, emoji: '☀️', condition: 'Sunny' },
    { day: 'Tue', tempC: 19, emoji: '⛅', condition: 'Partly Cloudy' },
    { day: 'Wed', tempC: 17, emoji: '🌧️', condition: 'Rain Shower' },
    { day: 'Thu', tempC: 18, emoji: '⛅', condition: 'Cloudy' },
    { day: 'Fri', tempC: 22, emoji: '☀️', condition: 'Clear' },
    { day: 'Sat', tempC: 23, emoji: '☀️', condition: 'Sunny' },
    { day: 'Sun', tempC: 20, emoji: '⛅', condition: 'Scattered Clouds' }
  ]
};

export const weatherStore = createStore({
  selectedCity: CITIES[0],
  unit: 'C', // 'C' | 'F'
  isLoading: false,
  error: null,
  weather: fallbackData,

  formatTemp(tempC) {
    if (this.unit === 'F') {
      return Math.round((tempC * 9) / 5 + 32) + '°F';
    }
    return Math.round(tempC) + '°C';
  },

  toggleUnit() {
    this.unit = this.unit === 'C' ? 'F' : 'C';
  },

  async selectCity(cityName) {
    const city = CITIES.find(c => c.name === cityName) || CITIES[0];
    this.selectedCity = city;
    await this.fetchWeather();
  },

  async fetchWeather() {
    this.isLoading = true;
    this.error = null;
    try {
      if (typeof fetch !== 'undefined') {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.selectedCity.lat}&longitude=${this.selectedCity.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
        const abortSignal = typeof globalThis !== 'undefined' && globalThis.AbortSignal && typeof globalThis.AbortSignal.timeout === 'function'
          ? globalThis.AbortSignal.timeout(4000)
          : undefined;
        const res = await fetch(url, { signal: abortSignal });
        if (res.ok) {
          const data = await res.json();
          if (data && data.current) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const curTemp = data.current.temperature_2m;
            this.weather = {
              current: {
                tempC: curTemp,
                condition: curTemp > 24 ? 'Warm & Sunny' : curTemp > 15 ? 'Mild' : 'Cool',
                emoji: curTemp > 22 ? '☀️' : curTemp > 14 ? '⛅' : '🌧️',
                wind: `${Math.round(data.current.wind_speed_10m || 10)} km/h`,
                humidity: `${data.current.relative_humidity_2m || 50}%`
              },
              forecast: (data.daily?.time || []).slice(0, 7).map((t, idx) => {
                const date = new Date(t);
                const dayName = days[date.getDay()];
                const max = data.daily.temperature_2m_max[idx];
                return {
                  day: dayName,
                  tempC: max,
                  emoji: max > 22 ? '☀️' : max > 16 ? '⛅' : '🌧️',
                  condition: max > 20 ? 'Sunny' : 'Cloudy'
                };
              })
            };
            this.isLoading = false;
            return;
          }
        }
      }
    } catch (e) {
      // Graceful offline fallback
    }
    // Use fallback data
    this.weather = fallbackData;
    this.isLoading = false;
  }
});
