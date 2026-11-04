import { kelvinToCelsius, mpsToKmh, roundTo } from '../common/units';
import type { CurrentWeather, DayNightIndicator, LocationInfo } from '../types/weather-domain.types';
import type { WeatherData } from '../types/weather.types';

export type OpenWeatherMapRawPayload = WeatherData;

/**
 * Maps an OpenWeatherMap weather payload into the canonical CurrentWeather domain model.
 * Performs canonical unit conversions:
 * - Temperature: Kelvin -> Celsius
 * - Wind Speed: m/s -> km/h
 * - Atmospheric Pressure: preserves hPa
 * - Precipitation: preserves mm
 */
export function mapOpenWeatherToCurrentWeather(
  raw: OpenWeatherMapRawPayload,
  fallbackLocation?: Partial<LocationInfo>
): CurrentWeather {
  const locationName = raw.name || raw.cityName || fallbackLocation?.name || 'Unknown';
  const latitude = raw.coord?.lat ?? fallbackLocation?.coordinates?.latitude ?? 0;
  const longitude = raw.coord?.lon ?? fallbackLocation?.coordinates?.longitude ?? 0;

  // Format timezone string from OWM UTC offset (seconds) or fallback
  const timezoneStr = typeof raw.timezone === 'number'
    ? `UTC${raw.timezone >= 0 ? '+' : ''}${roundTo(raw.timezone / 3600, 1)}`
    : (fallbackLocation?.timezone || 'UTC');

  // Temperature & feels_like in OWM are reported in Kelvin by default
  const tempK = raw.main?.temp ?? 273.15;
  const tempCelsius = tempK > 150 ? kelvinToCelsius(tempK, 1) : roundTo(tempK, 1);

  const feelsLikeK = raw.main?.feels_like ?? tempK;
  const feelsLikeCelsius = feelsLikeK > 150 ? kelvinToCelsius(feelsLikeK, 1) : roundTo(feelsLikeK, 1);

  const humidity = roundTo(raw.main?.humidity ?? 0, 0);

  // Wind speed in OWM is m/s -> convert to km/h
  const windMps = raw.wind?.speed ?? 0;
  const windSpeedKmH = mpsToKmh(windMps, 1);
  const windDirection = raw.wind?.deg ?? 0;

  // Pressure in OWM is already hPa (default standard pressure ~1013.25)
  const pressureHpa = raw.main?.pressure ?? 1013.25;

  // Cloud cover percentage
  const cloudCover = raw.clouds?.all ?? 0;

  // Precipitation (past 1 hour rain in mm)
  const precipitationMm = roundTo(raw.rain?.['1h'] ?? 0, 2);

  // UV index (OWM 2.5 current weather endpoint does not provide UV index)
  const uvIndex = 0;

  const weatherItem = raw.weather?.[0];
  const conditionCode = weatherItem?.id ?? 800;
  const description = weatherItem?.description ?? 'Unknown';

  // Day/night detection based on observation time and sunrise/sunset
  let isDay = true;
  if (raw.dt != null && raw.sys?.sunrise != null && raw.sys?.sunset != null) {
    isDay = raw.dt >= raw.sys.sunrise && raw.dt < raw.sys.sunset;
  }
  const dayNight: DayNightIndicator = isDay ? 'day' : 'night';

  const timestamp = raw.dt != null
    ? new Date(raw.dt * 1000).toISOString()
    : new Date().toISOString();

  return {
    location: {
      name: locationName,
      coordinates: { latitude, longitude },
      country: raw.sys?.country ?? fallbackLocation?.country,
      timezone: timezoneStr,
    },
    temperatureCelsius: tempCelsius,
    feelsLikeCelsius: feelsLikeCelsius,
    humidityPercent: humidity,
    windSpeedKmH: windSpeedKmH,
    windDirectionDegrees: windDirection,
    pressureHpa: pressureHpa,
    cloudCoverPercent: cloudCover,
    precipitationMm: precipitationMm,
    uvIndex: uvIndex,
    conditionCode: conditionCode,
    description: description,
    dayNight: dayNight,
    isDay: isDay,
    timestamp: timestamp,
    timezone: timezoneStr,
  };
}
