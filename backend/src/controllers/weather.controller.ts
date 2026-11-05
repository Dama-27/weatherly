import { Request, Response } from "express";
import { parseCoordinates, ValidationError } from "../common/validation";
import { env } from "../config/env";
import { OpenMeteoError } from "../providers/open-meteo/open-meteo.types";
import { createWeatherProvider } from "../providers/weather-provider.factory";
import { getCached, setCached } from "../services/cache.service";
import { getCityCodes } from "../services/city.service";
import { createRankedWeatherResults } from "../services/weather-analytics.service";
import { analyzeWeather } from "../services/weather-intelligence.service";
import { generateRecommendations } from "../services/weather-recommendation.service";
import { evaluateAlertRules, MVP_ALERT_DISCLAIMER } from "../services/weather-alert.service";
import { getWeatherByCityCode } from "../services/weather.service";
import type { CompleteWeatherResponse, CurrentWeather } from "../types/weather-domain.types";
import type { WeatherIntelligenceReport } from "../types/weather-intelligence.types";
import type { WeatherRecommendationsReport } from "../types/weather-recommendation.types";
import type { AlertRule, TriggeredAlert } from "../types/weather-alert.types";
import {
  currentWeatherCacheKey,
  dailyWeatherCacheKey,
  hourlyWeatherCacheKey,
  intelligenceWeatherCacheKey,
  recommendationsWeatherCacheKey,
} from "../utils/cache-keys";

const WEATHER_CACHE_TTL_SECONDS = 300;

/**
 * GET /api/weather
 * Legacy endpoint: returns ranked weather data and Comfort Scores for 10 predefined cities.
 * Preserved for full backward-compatibility with existing frontend.
 */
export async function getWeather(_request: Request, response: Response): Promise<void> {
  try {
    const cityCodes = await getCityCodes();
    const results = await Promise.all(
      cityCodes.map((cityCode) => getWeatherByCityCode(cityCode))
    );

    const rankedResults = createRankedWeatherResults(results);

    response.json({ data: rankedResults });
  } catch (error) {
    console.error('Failed to retrieve weather data', error);

    response.status(500).json({
      error: 'Failed to retrieve weather data',
    });
  }
}

/**
 * GET /api/weather/current?lat=...&lon=...
 * Returns normalized current weather data and location metadata.
 */
export async function getCurrentWeatherByCoords(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const { latitude, longitude } = parseCoordinates(request.query.lat, request.query.lon);
    const locationName = typeof request.query.name === 'string' ? request.query.name : undefined;

    const cacheKey = currentWeatherCacheKey(latitude, longitude);
    const cached = getCached<CurrentWeather>(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT ${cacheKey}`);
      response.json({
        location: {
          ...cached.location,
          name: locationName || cached.location.name,
        },
        current: cached,
      });
      return;
    }

    console.log(`[Cache] MISS ${cacheKey}`);
    const provider = createWeatherProvider(env.weatherProvider);
    const currentWeather = await provider.getCurrentWeather(
      { latitude, longitude },
      locationName
    );

    setCached(cacheKey, currentWeather, WEATHER_CACHE_TTL_SECONDS);

    response.json({
      location: currentWeather.location,
      current: currentWeather,
    });
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'current weather');
  }
}

/**
 * GET /api/weather/hourly?lat=...&lon=...
 * Returns the next 24 hours of hourly weather data.
 */
export async function getHourlyForecastByCoords(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const { latitude, longitude } = parseCoordinates(request.query.lat, request.query.lon);
    const locationName = typeof request.query.name === 'string' ? request.query.name : undefined;

    const cacheKey = hourlyWeatherCacheKey(latitude, longitude, 24);
    const cached = getCached<any>(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT ${cacheKey}`);
      response.json({
        ...cached,
        location: {
          ...cached.location,
          name: locationName || cached.location.name,
        },
      });
      return;
    }

    console.log(`[Cache] MISS ${cacheKey}`);
    const provider = createWeatherProvider(env.weatherProvider);
    const forecast: CompleteWeatherResponse = await provider.getForecast(
      { latitude, longitude },
      { days: 2, includeHourly: true },
      locationName
    );

    // Limit to next 24 hours from current
    const next24Hours = forecast.hourly.slice(0, 24);

    const payload = {
      location: forecast.location,
      timezone: forecast.location.timezone,
      hourly: next24Hours,
    };

    setCached(cacheKey, payload, WEATHER_CACHE_TTL_SECONDS);

    response.json(payload);
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'hourly forecast');
  }
}

