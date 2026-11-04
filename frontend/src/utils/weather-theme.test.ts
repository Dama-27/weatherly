import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  WEATHER_THEMES,
  getCategoryFromWmoCode,
  getWeatherTheme,
} from './weather-theme.ts';

describe('Weather Theme Engine', () => {
  it('correctly maps WMO weather codes to standard categories', () => {
    // Clear
    assert.strictEqual(getCategoryFromWmoCode(0), 'clear');
    assert.strictEqual(getCategoryFromWmoCode('0'), 'clear');

    // Partly cloudy
    assert.strictEqual(getCategoryFromWmoCode(1), 'partly-cloudy');
    assert.strictEqual(getCategoryFromWmoCode(2), 'partly-cloudy');

    // Cloudy
    assert.strictEqual(getCategoryFromWmoCode(3), 'cloudy');

    // Fog
    assert.strictEqual(getCategoryFromWmoCode(45), 'fog');
    assert.strictEqual(getCategoryFromWmoCode(48), 'fog');

    // Rain / Drizzle / Showers
    assert.strictEqual(getCategoryFromWmoCode(51), 'rain');
    assert.strictEqual(getCategoryFromWmoCode(61), 'rain');
    assert.strictEqual(getCategoryFromWmoCode(65), 'rain');
    assert.strictEqual(getCategoryFromWmoCode(80), 'rain');
    assert.strictEqual(getCategoryFromWmoCode(82), 'rain');

    // Snow
    assert.strictEqual(getCategoryFromWmoCode(71), 'snow');
    assert.strictEqual(getCategoryFromWmoCode(75), 'snow');
    assert.strictEqual(getCategoryFromWmoCode(85), 'snow');

    // Thunderstorm
    assert.strictEqual(getCategoryFromWmoCode(95), 'thunderstorm');
    assert.strictEqual(getCategoryFromWmoCode(96), 'thunderstorm');
    assert.strictEqual(getCategoryFromWmoCode(99), 'thunderstorm');

    // Invalid / fallback
    assert.strictEqual(getCategoryFromWmoCode(undefined), 'clear');
    assert.strictEqual(getCategoryFromWmoCode(null), 'clear');
    assert.strictEqual(getCategoryFromWmoCode('invalid'), 'clear');
  });

  it('provides complete day and night theme configurations for all 7 categories', () => {
    const categories = [
      'clear',
      'partly-cloudy',
      'cloudy',
      'fog',
      'rain',
      'snow',
      'thunderstorm',
    ];

    for (const cat of categories) {
      const dayTheme = WEATHER_THEMES[`${cat}-day`];
      assert.ok(dayTheme, `Missing day theme for ${cat}`);
      assert.strictEqual(dayTheme.category, cat);
      assert.strictEqual(dayTheme.isDay, true);
      assert.ok(dayTheme.heroGradient.startsWith('linear-gradient'));
      assert.ok(dayTheme.heroText);
      assert.ok(dayTheme.heroSubtext);
      assert.ok(dayTheme.chartTempColor);
      assert.ok(dayTheme.chartFeelsLikeColor);
      assert.ok(dayTheme.chartRainColor);

      const nightTheme = WEATHER_THEMES[`${cat}-night`];
      assert.ok(nightTheme, `Missing night theme for ${cat}`);
      assert.strictEqual(nightTheme.category, cat);
      assert.strictEqual(nightTheme.isDay, false);
      assert.ok(nightTheme.heroGradient.startsWith('linear-gradient'));
      assert.ok(nightTheme.heroText);
      assert.ok(nightTheme.heroSubtext);
      assert.ok(nightTheme.chartTempColor);
      assert.ok(nightTheme.chartFeelsLikeColor);
      assert.ok(nightTheme.chartRainColor);
    }
  });

  it('returns valid themes for both day and night from getWeatherTheme', () => {
    const thunderstormDay = getWeatherTheme(95, true);
    assert.strictEqual(thunderstormDay.category, 'thunderstorm');
    assert.strictEqual(thunderstormDay.isDay, true);

    const thunderstormNight = getWeatherTheme(95, false);
    assert.strictEqual(thunderstormNight.category, 'thunderstorm');
    assert.strictEqual(thunderstormNight.isDay, false);

    const defaultDay = getWeatherTheme(undefined, true);
    assert.strictEqual(defaultDay.id, 'clear-day');

    const defaultNight = getWeatherTheme(undefined, false);
    assert.strictEqual(defaultNight.id, 'clear-night');
  });
});

