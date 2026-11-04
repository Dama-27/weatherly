import type {
  CompleteWeatherResponse,
  CurrentWeather,
  GeoCoordinates,
  LocationInfo,
} from '../types/weather-domain.types';

export interface ForecastOptions {
  /**
   * Number of days for the forecast (default: 7).
   */
  days?: number;
  /**
   * Whether to include hourly breakdown (default: true).
   */
  includeHourly?: boolean;
}

/**
 * Provider-agnostic interface for weather services.
 * Implementations may integrate Open-Meteo, OpenWeatherMap, or mock/test data.
 */
export interface IWeatherProvider {
  /**
   * Unique name of the weather provider (e.g., 'open-meteo', 'openweathermap').
   */
  readonly providerName: string;

  /**
   * Retrieves current weather conditions for the specified geographic coordinates.
   *
   * @param coordinates - Latitude and longitude of the location.
   * @param locationName - Optional human-readable location label.
   */
  getCurrentWeather(coordinates: GeoCoordinates, locationName?: string): Promise<CurrentWeather>;

  /**
   * Retrieves weather forecast (daily and/or hourly) for the specified coordinates.
   *
   * @param coordinates - Latitude and longitude of the location.
   * @param options - Forecast parameters (days, hourly flags).
   * @param locationName - Optional human-readable location label.
   */
  getForecast(
    coordinates: GeoCoordinates,
    options?: ForecastOptions,
    locationName?: string
  ): Promise<CompleteWeatherResponse>;

  /**
   * Resolves metadata for a location by coordinates or name where supported.
   *
   * @param coordinates - Geographic coordinates.
   * @param fallbackName - Fallback name if reverse geocoding is unavailable.
   */
  getLocationMetadata?(coordinates: GeoCoordinates, fallbackName?: string): Promise<LocationInfo>;
}

