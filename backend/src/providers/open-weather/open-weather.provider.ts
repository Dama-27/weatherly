import { mapOpenWeatherToCurrentWeather } from '../../adapters/openweathermap.adapter';
import type {
  CompleteWeatherResponse,
  CurrentWeather,
  GeoCoordinates,
  LocationInfo,
} from '../../types/weather-domain.types';
import type { WeatherData } from '../../types/weather.types';
import type { ForecastOptions, IWeatherProvider } from '../weather-provider.interface';

export class OpenWeatherMapProvider implements IWeatherProvider {
  public readonly providerName = 'openweathermap';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.openweathermap.org/data/2.5/weather') {
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || '';
    this.baseUrl = baseUrl;
  }

  public async getCurrentWeather(
    coordinates: GeoCoordinates,
    locationName?: string
  ): Promise<CurrentWeather> {
    if (!this.apiKey) {
      throw new Error('OPENWEATHER_API_KEY is not configured for OpenWeatherMap provider.');
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set('lat', coordinates.latitude.toString());
    url.searchParams.set('lon', coordinates.longitude.toString());
    url.searchParams.set('appid', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap request failed: ${response.status}`);
    }

    const rawData = (await response.json()) as WeatherData;
    return mapOpenWeatherToCurrentWeather(rawData, {
      name: locationName || rawData.name,
      coordinates,
    });
  }

  public async getForecast(
    coordinates: GeoCoordinates,
    _options?: ForecastOptions,
    locationName?: string
  ): Promise<CompleteWeatherResponse> {
    const current = await this.getCurrentWeather(coordinates, locationName);
    return {
      location: current.location,
      current,
      hourly: [],
      daily: [],
    };
  }

  public async getLocationMetadata(
    coordinates: GeoCoordinates,
    fallbackName?: string
  ): Promise<LocationInfo> {
    return {
      name: fallbackName || 'Unknown',
      coordinates,
      timezone: 'UTC',
    };
  }
}

