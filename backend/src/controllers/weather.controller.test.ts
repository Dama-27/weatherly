import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { clearCache } from '../services/cache.service';
import {
  evaluateWeatherAlerts,
  getCurrentWeatherByCoords,
  getDailyForecastByCoords,
  getHourlyForecastByCoords,
  getWeather,
  getWeatherIntelligenceByCoords,
  getWeatherRecommendationsByCoords,
} from './weather.controller';

function createMockReqRes(query: Record<string, any> = {}, body: Record<string, any> = {}) {
  const req = { query, body } as unknown as Request;
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

  describe('GET /api/weather/intelligence', () => {
    it('returns structured intelligence report with comfort score and risk assessment', async () => {
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

      await getWeatherIntelligenceByCoords(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.location.name).toBe('Negombo');
      expect(body).toHaveProperty('comfortScore');
      expect(typeof body.comfortScore).toBe('number');
      expect(body).toHaveProperty('overallStatus');
      expect(['optimal', 'favorable', 'caution', 'adverse']).toContain(body.overallStatus);
      expect(body).toHaveProperty('summary');
      expect(Array.isArray(body.risks)).toBe(true);
      expect(body).toHaveProperty('advisoryDisclaimer');
      expect(body.advisoryDisclaimer).toContain('does not replace or supersede official warnings');

      // Given mock payload has apparent_temp 36°C and uv_index 8.0, check detected risks
      expect(body.risks.length).toBeGreaterThan(0);
      const riskTypes = body.risks.map((r: any) => r.type);
      expect(riskTypes).toContain('extreme_heat');
      expect(riskTypes).toContain('high_uv');
    });

    it('returns 400 when coordinates are invalid', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: 'invalid', lon: '79.8' });
      await getWeatherIntelligenceByCoords(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('valid finite number');
    });

    it('reuses cached intelligence report on subsequent identical queries', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      globalThis.fetch = fetchSpy;

      const { req: req1, res: res1 } = createMockReqRes({ lat: '7.2083', lon: '79.8358', name: 'Negombo' });
      const { req: req2, res: res2, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358', name: 'Negombo' });

      await getWeatherIntelligenceByCoords(req1, res1);
      await getWeatherIntelligenceByCoords(req2, res2);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(getBody().location.name).toBe('Negombo');
    });

    it('returns 504 on provider timeout', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });
      await getWeatherIntelligenceByCoords(req, res);

      expect(getStatusCode()).toBe(504);
      expect(getBody().error).toContain('timed out');
    });
  });

  describe('GET /api/weather/recommendations', () => {
    it('returns structured recommendations including activities, clothing, advice, and best time window', async () => {
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

      await getWeatherRecommendationsByCoords(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.location.name).toBe('Negombo');
      expect(body).toHaveProperty('comfortScore');
      expect(body).toHaveProperty('overallStatus');
      expect(body).toHaveProperty('activities');
      expect(Array.isArray(body.activities)).toBe(true);
      expect(body.activities).toHaveLength(7);

      const walking = body.activities.find((a: any) => a.activity === 'Walking');
      expect(walking).toBeDefined();
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(walking.suitability);

      expect(body).toHaveProperty('clothing');
      expect(Array.isArray(body.clothing)).toBe(true);
      expect(body.clothing.length).toBeGreaterThan(0);

      expect(body).toHaveProperty('dailyAdvice');
      expect(Array.isArray(body.dailyAdvice)).toBe(true);

      expect(body).toHaveProperty('bestOutdoorWindow');
    });

    it('returns 400 when coordinates are invalid', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: '95', lon: '0' });
      await getWeatherRecommendationsByCoords(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('between -90 and 90');
    });

    it('reuses cached recommendations on subsequent identical queries', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      globalThis.fetch = fetchSpy;

      const { req: req1, res: res1 } = createMockReqRes({ lat: '7.2083', lon: '79.8358', name: 'Negombo' });
      const { req: req2, res: res2, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358', name: 'Negombo' });

      await getWeatherRecommendationsByCoords(req1, res1);
      await getWeatherRecommendationsByCoords(req2, res2);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(getBody().location.name).toBe('Negombo');
    });

    it('returns 504 on provider timeout', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes({ lat: '7.2083', lon: '79.8358' });
      await getWeatherRecommendationsByCoords(req, res);

      expect(getStatusCode()).toBe(504);
      expect(getBody().error).toContain('timed out');
    });
  });

  describe('POST /api/weather/alerts/evaluate', () => {
    it('returns empty alert report when rules array is empty', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { rules: [] });
      await evaluateWeatherAlerts(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.evaluatedCount).toBe(0);
      expect(body.triggeredCount).toBe(0);
      expect(body.alerts).toEqual([]);
      expect(body.disclaimer).toContain('MVP Notice');
    });

    it('evaluates enabled rules against weather forecast and returns triggered alerts', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      const rules = [
        {
          id: 'rule-temp-trigger',
          type: 'temp_above',
          threshold: 28.0, // mock payload temp is 29.5
          enabled: true,
          location: { latitude: 7.2083, longitude: 79.8358, name: 'Negombo' },
          createdAt: '2026-11-05T10:00:00Z',
        },
        {
          id: 'rule-disabled-no-trigger',
          type: 'temp_above',
          threshold: 20.0,
          enabled: false,
          location: { latitude: 7.2083, longitude: 79.8358, name: 'Negombo' },
          createdAt: '2026-11-05T10:00:00Z',
        },
      ];

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        { lat: '7.2083', lon: '79.8358' },
        { rules }
      );

      await evaluateWeatherAlerts(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body.evaluatedCount).toBe(1); // Only enabled rule counted
      expect(body.triggeredCount).toBe(1);
      expect(body.alerts[0].ruleId).toBe('rule-temp-trigger');
      expect(body.alerts[0].actualValue).toBe(30.5);
    });

    it('returns 504 when weather provider aborts/times out during evaluation', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const rules = [
        {
          id: 'rule-1',
          type: 'temp_above',
          threshold: 25.0,
          enabled: true,
          location: { latitude: 7.2083, longitude: 79.8358, name: 'Negombo' },
          createdAt: '2026-11-05T10:00:00Z',
        },
      ];

      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { rules });
      await evaluateWeatherAlerts(req, res);

      expect(getStatusCode()).toBe(504);
      expect(getBody().error).toContain('timed out');
    });
  });

  describe('GET /api/weather (Legacy 10-City Comfort Index Endpoint)', () => {
    it('returns ranked weather results for predefined cities with comfort scores', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
      } as unknown as Response);

      const { req, res, getStatusCode, getBody } = createMockReqRes();
      await getWeather(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Verify ranking structure and ordering
      const first = body.data[0];
      expect(first).toHaveProperty('rank');
      expect(first.rank).toBe(1);
      expect(first).toHaveProperty('comfortIndex');
      expect(typeof first.comfortIndex).toBe('number');
      expect(first).toHaveProperty('weatherData');
      expect(first).toHaveProperty('normalizedWeather');

      // Verify rankings are sorted in descending order of comfort score
      for (let i = 1; i < body.data.length; i++) {
        expect(body.data[i - 1].comfortIndex).toBeGreaterThanOrEqual(body.data[i].comfortIndex);
        expect(body.data[i].rank).toBe(i + 1);
      }
    });
  });
});

