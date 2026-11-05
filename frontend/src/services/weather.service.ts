import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  LocationInfo,
  LocationSearchResult,
  WeatherRecommendationsReport,
  WeatherResult,
} from '../types/weather';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

export interface WeatherData {
  id?: number;
  name?: string;
  cityCode?: number;
  cityName?: string;
  weather: Array<{ description: string }>;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  rain?: {
    '1h'?: number;
  };
}

export interface RankedWeatherData {
  comfortIndex: number;
  rank: number;
  weatherData: WeatherData;
}

function getAuthHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Searches locations using backend Open-Meteo geocoding proxy.
 */
export async function searchLocations(
  query: string,
  limit: number = 8,
  accessToken?: string
): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_URL}/locations/search?${params.toString()}`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || 'Failed to search locations');
  }

  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}

/**
 * Retrieves normalized current weather and location metadata by coordinates.
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
  name?: string,
  accessToken?: string
): Promise<{ location: LocationInfo; current: CurrentWeather }> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });
  if (name) {
    params.set('name', name);
  }

  const response = await fetch(`${API_URL}/weather/current?${params.toString()}`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || 'Failed to load current weather');
  }

  const data = await response.json();
  return data;
}

/**
 * Retrieves the next 24 hours of hourly weather data by coordinates.
 */
export async function getHourlyForecast(
  latitude: number,
  longitude: number,
  name?: string,
  accessToken?: string
): Promise<{ location: LocationInfo; timezone: string; hourly: HourlyForecast[] }> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });
  if (name) {
    params.set('name', name);
  }

  const response = await fetch(`${API_URL}/weather/hourly?${params.toString()}`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || 'Failed to load hourly forecast');
  }

  const data = await response.json();
  return data;
}

/**
 * Retrieves 7-day daily forecast by coordinates.
 */
export async function getDailyForecast(
  latitude: number,
  longitude: number,
  name?: string,
  accessToken?: string
): Promise<{ location: LocationInfo; timezone: string; daily: DailyForecast[] }> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });
  if (name) {
    params.set('name', name);
  }

  const response = await fetch(`${API_URL}/weather/daily?${params.toString()}`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || 'Failed to load daily forecast');
  }

  const data = await response.json();
  return data;
}

/**
 * Retrieves smart weather recommendations (activities, clothing, advice, optimal window) by coordinates.
 */
export async function getWeatherRecommendations(
  latitude: number,
  longitude: number,
  name?: string,
  accessToken?: string
): Promise<WeatherRecommendationsReport> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });
  if (name) {
    params.set('name', name);
  }

  const response = await fetch(`${API_URL}/weather/recommendations?${params.toString()}`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || 'Failed to load weather recommendations');
  }

  const data = await response.json();
  return data;
}

/**
 * Legacy 10-City Comfort Index weather data fetcher.
 */
function toCelsius(kelvinOrCelsius: number | undefined | null): number | null {
  if (kelvinOrCelsius == null || isNaN(kelvinOrCelsius)) {
    return null;
  }
  const celsius = kelvinOrCelsius > 150 ? kelvinOrCelsius - 273.15 : kelvinOrCelsius;
  return Math.round(celsius * 10) / 10;
}

function normalizeWeatherItem(item: RankedWeatherData, index: number): WeatherResult {
  const wd = item.weatherData;

  const city = wd?.name || wd?.cityName || 'N/A';
  const description = wd?.weather?.[0]?.description || 'N/A';

  const temperature = toCelsius(wd?.main?.temp);
  const feelsLike = toCelsius(wd?.main?.feels_like);

  const humidity = wd?.main?.humidity != null && !isNaN(wd.main.humidity)
    ? Math.round(wd.main.humidity)
    : null;

  const windSpeed = wd?.wind?.speed != null && !isNaN(wd.wind.speed)
    ? Math.round(wd.wind.speed * 10) / 10
    : null;

  const rain = wd?.rain?.['1h'] != null && !isNaN(wd.rain['1h'])
    ? Math.round(wd.rain['1h'] * 10) / 10
    : null;

  const comfortScore = item.comfortIndex != null && !isNaN(item.comfortIndex)
    ? Math.round(item.comfortIndex)
    : null;

  const rank = item.rank ?? index + 1;

  return {
    rank,
    comfortScore,
    description,
    city,
    temperature,
    feelsLike,
    humidity,
    windSpeed,
    rain,
  };
}

export async function getWeatherData(accessToken?: string): Promise<WeatherResult[]> {
  const response = await fetch(`${API_URL}/weather`, {
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const result = await response.json();
  const rawList: RankedWeatherData[] = Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result)
    ? result
    : [];

  return rawList.map((item, index) => normalizeWeatherItem(item, index));
}
