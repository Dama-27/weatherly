import type { IWeatherProvider } from './weather-provider.interface';
import { OpenMeteoProvider } from './open-meteo/open-meteo.provider';
import { OpenWeatherMapProvider } from './open-weather/open-weather.provider';

export type SupportedWeatherProvider = 'open-meteo' | 'openweathermap';

/**
 * Creates or retrieves the requested weather provider instance.
 * Defaults to 'open-meteo' when not specified or configured.
 */
export function createWeatherProvider(
  providerType?: string
): IWeatherProvider {
  const selected = (providerType || process.env.WEATHER_PROVIDER || 'open-meteo').toLowerCase();

  switch (selected) {
    case 'open-meteo':
    case 'openmeteo':
      return new OpenMeteoProvider();

    case 'openweathermap':
    case 'owm':
      return new OpenWeatherMapProvider();

    default:
      console.warn(
        `Unknown weather provider '${selected}'. Falling back to default 'open-meteo'.`
      );
      return new OpenMeteoProvider();
  }
}

