/**
 * Validation utilities for API query parameters.
 */

export class ValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CoordinateParams {
  latitude: number;
  longitude: number;
}

/**
 * Validates and extracts latitude and longitude from request query.
 * - Latitude must be finite and between -90 and 90.
 * - Longitude must be finite and between -180 and 180.
 */
export function parseCoordinates(latQuery: unknown, lonQuery: unknown): CoordinateParams {
  if (latQuery == null || latQuery === '' || lonQuery == null || lonQuery === '') {
    throw new ValidationError("Missing required query parameters: 'lat' and 'lon' are both required.");
  }

  const latitude = Number(latQuery);
  const longitude = Number(lonQuery);

  if (!Number.isFinite(latitude) || Number.isNaN(latitude)) {
    throw new ValidationError("Parameter 'lat' must be a valid finite number.");
  }

  if (!Number.isFinite(longitude) || Number.isNaN(longitude)) {
    throw new ValidationError("Parameter 'lon' must be a valid finite number.");
  }

  if (latitude < -90 || latitude > 90) {
    throw new ValidationError(`Latitude ${latitude} is out of bounds. Must be between -90 and 90.`);
  }

  if (longitude < -180 || longitude > 180) {
    throw new ValidationError(`Longitude ${longitude} is out of bounds. Must be between -180 and 180.`);
  }

  return { latitude, longitude };
}

export interface LocationSearchParams {
  query: string;
  limit: number;
}

/**
 * Validates and extracts search query and optional result limit.
 * - Query must be at least 2 characters long (after trimming).
 * - Limit must be a positive integer (default: 10, max: 20).
 */
export function parseSearchQuery(queryParam: unknown, limitParam?: unknown): LocationSearchParams {
  if (typeof queryParam !== 'string' || queryParam.trim().length === 0) {
    throw new ValidationError("Search query parameter 'q' is required and cannot be empty.");
  }

  const trimmed = queryParam.trim();
  if (trimmed.length < 2) {
    throw new ValidationError("Search query 'q' must be at least 2 characters long.");
  }

  let limit = 10;
  if (limitParam != null && limitParam !== '') {
    const parsedLimit = Number(limitParam);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new ValidationError("Query parameter 'limit' must be a positive integer.");
    }
    limit = Math.min(parsedLimit, 20);
  }

  return { query: trimmed, limit };
}

