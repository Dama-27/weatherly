/**
 * WMO (World Meteorological Organization) weather interpretation codes.
 * Standard code mapping used by Open-Meteo.
 */

export interface WmoCodeInfo {
  code: number;
  description: string;
  category: string;
}

export const WMO_CODE_MAP: Record<number, { description: string; category: string }> = {
  0: { description: 'Clear sky', category: 'Clear sky' },
  1: { description: 'Mainly clear', category: 'Mainly clear' },
  2: { description: 'Partly cloudy', category: 'Partly cloudy' },
  3: { description: 'Overcast', category: 'Overcast' },
  45: { description: 'Fog', category: 'Fog' },
  48: { description: 'Depositing rime fog', category: 'Fog' },
  51: { description: 'Light drizzle', category: 'Drizzle' },
  53: { description: 'Moderate drizzle', category: 'Drizzle' },
  55: { description: 'Dense drizzle', category: 'Drizzle' },
  56: { description: 'Light freezing drizzle', category: 'Drizzle' },
  57: { description: 'Dense freezing drizzle', category: 'Drizzle' },
  61: { description: 'Slight rain', category: 'Rain' },
  63: { description: 'Moderate rain', category: 'Rain' },
  65: { description: 'Heavy rain', category: 'Rain' },
  66: { description: 'Light freezing rain', category: 'Freezing rain' },
  67: { description: 'Heavy freezing rain', category: 'Freezing rain' },
  71: { description: 'Slight snow fall', category: 'Snow' },
  73: { description: 'Moderate snow fall', category: 'Snow' },
  75: { description: 'Heavy snow fall', category: 'Snow' },
  77: { description: 'Snow grains', category: 'Snow' },
  80: { description: 'Slight rain showers', category: 'Rain showers' },
  81: { description: 'Moderate rain showers', category: 'Rain showers' },
  82: { description: 'Violent rain showers', category: 'Rain showers' },
  85: { description: 'Slight snow showers', category: 'Snow showers' },
  86: { description: 'Heavy snow showers', category: 'Snow showers' },
  95: { description: 'Thunderstorm', category: 'Thunderstorms' },
  96: { description: 'Thunderstorm with slight hail', category: 'Thunderstorms' },
  99: { description: 'Thunderstorm with heavy hail', category: 'Thunderstorms' },
};

/**
 * Returns a human-readable weather description for a given WMO weather code.
 * Falls back to a safe default if the code is unrecognized.
 * Never returns the raw numeric code directly as user-facing text.
 */
export function getWmoWeatherDescription(code: number | undefined | null): string {
  if (code == null || !Number.isFinite(code)) {
    return 'Unknown conditions';
  }

  const mapped = WMO_CODE_MAP[code];
  if (mapped) {
    return mapped.description;
  }

  // Bracket fallbacks for generalized WMO code groups
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 40 && code <= 49) return 'Fog';
  if (code >= 50 && code <= 59) return 'Drizzle';
  if (code >= 60 && code <= 69) return 'Rain';
  if (code >= 70 && code <= 79) return 'Snow';
  if (code >= 80 && code <= 84) return 'Rain showers';
  if (code >= 85 && code <= 89) return 'Snow showers';
  if (code >= 90 && code <= 99) return 'Thunderstorms';

  return 'Unknown weather conditions';
}

/**
 * Returns the high-level category for a given WMO code (e.g. 'Rain', 'Snow', 'Thunderstorms').
 */
export function getWmoWeatherCategory(code: number | undefined | null): string {
  if (code == null || !Number.isFinite(code)) {
    return 'Unknown';
  }

  const mapped = WMO_CODE_MAP[code];
  if (mapped) {
    return mapped.category;
  }

  if (code >= 50 && code <= 59) return 'Drizzle';
  if (code >= 60 && code <= 69) return 'Rain';
  if (code >= 70 && code <= 79) return 'Snow';
  if (code >= 80 && code <= 84) return 'Rain showers';
  if (code >= 85 && code <= 89) return 'Snow showers';
  if (code >= 90 && code <= 99) return 'Thunderstorms';

  return 'Unknown';
}

