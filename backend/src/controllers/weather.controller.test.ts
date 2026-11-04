import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { clearCache } from '../services/cache.service';
import {
  getCurrentWeatherByCoords,
  getDailyForecastByCoords,
  getHourlyForecastByCoords,
} from './weather.controller';

function createMockReqRes(query: Record<string, any> = {}) {
  const req = { query } as unknown as Request;
  let statusCode = 200;
  let responseBody: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getBody: () => responseBody,
  };
}

describe('Weather Controller (Coordinate-based APIs)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
  });

  const mockOpenMeteoPayload = {
    latitude: 7.2083,
    longitude: 79.8358,
    timezone: 'Asia/Colombo',
    current: {
      time: '2026-11-04T12:00',
      temperature_2m: 30.5,
      relative_humidity_2m: 78,
      apparent_temperature: 36.0,
      is_day: 1,
      precipitation: 0.0,
      rain: 0.0,
      weather_code: 1,
      cloud_cover: 20,
      pressure_msl: 1012.0,
      wind_speed_10m: 14.5,
      wind_direction_10m: 210,
      wind_gusts_10m: 22.0,
      uv_index: 8.0,
    },
    hourly: {
      time: Array.from({ length: 48 }, (_, i) => `2026-11-04T${String(i % 24).padStart(2, '0')}:00`),
      temperature_2m: Array.from({ length: 48 }, () => 29.5),
      relative_humidity_2m: Array.from({ length: 48 }, () => 80),
      apparent_temperature: Array.from({ length: 48 }, () => 34.0),
      precipitation_probability: Array.from({ length: 48 }, () => 15),
      precipitation: Array.from({ length: 48 }, () => 0.0),
      weather_code: Array.from({ length: 48 }, () => 1),
      wind_speed_10m: Array.from({ length: 48 }, () => 12.0),
      uv_index: Array.from({ length: 48 }, () => 5.0),
    },
    daily: {
      time: ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'],
      weather_code: [1, 2, 61, 1, 0, 80, 2],
      temperature_2m_max: [31.5, 31.0, 30.0, 32.0, 32.5, 30.5, 31.0],
      temperature_2m_min: [25.0, 25.5, 24.0, 24.5, 25.0, 24.0, 25.0],
      sunrise: ['2026-11-04T05:58', '2026-11-05T05:58', '2026-11-06T05:58', '2026-11-07T05:58', '2026-11-08T05:58', '2026-11-09T05:58', '2026-11-10T05:58'],
      sunset: ['2026-11-04T17:50', '2026-11-05T17:50', '2026-11-06T17:50', '2026-11-07T17:50', '2026-11-08T17:50', '2026-11-09T17:50', '2026-11-10T17:50'],
      uv_index_max: [9.0, 8.5, 6.0, 9.0, 9.5, 7.0, 8.5],
      precipitation_probability_max: [10, 20, 70, 10, 0, 50, 20],
      precipitation_sum: [0.0, 0.5, 12.0, 0.0, 0.0, 3.5, 0.5],
      wind_speed_10m_max: [18.0, 20.0, 25.0, 15.0, 14.0, 22.0, 16.0],
    },
  };

  describe('GET /api/weather/current', () => {
    it('returns normalized current weather and location metadata', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      const { req, res, getStatusCode, getBody } = createMockReqRes({
        lat: '7.2083',
        lon: '79.8358',
        name: 'Negombo',
      });

      await getCurrentWeatherByCoords(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.location.name).toBe('Negombo');
      expect(body.location.coordinates.latitude).toBe(7.2083);
      expect(body.current.temperatureCelsius).toBe(30.5);
      expect(body.current.feelsLikeCelsius).toBe(36.0);
      expect(body.current.humidityPercent).toBe(78);
      expect(body.current.windSpeedKmH).toBe(14.5);
      expect(body.current.description).toBe('Mainly clear');
    });

    it('returns 400 when coordinates are missing or invalid', async () => {
      const { req: req1, res: res1, getStatusCode: getCode1, getBody: getBody1 } = createMockReqRes({});
      await getCurrentWeatherByCoords(req1, res1);
      expect(getCode1()).toBe(400);
      expect(getBody1().error).toContain('required');

      const { req: req2, res: res2, getStatusCode: getCode2 } = createMockReqRes({ lat: '150', lon: '0' });
      await getCurrentWeatherByCoords(req2, res2);
      expect(getCode2()).toBe(400);
    });

    it('returns 504 on provider timeout', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });
      await getCurrentWeatherByCoords(req, res);

      expect(getStatusCode()).toBe(504);
      expect(getBody().error).toContain('timed out');
    });

    it('returns 502 on provider HTTP error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: true, reason: 'Upstream failed' }),
      } as unknown as Response);

      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });
      await getCurrentWeatherByCoords(req, res);

      expect(getStatusCode()).toBe(502);
      expect(getBody().error).toContain('provider error');
    });

    it('reuses cached current weather for identical coordinates', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      globalThis.fetch = fetchSpy;

      const { req: req1, res: res1 } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });
      const { req: req2, res: res2, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });

      await getCurrentWeatherByCoords(req1, res1);
      await getCurrentWeatherByCoords(req2, res2);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(getBody().current.temperatureCelsius).toBe(30.5);
    });
  });

  describe('GET /api/weather/hourly', () => {
    it('returns 24 hours of hourly forecast with timestamps and timezone', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      const { req, res, getStatusCode, getBody } = createMockReqRes({
        lat: '7.2083',
        lon: '79.8358',
        name: 'Negombo',
      });

      await getHourlyForecastByCoords(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.location.name).toBe('Negombo');
      expect(body.timezone).toBe('Asia/Colombo');
      expect(body.hourly).toHaveLength(24);
      expect(body.hourly[0]).toHaveProperty('timestamp');
      expect(body.hourly[0]).toHaveProperty('temperatureCelsius');
      expect(body.hourly[0]).toHaveProperty('windSpeedKmH');
    });

    it('returns 400 for invalid query parameters', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ lat: 'abc', lon: '79.8' });
      await getHourlyForecastByCoords(req, res);
      expect(getStatusCode()).toBe(400);
    });
  });

  describe('GET /api/weather/daily', () => {
    it('returns 7 days of daily forecasts', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      const { req, res, getStatusCode, getBody } = createMockReqRes({
        lat: '7.2083',
        lon: '79.8358',
        name: 'Negombo',
      });

      await getDailyForecastByCoords(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.location.name).toBe('Negombo');
      expect(body.timezone).toBe('Asia/Colombo');
      expect(body.daily).toHaveLength(7);
      expect(body.daily[0].date).toBe('2026-11-04');
      expect(body.daily[0].maxTemperatureCelsius).toBe(31.5);
      expect(body.daily[0].minTemperatureCelsius).toBe(25.0);
      expect(body.daily[0].uvIndexMax).toBe(9.0);
    });

    it('returns 400 for missing latitude or longitude', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ lat: '7.20' });
      await getDailyForecastByCoords(req, res);
      expect(getStatusCode()).toBe(400);
    });
  });
});