/**
 * GET /api/weather/daily?lat=...&lon=...
 * Returns seven days of forecasts.
 */
export async function getDailyForecastByCoords(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const { latitude, longitude } = parseCoordinates(request.query.lat, request.query.lon);
    const locationName = typeof request.query.name === 'string' ? request.query.name : undefined;

    const cacheKey = dailyWeatherCacheKey(latitude, longitude, 7);
    const cached = getCached<any>(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT ${cacheKey}`);
      response.json({
        ...cached,
        location: {
          ...cached.location,
          name: locationName || cached.location.name,
        },
      });
      return;
    }

    console.log(`[Cache] MISS ${cacheKey}`);
    const provider = createWeatherProvider(env.weatherProvider);
    const forecast: CompleteWeatherResponse = await provider.getForecast(
      { latitude, longitude },
      { days: 7, includeHourly: false },
      locationName
    );

    const payload = {
      location: forecast.location,
      timezone: forecast.location.timezone,
      daily: forecast.daily.slice(0, 7),
    };

    setCached(cacheKey, payload, WEATHER_CACHE_TTL_SECONDS);

    response.json(payload);
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'daily forecast');
  }
}

/**
 * GET /api/weather/intelligence?lat=...&lon=...
 * Calculates Comfort Score, evaluates active weather hazards, and synthesizes overall weather intelligence.
 */
export async function getWeatherIntelligenceByCoords(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const { latitude, longitude } = parseCoordinates(request.query.lat, request.query.lon);
    const locationName = typeof request.query.name === 'string' ? request.query.name : undefined;

    const cacheKey = intelligenceWeatherCacheKey(latitude, longitude);
    const cached = getCached<WeatherIntelligenceReport>(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT ${cacheKey}`);
      response.json({
        ...cached,
        location: {
          ...cached.location,
          name: locationName || cached.location.name,
        },
      });
      return;
    }

    console.log(`[Cache] MISS ${cacheKey}`);
    const provider = createWeatherProvider(env.weatherProvider);
    const currentWeather = await provider.getCurrentWeather(
      { latitude, longitude },
      locationName
    );

    const report = analyzeWeather(currentWeather);

    setCached(cacheKey, report, WEATHER_CACHE_TTL_SECONDS);

    response.json(report);
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'weather intelligence');
  }
}

/**
 * GET /api/weather/recommendations?lat=...&lon=...
 * Generates context-aware activity suitability, clothing suggestions, daily tips,
 * and optimal outdoor time windows from actual meteorological conditions.
 */
