import { describe, expect, it } from 'vitest';
import {
  calculateComfortIndex,
  calculateComfortIndexFromDomain,
  isCurrentWeather,
} from './comfort-index.service';
import type { CurrentWeather } from '../types/weather-domain.types';
import type { WeatherData } from '../types/weather.types';

function createMockWeather(value: {
  feelsLikeCelsius?: number;
  humidity?: number;
  windSpeedMs?: number;
  rainMm?: number;
}): WeatherData {
  const feelsLikeCelsius = value?.feelsLikeCelsius ?? 25;
  const humidity = value?.humidity ?? 50;                  
  const windSpeedMs = value?.windSpeedMs ?? 3;            
  const rainMm = value?.rainMm ?? 0;                       

  return {
    id: 1248991,
    name: 'Colombo',
    cityCode: 1248991,
    cityName: 'Colombo',
    weather: [{ description: 'clear sky' }],
    main: {
      temp: feelsLikeCelsius + 273.15,
      feels_like: feelsLikeCelsius + 273.15,
      humidity,
    },
    wind: {
      speed: windSpeedMs,
    },
    rain: rainMm > 0 ? { '1h': rainMm } : undefined,
  };
}

function createMockCurrentWeather(value?: {
  feelsLikeCelsius?: number;
  humidityPercent?: number;
  windSpeedKmH?: number;
  precipitationMm?: number;
}): CurrentWeather {
  return {
    location: {
      name: 'Colombo',
      coordinates: { latitude: 6.9271, longitude: 79.8612 },
      country: 'LK',
      timezone: 'UTC+5.5',
    },
    temperatureCelsius: 25,
    feelsLikeCelsius: value?.feelsLikeCelsius ?? 25,
    humidityPercent: value?.humidityPercent ?? 50,
    windSpeedKmH: value?.windSpeedKmH ?? 10.8, // corresponds to 3 m/s
    windDirectionDegrees: 180,
    pressureHpa: 1013,
    cloudCoverPercent: 10,
    precipitationMm: value?.precipitationMm ?? 0,
    uvIndex: 5,
    conditionCode: 800,
    description: 'clear sky',
    dayNight: 'day',
    isDay: true,
    timestamp: new Date().toISOString(),
    timezone: 'UTC+5.5',
  };
}

describe('calculateComfortIndex (Legacy WeatherData regression tests)', () => {
  it('returns a high score for ideal conditions', () => {
    const mockData = createMockWeather({
      feelsLikeCelsius: 25,
      humidity: 50,
      windSpeedMs: 3,
      rainMm: 0,
    });

    const score = calculateComfortIndex(mockData);
    expect(score).toBe(100);
  });

  it('reduces the score for extreme temperature', () => {
    const mockData = createMockWeather({
      feelsLikeCelsius: 40,
      humidity: 50,
      windSpeedMs: 3,
      rainMm: 0,
    });

    const score = calculateComfortIndex(mockData);
    expect(score).toBeLessThan(100);
  });

  it('reduces the score for high humidity', () => {
    const mockData = createMockWeather({
      feelsLikeCelsius: 25,
      humidity: 95,
      windSpeedMs: 3,
      rainMm: 0,
    });

    const score = calculateComfortIndex(mockData);
    expect(score).toBeLessThan(100);
  });

  it('reduces the score for rain', () => {
    const mockData = createMockWeather({
      feelsLikeCelsius: 25,
      humidity: 50,
      windSpeedMs: 3,
      rainMm: 12,
    });

    const score = calculateComfortIndex(mockData);
    expect(score).toBeLessThan(100);
  });

  it('handles missing rain data gracefully', () => {
    const mockData = createMockWeather({
      feelsLikeCelsius: 25,
      humidity: 50,
      windSpeedMs: 3,
    });

    const score = calculateComfortIndex(mockData);
    expect(score).toBe(100);
  });

  it('always returns a score between 0 and 100', () => {
    const extremeWeather = createMockWeather({
      feelsLikeCelsius: 50,
      humidity: 100,
      windSpeedMs: 20,
      rainMm: 50,
    });

    const score = calculateComfortIndex(extremeWeather);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('calculateComfortIndex (Normalized CurrentWeather domain model)', () => {
  it('identifies CurrentWeather domain objects using type guard', () => {
    const domain = createMockCurrentWeather();
    const legacy = createMockWeather({});

    expect(isCurrentWeather(domain)).toBe(true);
    expect(isCurrentWeather(legacy)).toBe(false);
  });

  it('calculates score 100 for ideal canonical domain conditions', () => {
    const domain = createMockCurrentWeather({
      feelsLikeCelsius: 25,
      humidityPercent: 50,
      windSpeedKmH: 10,
      precipitationMm: 0,
    });

    const score = calculateComfortIndex(domain);
    expect(score).toBe(100);
  });

  it('calculates reduced score for high temperatures', () => {
    const domain = createMockCurrentWeather({
      feelsLikeCelsius: 38,
      humidityPercent: 50,
      windSpeedKmH: 10,
      precipitationMm: 0,
    });

    const score = calculateComfortIndex(domain);
    expect(score).toBeLessThan(100);
  });

  it('ensures exact score parity between legacy WeatherData and domain CurrentWeather', () => {
    const legacy = createMockWeather({
      feelsLikeCelsius: 28,
      humidity: 75,
      windSpeedMs: 4,
      rainMm: 1.2,
    });

    const domain = createMockCurrentWeather({
      feelsLikeCelsius: 28,
      humidityPercent: 75,
      windSpeedKmH: 14.4, // 4 * 3.6
      precipitationMm: 1.2,
    });

    const legacyScore = calculateComfortIndex(legacy);
    const domainScore = calculateComfortIndex(domain);
    const directDomainScore = calculateComfortIndexFromDomain(domain);

    expect(legacyScore).toBe(domainScore);
    expect(domainScore).toBe(directDomainScore);
  });
});
