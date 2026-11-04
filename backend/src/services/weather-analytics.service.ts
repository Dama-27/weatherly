import { calculateComfortIndex, isCurrentWeather } from "../services/comfort-index.service";
import { mapOpenWeatherToCurrentWeather } from "../adapters/openweathermap.adapter";
import { WeatherData, RankedWeatherData } from "../types/weather.types";
import { ANALYTICS_CACHE_KEY } from "../utils/cache-keys";
import { getCached, setCached } from "./cache.service";

const RANKED_WEATHER_CACHE_TTL_SECONDS = 300;

export function createRankedWeatherResults(weatherData: WeatherData[]): RankedWeatherData[] {
    const cached = getCached<RankedWeatherData[]>(ANALYTICS_CACHE_KEY);

    if (cached) {
        console.log('[Cache] HIT processed analytics');
        return cached;
    }

    console.log('[Cache] MISS processed analytics');

    const results = weatherData.map((item) => {
        const score = calculateComfortIndex(item);
        const normalized = isCurrentWeather(item) ? item : mapOpenWeatherToCurrentWeather(item);

        return {
            comfortIndex: score,
            weatherData: item,
            normalizedWeather: normalized,
        };
    });

    results.sort((a, b) => b.comfortIndex - a.comfortIndex);
    const rankedResults: RankedWeatherData[] = results.map((item, index) => ({
        rank: index + 1,
        comfortIndex: item.comfortIndex,
        weatherData: item.weatherData,
        normalizedWeather: item.normalizedWeather,
    }));

    setCached(ANALYTICS_CACHE_KEY, rankedResults, RANKED_WEATHER_CACHE_TTL_SECONDS);

    return rankedResults;
}
