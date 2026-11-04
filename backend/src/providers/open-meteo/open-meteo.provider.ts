import { roundTo } from '../../common/units';
import { getWmoWeatherDescription } from '../../common/wmo-weather-codes';
import type {
  CompleteWeatherResponse,
  CurrentWeather,
  DailyForecast,
  DayNightIndicator,
  GeoCoordinates,
  HourlyForecast,
  LocationInfo,
} from '../../types/weather-domain.types';
import type { ForecastOptions, IWeatherProvider } from '../weather-provider.interface';
import {
  OpenMeteoCurrent,
  OpenMeteoError,
  OpenMeteoResponse,
} from './open-meteo.types';

export interface OpenMeteoProviderConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_TIMEOUT_MS = 8000;

const CURRENT_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'rain',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'uv_index',
].join(',');

const HOURLY_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'uv_index',
].join(',');

const DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'uv_index_max',
  'precipitation_probability_max',
  'precipitation_sum',
  'wind_speed_10m_max',
].join(',');

export class OpenMeteoProvider implements IWeatherProvider {
  public readonly providerName = 'open-meteo';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config?: OpenMeteoProviderConfig) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Retrieves current weather conditions for the specified coordinates.
   */
  public async getCurrentWeather(
    coordinates: GeoCoordinates,
    locationName?: string
  ): Promise<CurrentWeather> {
    this.validateCoordinates(coordinates);

    const url = new URL(this.baseUrl);
    url.searchParams.set('latitude', coordinates.latitude.toString());
    url.searchParams.set('longitude', coordinates.longitude.toString());
    url.searchParams.set('current', CURRENT_VARIABLES);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('precipitation_unit', 'mm');

    const data = await this.executeRequest<OpenMeteoResponse>(url.toString());

    if (!data || typeof data !== 'object') {
      throw new OpenMeteoError('Open-Meteo returned an empty or invalid payload');
    }

    if (!data.current) {
      throw new OpenMeteoError(
        'Invalid Open-Meteo response: missing current weather payload'
      );
    }

    return this.normalizeCurrentWeather(data, coordinates, locationName);
  }

  /**
   * Retrieves current weather and forecast (hourly & 7-day daily) for the specified coordinates.
   */
  public async getForecast(
    coordinates: GeoCoordinates,
    options?: ForecastOptions,
    locationName?: string
  ): Promise<CompleteWeatherResponse> {
    this.validateCoordinates(coordinates);

    const forecastDays = options?.days ?? 7;
    const includeHourly = options?.includeHourly ?? true;

    const url = new URL(this.baseUrl);
    url.searchParams.set('latitude', coordinates.latitude.toString());
    url.searchParams.set('longitude', coordinates.longitude.toString());
    url.searchParams.set('current', CURRENT_VARIABLES);
    url.searchParams.set('daily', DAILY_VARIABLES);
    url.searchParams.set('forecast_days', forecastDays.toString());
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('precipitation_unit', 'mm');

    if (includeHourly) {
      url.searchParams.set('hourly', HOURLY_VARIABLES);
    }

    const data = await this.executeRequest<OpenMeteoResponse>(url.toString());

    if (!data || !data.current) {
      throw new OpenMeteoError(
        'Invalid Open-Meteo response: missing current weather payload in forecast request'
      );
    }

    const locationInfo: LocationInfo = {
      name: locationName || 'Unknown',
      coordinates,
      timezone: data.timezone || 'UTC',
    };

    const current = this.normalizeCurrentWeather(data, coordinates, locationName);
    const hourly = this.normalizeHourlyForecast(data);
    const daily = this.normalizeDailyForecast(data);

    return {
      location: locationInfo,
      current,
      hourly,
      daily,
    };
  }

  /**
   * Resolves basic location metadata.
   */
  public async getLocationMetadata(
    coordinates: GeoCoordinates,
    fallbackName?: string
  ): Promise<LocationInfo> {
    this.validateCoordinates(coordinates);
    return {
      name: fallbackName || 'Unknown',
      coordinates,
      timezone: 'UTC',
    };
  }

  /**
   * Executes fetch with timeout, parsing and comprehensive error handling.
   */
  private async executeRequest<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        let errorDetails: string | undefined;
        try {
          const errorJson = await response.json();
          if (errorJson && typeof errorJson === 'object') {
            errorDetails = (errorJson as any).reason || JSON.stringify(errorJson);
          }
        } catch {
          // Response body was not JSON; proceed with status
        }

        throw new OpenMeteoError(
          `Open-Meteo API HTTP error (${response.status}): ${
            errorDetails || response.statusText || 'Request failed'
          }`,
          { statusCode: response.status, details: errorDetails }
        );
      }

      const json = await response.json();

      if (json && typeof json === 'object' && (json as any).error === true) {
        throw new OpenMeteoError(
          `Open-Meteo returned error: ${(json as any).reason || 'Unknown error'}`,
          { details: json }
        );
      }

      return json as T;
    } catch (err: unknown) {
      if (err instanceof OpenMeteoError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          throw new OpenMeteoError(
            `Open-Meteo request timed out after ${this.timeoutMs}ms`,
            { isTimeout: true }
          );
        }
        throw new OpenMeteoError(`Open-Meteo request failed: ${err.message}`, {
          details: err,
        });
      }

      throw new OpenMeteoError('Open-Meteo request failed with an unknown error');
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Normalizes Open-Meteo current weather payload into CurrentWeather domain model.
   */
  private normalizeCurrentWeather(
    data: OpenMeteoResponse,
    coordinates: GeoCoordinates,
    locationName?: string
  ): CurrentWeather {
    const c = data.current as OpenMeteoCurrent;
    const isDay = c.is_day === 1;
    const dayNight: DayNightIndicator = isDay ? 'day' : 'night';
    const conditionCode = c.weather_code ?? 0;
    const description = getWmoWeatherDescription(conditionCode);

    // Precipitation: prefer precipitation field, fallback to rain
    const precipitation = c.precipitation != null && Number.isFinite(c.precipitation)
      ? c.precipitation
      : (c.rain ?? 0);

    const timestamp = c.time
      ? this.parseIsoTimestamp(c.time, data.timezone)
      : new Date().toISOString();

    return {
      location: {
        name: locationName || 'Unknown',
        coordinates: {
          latitude: data.latitude ?? coordinates.latitude,
          longitude: data.longitude ?? coordinates.longitude,
        },
        timezone: data.timezone || 'UTC',
      },
      temperatureCelsius: roundTo(c.temperature_2m ?? 0, 1),
      feelsLikeCelsius: roundTo(c.apparent_temperature ?? c.temperature_2m ?? 0, 1),
      humidityPercent: roundTo(c.relative_humidity_2m ?? 0, 0),
      windSpeedKmH: roundTo(c.wind_speed_10m ?? 0, 1),
      windDirectionDegrees: roundTo(c.wind_direction_10m ?? 0, 0),
      windGustsKmH: c.wind_gusts_10m != null ? roundTo(c.wind_gusts_10m, 1) : undefined,
      pressureHpa: roundTo(c.pressure_msl ?? 1013.25, 1),
      cloudCoverPercent: roundTo(c.cloud_cover ?? 0, 0),
      precipitationMm: roundTo(precipitation, 2),
      uvIndex: roundTo(c.uv_index ?? 0, 1),
      conditionCode,
      description,
      dayNight,
      isDay,
      timestamp,
      timezone: data.timezone || 'UTC',
    };
  }

  /**
   * Normalizes column-oriented hourly arrays into an array of HourlyForecast domain objects.
   */
  private normalizeHourlyForecast(data: OpenMeteoResponse): HourlyForecast[] {
    const h = data.hourly;
    if (!h || !Array.isArray(h.time)) {
      return [];
    }

    const count = h.time.length;
    const result: HourlyForecast[] = [];

    for (let i = 0; i < count; i++) {
      const code = h.weather_code?.[i] ?? 0;
      const desc = getWmoWeatherDescription(code);

      result.push({
        timestamp: h.time[i],
        temperatureCelsius: roundTo(h.temperature_2m?.[i] ?? 0, 1),
        feelsLikeCelsius: roundTo(h.apparent_temperature?.[i] ?? h.temperature_2m?.[i] ?? 0, 1),
        humidityPercent: roundTo(h.relative_humidity_2m?.[i] ?? 0, 0),
        precipitationMm: roundTo(h.precipitation?.[i] ?? 0, 2),
        precipitationProbabilityPercent: h.precipitation_probability?.[i] != null
          ? roundTo(h.precipitation_probability[i], 0)
          : undefined,
        windSpeedKmH: roundTo(h.wind_speed_10m?.[i] ?? 0, 1),
        windDirectionDegrees: 0,
        pressureHpa: 1013.25,
        cloudCoverPercent: 0,
        uvIndex: roundTo(h.uv_index?.[i] ?? 0, 1),
        conditionCode: code,
        description: desc,
        dayNight: 'day',
        isDay: true,
      });
    }

    return result;
  }

  /**
   * Normalizes column-oriented daily arrays into an array of DailyForecast domain objects.
   */
  private normalizeDailyForecast(data: OpenMeteoResponse): DailyForecast[] {
    const d = data.daily;
    if (!d || !Array.isArray(d.time)) {
      return [];
    }

    const count = d.time.length;
    const result: DailyForecast[] = [];

    for (let i = 0; i < count; i++) {
      const code = d.weather_code?.[i] ?? 0;
      const desc = getWmoWeatherDescription(code);

      result.push({
        date: d.time[i],
        minTemperatureCelsius: roundTo(d.temperature_2m_min?.[i] ?? 0, 1),
        maxTemperatureCelsius: roundTo(d.temperature_2m_max?.[i] ?? 0, 1),
        feelsLikeMinCelsius: roundTo(d.temperature_2m_min?.[i] ?? 0, 1),
        feelsLikeMaxCelsius: roundTo(d.temperature_2m_max?.[i] ?? 0, 1),
        precipitationSumMm: roundTo(d.precipitation_sum?.[i] ?? 0, 2),
        precipitationProbabilityMaxPercent: d.precipitation_probability_max?.[i] != null
          ? roundTo(d.precipitation_probability_max[i], 0)
          : undefined,
        maxWindSpeedKmH: roundTo(d.wind_speed_10m_max?.[i] ?? 0, 1),
        dominantWindDirectionDegrees: 0,
        conditionCode: code,
        description: desc,
        uvIndexMax: roundTo(d.uv_index_max?.[i] ?? 0, 1),
        sunrise: d.sunrise?.[i],
        sunset: d.sunset?.[i],
      });
    }

    return result;
  }

  /**
   * Converts Open-Meteo local date-time strings (e.g. '2026-11-04T12:00') into valid ISO 8601 strings.
   */
  private parseIsoTimestamp(timeStr: string, timezone?: string): string {
    if (timeStr.includes('Z') || timeStr.includes('+')) {
      return new Date(timeStr).toISOString();
    }
    // Attempt standard parse; fallback to appending Z if needed
    const parsed = new Date(timeStr);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return new Date(`${timeStr}Z`).toISOString();
  }

  private validateCoordinates(coords: GeoCoordinates): void {
    if (
      coords == null ||
      typeof coords.latitude !== 'number' ||
      typeof coords.longitude !== 'number' ||
      !Number.isFinite(coords.latitude) ||
      !Number.isFinite(coords.longitude)
    ) {
      throw new OpenMeteoError(
        `Invalid coordinates: latitude and longitude must be finite numbers (received ${JSON.stringify(coords)})`
      );
    }

    if (coords.latitude < -90 || coords.latitude > 90) {
      throw new OpenMeteoError(
        `Invalid latitude ${coords.latitude}: must be between -90 and 90`
      );
    }

    if (coords.longitude < -180 || coords.longitude > 180) {
      throw new OpenMeteoError(
        `Invalid longitude ${coords.longitude}: must be between -180 and 180`
      );
    }
  }
}

