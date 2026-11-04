import { describe, expect, it } from 'vitest';
import {
  getWmoWeatherCategory,
  getWmoWeatherDescription,
  WMO_CODE_MAP,
} from './wmo-weather-codes';

describe('WMO Weather Code Mapper', () => {
  it('maps all required categories correctly', () => {
    // Clear sky
    expect(getWmoWeatherDescription(0)).toBe('Clear sky');
    expect(getWmoWeatherCategory(0)).toBe('Clear sky');

    // Mainly clear
    expect(getWmoWeatherDescription(1)).toBe('Mainly clear');
    expect(getWmoWeatherCategory(1)).toBe('Mainly clear');

    // Partly cloudy
    expect(getWmoWeatherDescription(2)).toBe('Partly cloudy');
    expect(getWmoWeatherCategory(2)).toBe('Partly cloudy');

    // Overcast
    expect(getWmoWeatherDescription(3)).toBe('Overcast');
    expect(getWmoWeatherCategory(3)).toBe('Overcast');

    // Fog
    expect(getWmoWeatherDescription(45)).toBe('Fog');
    expect(getWmoWeatherCategory(45)).toBe('Fog');
    expect(getWmoWeatherDescription(48)).toBe('Depositing rime fog');
    expect(getWmoWeatherCategory(48)).toBe('Fog');

    // Drizzle
    expect(getWmoWeatherDescription(51)).toBe('Light drizzle');
    expect(getWmoWeatherCategory(51)).toBe('Drizzle');
    expect(getWmoWeatherDescription(53)).toBe('Moderate drizzle');
    expect(getWmoWeatherDescription(55)).toBe('Dense drizzle');
    expect(getWmoWeatherCategory(56)).toBe('Drizzle');

    // Rain
    expect(getWmoWeatherDescription(61)).toBe('Slight rain');
    expect(getWmoWeatherCategory(61)).toBe('Rain');
    expect(getWmoWeatherDescription(63)).toBe('Moderate rain');
    expect(getWmoWeatherDescription(65)).toBe('Heavy rain');

    // Freezing rain
    expect(getWmoWeatherDescription(66)).toBe('Light freezing rain');
    expect(getWmoWeatherCategory(66)).toBe('Freezing rain');
    expect(getWmoWeatherDescription(67)).toBe('Heavy freezing rain');

    // Snow
    expect(getWmoWeatherDescription(71)).toBe('Slight snow fall');
    expect(getWmoWeatherCategory(71)).toBe('Snow');
    expect(getWmoWeatherDescription(73)).toBe('Moderate snow fall');
    expect(getWmoWeatherDescription(75)).toBe('Heavy snow fall');
    expect(getWmoWeatherDescription(77)).toBe('Snow grains');

    // Rain showers
    expect(getWmoWeatherDescription(80)).toBe('Slight rain showers');
    expect(getWmoWeatherCategory(80)).toBe('Rain showers');
    expect(getWmoWeatherDescription(81)).toBe('Moderate rain showers');
    expect(getWmoWeatherDescription(82)).toBe('Violent rain showers');

    // Snow showers
    expect(getWmoWeatherDescription(85)).toBe('Slight snow showers');
    expect(getWmoWeatherCategory(85)).toBe('Snow showers');
    expect(getWmoWeatherDescription(86)).toBe('Heavy snow showers');

    // Thunderstorms
    expect(getWmoWeatherDescription(95)).toBe('Thunderstorm');
    expect(getWmoWeatherCategory(95)).toBe('Thunderstorms');
    expect(getWmoWeatherDescription(96)).toBe('Thunderstorm with slight hail');
    expect(getWmoWeatherDescription(99)).toBe('Thunderstorm with heavy hail');
  });

  it('handles unknown or missing codes gracefully without returning numeric strings', () => {
    expect(getWmoWeatherDescription(null)).toBe('Unknown conditions');
    expect(getWmoWeatherDescription(undefined)).toBe('Unknown conditions');
    expect(getWmoWeatherDescription(9999)).toBe('Unknown weather conditions');
    expect(getWmoWeatherCategory(null)).toBe('Unknown');
  });

  it('has valid entries in WMO_CODE_MAP for all registered codes', () => {
    for (const [code, entry] of Object.entries(WMO_CODE_MAP)) {
      expect(Number.isInteger(Number(code))).toBe(true);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });
});

