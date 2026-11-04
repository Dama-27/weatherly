export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  name: string;
  coordinates: GeoCoordinates;
  country?: string;
  timezone: string;
}

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
  dayNight: 'day' | 'night';
  isDay: boolean;
  timestamp: string;
  timezone: string;
}

export interface HourlyForecast {
  timestamp: string;
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
  dayNight: 'day' | 'night';
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
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

export interface LocationSearchResult {
  name: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface SavedLocation {
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
  timezone?: string;
}

/**
 * Legacy WeatherResult for the 10-city Comfort Index table/card dashboard view.
 */
export interface WeatherResult {
  rank: number;
  comfortScore: number | null;
  description: string;
  city: string;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  rain?: number | null;
}
