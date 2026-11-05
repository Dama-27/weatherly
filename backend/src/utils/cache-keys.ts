/**
 * Centralized cache key generation utilities.
 * Keeps cache entries segregated by endpoint, location (rounded coordinates), and forecast parameters.
 */

export function weatherCacheKey(cityCode: string): string {
  return `weather:${cityCode}`;
}

export const ANALYTICS_CACHE_KEY = 'weather:analytics';

/**
 * Rounds a coordinate to a consistent precision for caching (default 2 decimals ~1.1km).
 */
export function roundCoordinate(coord: number, decimals: number = 2): string {
  return coord.toFixed(decimals);
}

/**
 * Cache key for normalized current weather by coordinates.
 * Format: weather:current:{lat}:{lon}
 */
export function currentWeatherCacheKey(lat: number, lon: number): string {
  return `weather:current:${roundCoordinate(lat)}:${roundCoordinate(lon)}`;
}

/**
 * Cache key for hourly forecast by coordinates.
 * Format: weather:hourly:{lat}:{lon}:{hours}
 */
export function hourlyWeatherCacheKey(lat: number, lon: number, hours: number = 24): string {
  return `weather:hourly:${roundCoordinate(lat)}:${roundCoordinate(lon)}:${hours}`;
}

/**
 * Cache key for daily forecast by coordinates.
 * Format: weather:daily:{lat}:{lon}:{days}
 */
export function dailyWeatherCacheKey(lat: number, lon: number, days: number = 7): string {
  return `weather:daily:${roundCoordinate(lat)}:${roundCoordinate(lon)}:${days}`;
}

/**
 * Cache key for weather intelligence by coordinates.
 * Format: weather:intelligence:{lat}:{lon}
 */
export function intelligenceWeatherCacheKey(lat: number, lon: number): string {
  return `weather:intelligence:${roundCoordinate(lat)}:${roundCoordinate(lon)}`;
}

/**
 * Cache key for weather recommendations by coordinates.
 * Format: weather:recommendations:{lat}:{lon}
 */
export function recommendationsWeatherCacheKey(lat: number, lon: number): string {
  return `weather:recommendations:${roundCoordinate(lat)}:${roundCoordinate(lon)}`;
}

/**
 * Cache key for location search results.
 * Format: location:search:{normalizedQuery}:{limit}
 */
export function locationSearchCacheKey(query: string, limit: number): string {
  return `location:search:${query.trim().toLowerCase()}:${limit}`;
}
