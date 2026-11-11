# {{APP_NAME}} — Weather 🫟

Global weather forecast application using the public open-meteo.com API with offline fallback, dynamic temperature unit conversions, and 7-day outlook.

```
┌──────────────────────────────────────┐
│ ☀️ Liquid Weather            °C (→°F)│
├──────────────────────────────────────┤
│ (London)  (Tokyo)  (New York) (Cairo)│
├──────────────────────────────────────┤
│ London                            UK │
│                                      │
│ 19°C                             ⛅ │
│ Partly Cloudy                        │
│                                      │
│ 💨 Wind: 14 km/h   💧 Humidity: 62%  │
├──────────────────────────────────────┤
│ 7-Day Forecast                       │
│ Mon   ☀️ Sunny                 21°C  │
│ Tue   ⛅ Partly Cloudy          19°C  │
│ Wed   🌧️ Rain Shower            17°C  │
└──────────────────────────────────────┘
```

## Quick Start

```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Check .liq diagnostics
npm run check

# Build for Web production
npm run build

# Build native Android APK
npm run build:android
```
