import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { clearCache } from '../services/cache.service';
import { askAssistant } from './assistant.controller';

function createMockReqRes(body: Record<string, any> = {}) {
  const req = { body } as unknown as Request;
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

describe('Assistant Controller (POST /api/assistant/ask)', () => {
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
      relative_humidity_2m: 75,
      apparent_temperature: 35.0,
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
      time: ['2026-11-04', '2026-11-05'],
      weather_code: [1, 2],
      temperature_2m_max: [31.5, 31.0],
      temperature_2m_min: [25.0, 25.5],
      sunrise: ['2026-11-04T05:58', '2026-11-05T05:58'],
      sunset: ['2026-11-04T17:50', '2026-11-05T17:50'],
      uv_index_max: [9.0, 8.5],
      precipitation_probability_max: [10, 20],
      precipitation_sum: [0.0, 0.5],
      wind_speed_10m_max: [18.0, 20.0],
    },
  };

  it('rejects empty or whitespace-only questions with 400', async () => {
    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: '   ',
      location: { latitude: 7.2083, longitude: 79.8358 },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('cannot be empty');
  });

  it('rejects questions exceeding 300 characters with 400', async () => {
    const longQuestion = 'a'.repeat(301);
    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: longQuestion,
      location: { latitude: 7.2083, longitude: 79.8358 },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('exceeds maximum length');
  });

  it('rejects invalid or missing location coordinates with 400', async () => {
    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: 'Will it rain?',
      location: { latitude: 'invalid', longitude: 79.8358 },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('valid finite number');
  });

  it('returns successful response with provider and weather context', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockOpenMeteoPayload),
    } as unknown as Response);

    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: 'Should I go running this evening?',
      location: { latitude: 7.2083, longitude: 79.8358, name: 'Negombo' },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(200);
    const body = getBody();
    expect(body).toHaveProperty('answer');
    expect(body).toHaveProperty('provider');
    expect(['gemini', 'rules']).toContain(body.provider);
    expect(body).toHaveProperty('weatherContext');
    expect(body.weatherContext.locationName).toBe('Negombo');
    expect(body.weatherContext.temperatureCelsius).toBe(30.5);
    expect(Array.isArray(body.suggestedFollowUps)).toBe(true);
  });

  it('returns 504 when weather provider aborts/times out', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: 'Should I run?',
      location: { latitude: 7.2083, longitude: 79.8358 },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(504);
    expect(getBody().error).toContain('timed out');
  });

  it('returns 502 when weather provider returns an HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ reason: 'Service unavailable' }),
    } as unknown as Response);

    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: 'Will it rain?',
      location: { latitude: 7.2083, longitude: 79.8358 },
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(502);
    expect(getBody().error).toContain('Weather provider error');
  });

  it('rejects request when location object is completely missing', async () => {
    const { req, res, getStatusCode, getBody } = createMockReqRes({
      question: 'Will it rain?',
    });

    await askAssistant(req, res);
    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('coordinates are required');
  });
});
