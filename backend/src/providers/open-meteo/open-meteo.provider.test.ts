import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenMeteoProvider } from './open-meteo.provider';
import { OpenMeteoError } from './open-meteo.types';

describe('OpenMeteoProvider', () => {
  let provider: OpenMeteoProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new OpenMeteoProvider({ timeoutMs: 500 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const mockSuccessfulResponse = {
    latitude: 6.9271,
    longitude: 79.8612,
    timezone: 'Asia/Colombo',
    current: {
      time: '2026-11-04T12:00',
      temperature_2m: 30.5,
      relative_humidity_2m: 78,
      apparent_temperature: 36.2,
      is_day: 1,
      precipitation: 0.0,
      rain: 0.0,
      weather_code: 2,
      cloud_cover: 35,
      pressure_msl: 1012.3,
      wind_speed_10m: 14.5,
      wind_direction_10m: 230,
      wind_gusts_10m: 21.0,
      uv_index: 8.5,
    },
    hourly: {
      time: ['2026-11-04T12:00', '2026-11-04T13:00'],
      temperature_2m: [30.5, 31.0],
      relative_humidity_2m: [78, 75],
      apparent_temperature: [36.2, 37.1],
      precipitation_probability: [10, 20],
      precipitation: [0.0, 0.5],
      weather_code: [2, 61],
      wind_speed_10m: [14.5, 16.0],
      uv_index: [8.5, 9.0],
    },
    daily: {
      time: ['2026-11-04', '2026-11-05'],
      weather_code: [2, 61],
      temperature_2m_max: [31.5, 30.0],
      temperature_2m_min: [25.0, 24.5],
      sunrise: ['2026-11-04T05:58', '2026-11-05T05:58'],
      sunset: ['2026-11-04T17:50', '2026-11-05T17:50'],
      uv_index_max: [9.0, 7.5],
      precipitation_probability_max: [20, 60],
      precipitation_sum: [0.2, 4.5],
      wind_speed_10m_max: [18.0, 22.5],
    },
  };

  it('successfully retrieves and normalizes current weather', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockSuccessfulResponse),
    } as unknown as Response);

    const result = await provider.getCurrentWeather(
      { latitude: 6.9271, longitude: 79.8612 },
      'Colombo'
    );

    expect(result.location.name).toBe('Colombo');
    expect(result.location.coordinates.latitude).toBe(6.9271);
    expect(result.location.coordinates.longitude).toBe(79.8612);
    expect(result.location.timezone).toBe('Asia/Colombo');

    // Canonical units check: Celsius, km/h, hPa
    expect(result.temperatureCelsius).toBe(30.5);
    expect(result.feelsLikeCelsius).toBe(36.2);
    expect(result.humidityPercent).toBe(78);
    expect(result.windSpeedKmH).toBe(14.5);
    expect(result.windDirectionDegrees).toBe(230);
    expect(result.windGustsKmH).toBe(21.0);
    expect(result.pressureHpa).toBe(1012.3);
    expect(result.cloudCoverPercent).toBe(35);
    expect(result.precipitationMm).toBe(0.0);
    expect(result.uvIndex).toBe(8.5);

    // WMO weather-code mapping check: code 2 -> 'Partly cloudy'
    expect(result.conditionCode).toBe(2);
    expect(result.description).toBe('Partly cloudy');
    expect(result.isDay).toBe(true);
    expect(result.dayNight).toBe('day');
  });

  it('successfully retrieves and normalizes complete forecast', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockSuccessfulResponse),
    } as unknown as Response);

    const forecast = await provider.getForecast(
      { latitude: 6.9271, longitude: 79.8612 },
      { days: 7, includeHourly: true },
      'Colombo'
    );

    expect(forecast.location.name).toBe('Colombo');
    expect(forecast.current.temperatureCelsius).toBe(30.5);

    // Hourly check
    expect(forecast.hourly).toHaveLength(2);
    expect(forecast.hourly[0].temperatureCelsius).toBe(30.5);
    expect(forecast.hourly[0].feelsLikeCelsius).toBe(36.2);
    expect(forecast.hourly[0].windSpeedKmH).toBe(14.5);
    expect(forecast.hourly[0].description).toBe('Partly cloudy');
    expect(forecast.hourly[1].description).toBe('Slight rain'); // code 61

    // Daily check
    expect(forecast.daily).toHaveLength(2);
    expect(forecast.daily[0].date).toBe('2026-11-04');
    expect(forecast.daily[0].maxTemperatureCelsius).toBe(31.5);
    expect(forecast.daily[0].minTemperatureCelsius).toBe(25.0);
    expect(forecast.daily[0].precipitationSumMm).toBe(0.2);
    expect(forecast.daily[0].maxWindSpeedKmH).toBe(18.0);
    expect(forecast.daily[0].uvIndexMax).toBe(9.0);
    expect(forecast.daily[0].description).toBe('Partly cloudy');
    expect(forecast.daily[1].description).toBe('Slight rain');
  });

  it('verifies explicit units and query parameters sent to Open-Meteo', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockSuccessfulResponse),
    } as unknown as Response);

    globalThis.fetch = fetchSpy;

    await provider.getCurrentWeather({ latitude: 52.52, longitude: 13.41 }, 'Berlin');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchSpy.mock.calls[0][0] as string;

    expect(requestedUrl).toContain('https://api.open-meteo.com/v1/forecast');
    expect(requestedUrl).toContain('latitude=52.52');
    expect(requestedUrl).toContain('longitude=13.41');
    expect(requestedUrl).toContain('temperature_unit=celsius');
    expect(requestedUrl).toContain('wind_speed_unit=kmh');
    expect(requestedUrl).toContain('precipitation_unit=mm');
    expect(requestedUrl).toContain('timezone=auto');
    expect(requestedUrl).toContain('wind_gusts_10m');
    expect(requestedUrl).toContain('uv_index');
  });

  it('maps night conditions properly when is_day is 0', async () => {
    const nightPayload = {
      ...mockSuccessfulResponse,
      current: {
        ...mockSuccessfulResponse.current,
        is_day: 0,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(nightPayload),
    } as unknown as Response);

    const result = await provider.getCurrentWeather({ latitude: 35.6762, longitude: 139.6503 });
    expect(result.isDay).toBe(false);
    expect(result.dayNight).toBe('night');
  });

  it('handles request timeouts gracefully without fabricating data', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    await expect(
      provider.getCurrentWeather({ latitude: 6.9271, longitude: 79.8612 })
    ).rejects.toThrow(OpenMeteoError);

    try {
      await provider.getCurrentWeather({ latitude: 6.9271, longitude: 79.8612 });
    } catch (err) {
      expect(err).toBeInstanceOf(OpenMeteoError);
      expect((err as OpenMeteoError).isTimeout).toBe(true);
      expect((err as OpenMeteoError).message).toContain('timed out');
    }
  });

  it('handles HTTP error responses (e.g. 400 Bad Request)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({
        error: true,
        reason: "Latitude must be in range of -90 to 90°. Given: 150.0.",
      }),
    } as unknown as Response);

    await expect(
      provider.getCurrentWeather({ latitude: 50, longitude: 10 })
    ).rejects.toThrow(OpenMeteoError);

    try {
      await provider.getCurrentWeather({ latitude: 50, longitude: 10 });
    } catch (err) {
      expect(err).toBeInstanceOf(OpenMeteoError);
      expect((err as OpenMeteoError).statusCode).toBe(400);
      expect((err as OpenMeteoError).message).toContain('Latitude must be in range');
    }
  });

  it('handles invalid provider response payloads (missing current weather)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        latitude: 10,
        longitude: 20,
        // missing 'current'
      }),
    } as unknown as Response);

    await expect(
      provider.getCurrentWeather({ latitude: 10, longitude: 20 })
    ).rejects.toThrow(OpenMeteoError);
  });

  it('validates coordinates and rejects invalid lat/lon before dispatching HTTP', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    await expect(
      provider.getCurrentWeather({ latitude: 120, longitude: 0 })
    ).rejects.toThrow(OpenMeteoError);

    await expect(
      provider.getCurrentWeather({ latitude: 0, longitude: 250 })
    ).rejects.toThrow(OpenMeteoError);

    await expect(
      provider.getCurrentWeather({ latitude: NaN, longitude: 0 })
    ).rejects.toThrow(OpenMeteoError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

