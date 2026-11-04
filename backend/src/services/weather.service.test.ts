import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from './cache.service';
import { getWeatherByCityCode } from './weather.service';

describe('Weather Service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
  });

  const mockOpenMeteoResponse = {
    latitude: 6.9271,
    longitude: 79.8612,
    timezone: 'Asia/Colombo',
    current: {
      time: '2026-11-04T12:00',
      temperature_2m: 31.0,
      relative_humidity_2m: 75,
      apparent_temperature: 36.5,
      is_day: 1,
      precipitation: 0.0,
      weather_code: 1,
      cloud_cover: 20,
      pressure_msl: 1012.0,
      wind_speed_10m: 14.4,
      wind_direction_10m: 220,
      wind_gusts_10m: 20.0,
      uv_index: 8.0,
    },
  };

  it('retrieves weather data for a city using Open-Meteo by default', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockOpenMeteoResponse),
    } as unknown as Response);

    globalThis.fetch = fetchSpy;

    const weather = await getWeatherByCityCode('1248991'); // Colombo

    expect(weather).toBeDefined();
    expect(weather.name).toBe('Colombo');
    expect(weather.main.temp).toBe(304.15); // 31.0 °C in Kelvin
    expect(weather.main.humidity).toBe(75);
    expect(weather.wind.speed).toBe(4); // 14.4 km/h / 3.6 = 4.0 m/s
    expect(weather.weather[0].description).toBe('Mainly clear');

    // Second call should hit the cache and not invoke fetch again
    const cached = await getWeatherByCityCode('1248991');
    expect(cached).toEqual(weather);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

