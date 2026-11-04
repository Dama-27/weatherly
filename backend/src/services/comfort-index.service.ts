import {
    calculateFeelsLikeScore,
    calculateHumidityScore,
    calculateWindScore,
    calculateRainScore
} from "../common/normalize";
import { mapOpenWeatherToCurrentWeather } from "../adapters/openweathermap.adapter";
import type { CurrentWeather } from "../types/weather-domain.types";
import type { WeatherData } from "../types/weather.types";

/**
 * Type guard to identify whether input is the normalized CurrentWeather domain model.
 */
export function isCurrentWeather(input: CurrentWeather | WeatherData): input is CurrentWeather {
    return (
        typeof input === 'object' &&
        input !== null &&
        'feelsLikeCelsius' in input &&
        'windSpeedKmH' in input &&
        'humidityPercent' in input
    );
}

/**
 * Calculates Comfort Index (0-100 score) directly from the normalized CurrentWeather domain model.
 * Canonical inputs:
 * - feelsLikeCelsius: temperature in °C
 * - humidityPercent: relative humidity in %
 * - windSpeedKmH: wind speed in km/h
 * - precipitationMm: rainfall in mm
 */
export function calculateComfortIndexFromDomain(weather: CurrentWeather): number {
    const feelsLikeScore = calculateFeelsLikeScore(weather.feelsLikeCelsius);
    const humidityScore = calculateHumidityScore(weather.humidityPercent);
    const windSpeedScore = calculateWindScore(weather.windSpeedKmH);
    const rainScore = calculateRainScore(weather.precipitationMm);

    const comfortScore = feelsLikeScore * 0.5 + humidityScore * 0.3 + windSpeedScore * 0.1 + rainScore * 0.1;
    return Math.round(Math.max(0, Math.min(100, comfortScore)));
}

/**
 * Calculates Comfort Index (0-100 integer score).
 * Accepts either the normalized CurrentWeather domain model or legacy WeatherData.
 * Adapts legacy WeatherData through canonical domain mapping without altering scoring behavior.
 */
export function calculateComfortIndex(weatherData: CurrentWeather | WeatherData): number {
    if (isCurrentWeather(weatherData)) {
        return calculateComfortIndexFromDomain(weatherData);
    }

    const normalized = mapOpenWeatherToCurrentWeather(weatherData);
    return calculateComfortIndexFromDomain(normalized);
}
