import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weatherStore, CITIES } from '../src/store.js';

test('Weather Template - converts units, switches cities, and provides complete forecasts', async () => {
  assert.equal(weatherStore.unit, 'C');
  assert.equal(weatherStore.formatTemp(20), '20°C');

  // Unit conversion
  weatherStore.toggleUnit();
  assert.equal(weatherStore.unit, 'F');
  assert.equal(weatherStore.formatTemp(20), '68°F');
  weatherStore.toggleUnit();
  assert.equal(weatherStore.unit, 'C');

  // Check initial city & forecast
  assert.equal(weatherStore.selectedCity.name, 'London');
  assert.ok(weatherStore.weather.forecast.length >= 7);

  // Switch city
  await weatherStore.selectCity('Tokyo');
  assert.equal(weatherStore.selectedCity.name, 'Tokyo');
  assert.ok(weatherStore.weather.current.tempC !== undefined);
});
