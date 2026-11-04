import { mapCurrentWeatherToLegacyWeatherData, mapOpenWeatherToCurrentWeather } from "../adapters/openweathermap.adapter";
import { env } from "../config/env";
import { createWeatherProvider } from "../providers/weather-provider.factory";
import type { CurrentWeather, GeoCoordinates } from "../types/weather-domain.types";
import { WeatherData } from "../types/weather.types";
import { weatherCacheKey } from "../utils/cache-keys";
import { getCached, setCached } from "./cache.service";
import { getCityCoordinates } from "./city.service";

const WEATHER_CACHE_TTL_SECONDS = 300;

/**
 * Retrieves weather data for a city code using the active provider (defaults to Open-Meteo).
 * Caches results for 300 seconds.
 * Returns legacy WeatherData format for complete backward compatibility.
 */
export async function getWeatherByCityCode(cityCode: string): Promise<WeatherData> {
  const cacheKey = weatherCacheKey(cityCode);
  const cachedWeather = getCached<WeatherData>(cacheKey);

  if (cachedWeather) {
    console.log(`[Cache] HIT ${cacheKey}`);
    return cachedWeather;
  }

  console.log(`[Cache] MISS ${cacheKey}`);

  const provider = createWeatherProvider(env.weatherProvider);

  let weather: WeatherData;

  if (provider.providerName === 'open-meteo') {
    const { coordinates, cityName } = await getCityCoordinates(cityCode);
    const currentWeather: CurrentWeather = await provider.getCurrentWeather(coordinates, cityName);
    weather = mapCurrentWeatherToLegacyWeatherData(currentWeather, cityCode);
  } else {
    // OpenWeatherMap provider fallback
    if (!env.openWeatherApiKey) {
      throw new Error('OPENWEATHER_API_KEY is not configured for OpenWeatherMap provider.');
    }

    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set('id', cityCode);
    url.searchParams.set('appid', env.openWeatherApiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap request failed: ${response.status}`);
    }

    weather = (await response.json()) as WeatherData;
  }

  setCached(cacheKey, weather, WEATHER_CACHE_TTL_SECONDS);
  return weather;
}

/**
 * Direct coordinate-based fetch returning the normalized CurrentWeather domain model.
 */
export async function getCurrentWeatherByCoordinates(
  coordinates: GeoCoordinates,
  locationName?: string
): Promise<CurrentWeather> {
  const provider = createWeatherProvider(env.weatherProvider);
  return provider.getCurrentWeather(coordinates, locationName);
}