export async function getWeatherRecommendationsByCoords(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const { latitude, longitude } = parseCoordinates(request.query.lat, request.query.lon);
    const locationName = typeof request.query.name === 'string' ? request.query.name : undefined;

    const cacheKey = recommendationsWeatherCacheKey(latitude, longitude);
    const cached = getCached<WeatherRecommendationsReport>(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT ${cacheKey}`);
      response.json({
        ...cached,
        location: {
          ...cached.location,
          name: locationName || cached.location.name,
        },
      });
      return;
    }

    console.log(`[Cache] MISS ${cacheKey}`);
    const provider = createWeatherProvider(env.weatherProvider);
    const forecast: CompleteWeatherResponse = await provider.getForecast(
      { latitude, longitude },
      { days: 2, includeHourly: true },
      locationName
    );

    const report = generateRecommendations(forecast.current, forecast.hourly);

    setCached(cacheKey, report, WEATHER_CACHE_TTL_SECONDS);

    response.json(report);
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'weather recommendations');
  }
}

/**
 * POST /api/weather/alerts/evaluate
 * Evaluates configured weather alert rules against current conditions and near-term forecasts.
 * Accepts { rules: AlertRule[], defaultLocation?: AlertLocation }.
 */
export async function evaluateWeatherAlerts(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const rules = Array.isArray(request.body?.rules) ? (request.body.rules as AlertRule[]) : [];
    const enabledRules = rules.filter((r) => r && r.enabled);

    if (enabledRules.length === 0) {
      response.json({
        evaluatedCount: 0,
        triggeredCount: 0,
        alerts: [],
        disclaimer: MVP_ALERT_DISCLAIMER,
        evaluatedAt: new Date().toISOString(),
      });
      return;
    }

    // Optional query coordinate fallback
    let fallbackCoords: { latitude: number; longitude: number; name?: string } | undefined;
    if (request.query.lat && request.query.lon) {
      try {
        const parsed = parseCoordinates(request.query.lat, request.query.lon);
        fallbackCoords = {
          ...parsed,
          name: typeof request.query.name === 'string' ? request.query.name : undefined,
        };
      } catch {
        // ignore fallback parse error
      }
    } else if (request.body?.defaultLocation) {
      fallbackCoords = request.body.defaultLocation;
    }

    // Group rules by location
    const locationMap = new Map<
      string,
      { location: { latitude: number; longitude: number; name: string }; rules: AlertRule[] }
    >();

    for (const rule of enabledRules) {
      const lat = rule.location?.latitude ?? fallbackCoords?.latitude;
      const lon = rule.location?.longitude ?? fallbackCoords?.longitude;
      const name = rule.location?.name || fallbackCoords?.name || 'Selected Location';

      if (
        typeof lat !== 'number' ||
        typeof lon !== 'number' ||
        Number.isNaN(lat) ||
        Number.isNaN(lon)
      ) {
        continue;
      }

      const key = `${Math.round(lat * 100) / 100}:${Math.round(lon * 100) / 100}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          location: { latitude: lat, longitude: lon, name },
          rules: [],
        });
      }
      locationMap.get(key)!.rules.push(rule);
    }

    const provider = createWeatherProvider(env.weatherProvider);
    const allTriggeredAlerts: TriggeredAlert[] = [];
    let evaluatedCount = 0;

    for (const { location, rules: locRules } of locationMap.values()) {
      evaluatedCount += locRules.length;
      const forecast: CompleteWeatherResponse = await provider.getForecast(
        { latitude: location.latitude, longitude: location.longitude },
        { days: 2, includeHourly: true },
        location.name
      );

      const report = evaluateAlertRules(locRules, forecast.current, forecast.hourly);
      allTriggeredAlerts.push(...report.alerts);
    }

    const severityRank = { severe: 3, warning: 2, info: 1 };
    allTriggeredAlerts.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

    response.json({
      evaluatedCount,
      triggeredCount: allTriggeredAlerts.length,
      alerts: allTriggeredAlerts,
      disclaimer: MVP_ALERT_DISCLAIMER,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    handleWeatherControllerError(err, response, 'weather alert evaluation');
  }
}

/**
 * Centralized, safe error handler that prevents internal error leakages.
 */
function handleWeatherControllerError(
  err: unknown,
  response: Response,
  context: string
): void {
  if (err instanceof ValidationError) {
    response.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof OpenMeteoError) {
    if (err.isTimeout) {
      response.status(504).json({ error: `Weather provider timed out while retrieving ${context}` });
      return;
    }
    console.error(`OpenMeteoError in ${context}:`, err.message);
    response.status(502).json({ error: `Weather provider error while retrieving ${context}` });
    return;
  }

  if (err instanceof Error) {
    console.error(`Error in ${context}:`, err.message);
    response.status(502).json({ error: `Weather service unavailable while retrieving ${context}` });
    return;
  }

  console.error(`Unexpected error in ${context}:`, err);
  response.status(500).json({ error: `Internal server error while retrieving ${context}` });
}
