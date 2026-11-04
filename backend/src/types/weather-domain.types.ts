/**
 * Geographic coordinates (WGS84).
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Metadata describing a geographic location.
 */
export interface LocationInfo {
  name: string;
  coordinates: GeoCoordinates;
  country?: string;
  timezone: string;
}

/**
 * Day/night cycle indicator.
 */
export type DayNightIndicator = 'day' | 'night';

/**
 * Provider-independent normalized current weather snapshot.
 * Canonical units:
 * - Temperature: Celsius (°C)
 * - Feels-like Temperature: Celsius (°C)
 * - Humidity: percentage (0-100)
 * - Wind Speed: km/h
 * - Wind Direction: degrees (0-360)
 * - Wind Gusts: km/h
 * - Pressure: hPa
 * - Cloud Cover: percentage (0-100)
 * - Precipitation: mm
 * - UV Index: index value (>= 0)
 */
export interface CurrentWeather {
  location: LocationInfo;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  windSpeedKmH: number;
  windDirectionDegrees: number;
  windGustsKmH?: number;
  pressureHpa: number;
  cloudCoverPercent: number;
  precipitationMm: number;
  uvIndex: number;
  conditionCode: number | string;
  description: string;
  dayNight: DayNightIndicator;
  isDay: boolean;
  timestamp: string; // ISO 8601 observation timestamp
  timezone: string;
}

/**
 * Hourly forecast entry in canonical units.
 */
export interface HourlyForecast {
  timestamp: string; // ISO 8601 timestamp
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  precipitationMm: number;
  precipitationProbabilityPercent?: number;
  windSpeedKmH: number;
  windDirectionDegrees: number;
  pressureHpa: number;
  cloudCoverPercent: number;
  uvIndex: number;
  conditionCode: number | string;
  description: string;
  dayNight: DayNightIndicator;
  isDay: boolean;
}

/**
 * Daily forecast aggregate entry in canonical units.
 */
export interface DailyForecast {
  date: string; // YYYY-MM-DD
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  feelsLikeMinCelsius: number;
  feelsLikeMaxCelsius: number;
  precipitationSumMm: number;
  precipitationProbabilityMaxPercent?: number;
  maxWindSpeedKmH: number;
  dominantWindDirectionDegrees: number;
  conditionCode: number | string;
  description: string;
  uvIndexMax: number;
  sunrise?: string;
  sunset?: string;
}

/**
 * Complete weather response containing location, current conditions,
 * and forecast timelines.
 */
export interface CompleteWeatherResponse {
  location: LocationInfo;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}
