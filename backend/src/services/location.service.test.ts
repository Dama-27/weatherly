import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from './cache.service';
import { searchLocations } from './location.service';

describe('Location Service', () => {
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
        admin2: 'Gampaha District',
      },
    ],
  };

  it('searches locations and returns normalized results', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockGeocodingResponse),
    } as unknown as Response);

    const results = await searchLocations('Negombo', 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      name: 'Negombo',
      region: 'Western',
      country: 'Sri Lanka',
      countryCode: 'LK',
      latitude: 7.2083,
      longitude: 79.8358,
      timezone: 'Asia/Colombo',
    });
  });

  it('caches location search results on subsequent calls', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockGeocodingResponse),
    } as unknown as Response);

    globalThis.fetch = fetchSpy;

    const first = await searchLocations('Negombo', 10);
    const second = await searchLocations('Negombo', 10);

    expect(first).toEqual(second);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles empty results array gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    const results = await searchLocations('NonExistentPlaceXYZ', 5);
    expect(results).toEqual([]);
  });

  it('handles HTTP error responses from geocoding API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ error: true, reason: 'Service Unavailable' }),
    } as unknown as Response);

    await expect(searchLocations('Negombo')).rejects.toThrow('HTTP status 503');
  });

  it('handles request timeout', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    await expect(searchLocations('Negombo', 5, 200)).rejects.toThrow('timed out');
  });
});

