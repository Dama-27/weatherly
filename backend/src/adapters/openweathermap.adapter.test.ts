import { describe, expect, it } from 'vitest';
import {
  mapCurrentWeatherToLegacyWeatherData,
  mapOpenWeatherToCurrentWeather,
} from './openweathermap.adapter';
import type { CurrentWeather } from '../types/weather-domain.types';
import type { WeatherData } from '../types/weather.types';

describe('OpenWeatherMap Adapter', () => {
  it('maps complete OpenWeatherMap payload to CurrentWeather domain model', () => {
    const rawOwm: WeatherData & Record<string, any> = {
      id: 1248991,
      name: 'Colombo',
      coord: {
        lat: 6.9271,
        lon: 79.8612,
      },
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
      main: {
        temp: 304.15, // 31 °C
        feels_like: 308.15, // 35 °C
        pressure: 1012,
        humidity: 78,
      },
      wind: {
        speed: 4.5, // 16.2 km/h
        deg: 240,
      },
      clouds: {
        all: 20,
      },
      rain: {
        '1h': 1.5,
      },
      dt: 1700000000,
      sys: {
        country: 'LK',
        sunrise: 1699980000,
        sunset: 1700020000,
      },
      timezone: 19800, // +5.5 hours = UTC+5.5
    };

    const domain = mapOpenWeatherToCurrentWeather(rawOwm);

    expect(domain.location.name).toBe('Colombo');
    expect(domain.location.coordinates.latitude).toBe(6.9271);
    expect(domain.location.coordinates.longitude).toBe(79.8612);
    expect(domain.location.country).toBe('LK');
    expect(domain.location.timezone).toBe('UTC+5.5');

    // Canonical units
    expect(domain.temperatureCelsius).toBe(31);
    expect(domain.feelsLikeCelsius).toBe(35);
    expect(domain.humidityPercent).toBe(78);
    expect(domain.windSpeedKmH).toBe(16.2);
    expect(domain.windDirectionDegrees).toBe(240);
    expect(domain.pressureHpa).toBe(1012);
    expect(domain.cloudCoverPercent).toBe(20);
    expect(domain.precipitationMm).toBe(1.5);
    expect(domain.conditionCode).toBe(801);
    expect(domain.description).toBe('few clouds');
    expect(domain.isDay).toBe(true);
    expect(domain.dayNight).toBe('day');
    expect(domain.timestamp).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('handles night detection when timestamp is after sunset', () => {
    const rawOwm: WeatherData & Record<string, any> = {
      name: 'Tokyo',
      weather: [{ description: 'clear sky' }],
      main: { temp: 280, feels_like: 278, humidity: 40 },
      wind: { speed: 2 },
      dt: 1700030000,
      sys: {
        country: 'JP',
        sunrise: 1699980000,
        sunset: 1700020000,
      },
    };

    const domain = mapOpenWeatherToCurrentWeather(rawOwm);
    expect(domain.isDay).toBe(false);
    expect(domain.dayNight).toBe('night');
  });

  it('handles missing rain and fallback location gracefully', () => {
    const rawMinimal: WeatherData = {
      id: 2644210,
      weather: [{ description: 'light rain' }],
      main: {
        temp: 290.15,
        feels_like: 289.15,
        humidity: 65,
      },
      wind: {
        speed: 5,
      },
    };

    const fallback = {
      name: 'Liverpool',
      coordinates: { latitude: 53.4106, longitude: -2.9779 },
      country: 'GB',
      timezone: 'UTC+0',
    };

    const domain = mapOpenWeatherToCurrentWeather(rawMinimal, fallback);

    expect(domain.location.name).toBe('Liverpool');
    expect(domain.location.coordinates.latitude).toBe(53.4106);
    expect(domain.location.coordinates.longitude).toBe(-2.9779);
    expect(domain.location.country).toBe('GB');
    expect(domain.precipitationMm).toBe(0);
    expect(domain.pressureHpa).toBe(1013.25);
    expect(domain.cloudCoverPercent).toBe(0);
    expect(domain.temperatureCelsius).toBe(17);
    expect(domain.feelsLikeCelsius).toBe(16);
  });

  it('maps CurrentWeather back to legacy WeatherData for backward compatibility', () => {
    const domain: CurrentWeather = {
      location: {
        name: 'Paris',
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
        timezone: 'Europe/Paris',
      },
      temperatureCelsius: 22.4,
      feelsLikeCelsius: 21.8,
      humidityPercent: 55,
      windSpeedKmH: 18.0,
      windDirectionDegrees: 120,
      pressureHpa: 1015,
      cloudCoverPercent: 10,
      precipitationMm: 0.5,
      uvIndex: 4,
      conditionCode: 800,
      description: 'Clear sky',
      dayNight: 'day',
      isDay: true,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Paris',
    };

    const legacy = mapCurrentWeatherToLegacyWeatherData(domain, '2988507');

    expect(legacy.id).toBe(2988507);
    expect(legacy.cityCode).toBe(2988507);
    expect(legacy.name).toBe('Paris');
    expect(legacy.main.temp).toBe(295.55); // 22.4 + 273.15
    expect(legacy.main.feels_like).toBe(294.95); // 21.8 + 273.15
    expect(legacy.main.humidity).toBe(55);
    expect(legacy.wind.speed).toBe(5.0); // 18 / 3.6
    expect(legacy.rain?.['1h']).toBe(0.5);
    expect(legacy.weather[0].description).toBe('Clear sky');
  });
});
