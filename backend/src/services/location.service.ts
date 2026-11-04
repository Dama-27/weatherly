import { getCached, setCached } from './cache.service';
import { locationSearchCacheKey } from '../utils/cache-keys';

export interface LocationSearchResult {
  name: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface GeocodingRawResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
}

export interface GeocodingApiResponse {
  results?: GeocodingRawResult[];
  generationtime_ms?: number;
  error?: boolean;
  reason?: string;
}

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const SEARCH_CACHE_TTL_SECONDS = 3600; // 1 hour
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Searches for geographical locations using the Open-Meteo Geocoding API.
 * Normalizes results and caches entries for 1 hour.
 */
export async function searchLocations(
  query: string,
  limit: number = 10,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<LocationSearchResult[]> {
  const cacheKey = locationSearchCacheKey(query, limit);
  const cached = getCached<LocationSearchResult[]>(cacheKey);

  if (cached) {
    console.log(`[Cache] HIT ${cacheKey}`);
    return cached;
  }

  console.log(`[Cache] MISS ${cacheKey}`);

  const url = new URL(GEOCODING_BASE_URL);
  url.searchParams.set('name', query);
  url.searchParams.set('count', limit.toString());
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API responded with HTTP status ${response.status}`);
    }

    const data = (await response.json()) as GeocodingApiResponse;

    if (data && data.error === true) {
      throw new Error(`Geocoding API error: ${data.reason || 'Unknown error'}`);
    }

    const rawList = Array.isArray(data?.results) ? data.results : [];

    const normalized: LocationSearchResult[] = rawList.map((item) => {
      const region = item.admin1 || item.admin2 || undefined;
      return {
        name: item.name,
        region,
        country: item.country || 'Unknown',
        countryCode: item.country_code ? item.country_code.toUpperCase() : undefined,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone || 'UTC',
      };
    });

    setCached(cacheKey, normalized, SEARCH_CACHE_TTL_SECONDS);
    return normalized;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      const timeoutError = new Error(`Location search request timed out after ${timeoutMs}ms`);
      (timeoutError as any).isTimeout = true;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

