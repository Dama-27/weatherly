/**
 * Open-Meteo API raw response definitions.
 */

export interface OpenMeteoCurrent {
  time: string;
  interval?: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number; // 1 = day, 0 = night
  precipitation: number;
  rain?: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m?: number;
  uv_index?: number;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  apparent_temperature: number[];
  precipitation_probability?: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  uv_index?: number[];
}

export interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise?: string[];
  sunset?: string[];
  uv_index_max?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  current_units?: Record<string, string>;
  current?: OpenMeteoCurrent;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoHourly;
  daily_units?: Record<string, string>;
  daily?: OpenMeteoDaily;
  error?: boolean;
  reason?: string;
}

export class OpenMeteoError extends Error {
  public readonly statusCode?: number;
  public readonly isTimeout: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    options?: { statusCode?: number; isTimeout?: boolean; details?: unknown }
  ) {
    super(message);
    this.name = 'OpenMeteoError';
    this.statusCode = options?.statusCode;
    this.isTimeout = options?.isTimeout ?? false;
    this.details = options?.details;
  }
}

