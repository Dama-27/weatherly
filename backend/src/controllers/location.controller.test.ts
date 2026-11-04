import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { clearCache } from '../services/cache.service';
import { searchLocations } from './location.controller';

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

describe('Location Controller', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
  });

  const mockGeocodingResponse = {
    results: [
      {
        id: 1233816,
        name: 'Negombo',
        latitude: 7.2083,
        longitude: 79.8358,
        country_code: 'lk',
        timezone: 'Asia/Colombo',
        country: 'Sri Lanka',
        admin1: 'Western',
      },
    ],
  };

  it('successfully returns location results and count', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockGeocodingResponse),
    } as unknown as Response);

    const { req, res, getStatusCode, getBody } = createMockReqRes({ q: 'Negombo', limit: '5' });

    await searchLocations(req, res);

    expect(getStatusCode()).toBe(200);
    const body = getBody();
    expect(body.count).toBe(1);
    expect(body.results[0].name).toBe('Negombo');
    expect(body.results[0].country).toBe('Sri Lanka');
    expect(body.results[0].countryCode).toBe('LK');
    expect(body.results[0].region).toBe('Western');
  });

  it('returns 400 when search query is missing or empty', async () => {
    const { req, res, getStatusCode, getBody } = createMockReqRes({});
    await searchLocations(req, res);

    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('required');
  });

  it('returns 400 when search query is shorter than 2 characters', async () => {
    const { req, res, getStatusCode, getBody } = createMockReqRes({ q: 'a' });
    await searchLocations(req, res);

    expect(getStatusCode()).toBe(400);
    expect(getBody().error).toContain('at least 2 characters');
  });

  it('returns 504 when geocoding request times out', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const { req, res, getStatusCode, getBody } = createMockReqRes({ q: 'Negombo' });
    await searchLocations(req, res);

    expect(getStatusCode()).toBe(504);
    expect(getBody().error).toContain('timed out');
  });

  it('returns 502 when geocoding service encounters HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: vi.fn().mockResolvedValue({ error: true }),
    } as unknown as Response);

    const { req, res, getStatusCode, getBody } = createMockReqRes({ q: 'Negombo' });
    await searchLocations(req, res);

    expect(getStatusCode()).toBe(502);
    expect(getBody().error).toContain('geocoding service');
  });
});

