/**
 * Centralized Weather Theme Engine
 *
 * Maps WMO weather conditions and day/night indicators to consistent,
 * beautiful visual themes with color palettes and gradients.
 */

export type WeatherCategory =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'thunderstorm';

export interface WeatherTheme {
  id: string;
  category: WeatherCategory;
  isDay: boolean;
  name: string;
  heroGradient: string;
  heroText: string;
  heroSubtext: string;
  accentColor: string;
  chartTempColor: string;
  chartFeelsLikeColor: string;
  chartRainColor: string;
  bgTint: string;
  cardBorder: string;
}

export const WEATHER_THEMES: Record<string, WeatherTheme> = {
  'clear-day': {
    id: 'clear-day',
    category: 'clear',
    isDay: true,
    name: 'Clear Day',
    heroGradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)',
    heroText: '#ffffff',
    heroSubtext: '#bfdbfe',
    accentColor: '#f59e0b',
    chartTempColor: '#f59e0b',
    chartFeelsLikeColor: '#fbbf24',
    chartRainColor: '#38bdf8',
    bgTint: 'rgba(37, 99, 235, 0.03)',
    cardBorder: 'rgba(37, 99, 235, 0.15)',
  },
  'clear-night': {
    id: 'clear-night',
    category: 'clear',
    isDay: false,
    name: 'Clear Night',
    heroGradient: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#cbd5e1',
    accentColor: '#facc15',
    chartTempColor: '#60a5fa',
    chartFeelsLikeColor: '#93c5fd',
    chartRainColor: '#38bdf8',
    bgTint: 'rgba(15, 23, 42, 0.05)',
    cardBorder: 'rgba(99, 102, 241, 0.2)',
  },
  'partly-cloudy-day': {
    id: 'partly-cloudy-day',
    category: 'partly-cloudy',
    isDay: true,
    name: 'Partly Cloudy Day',
    heroGradient: 'linear-gradient(135deg, #2563eb 0%, #0284c7 60%, #38bdf8 100%)',
    heroText: '#ffffff',
    heroSubtext: '#e0f2fe',
    accentColor: '#0284c7',
    chartTempColor: '#0284c7',
    chartFeelsLikeColor: '#38bdf8',
    chartRainColor: '#0ea5e9',
    bgTint: 'rgba(2, 132, 199, 0.03)',
    cardBorder: 'rgba(2, 132, 199, 0.15)',
  },
  'partly-cloudy-night': {
    id: 'partly-cloudy-night',
    category: 'partly-cloudy',
    isDay: false,
    name: 'Partly Cloudy Night',
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#94a3b8',
    accentColor: '#38bdf8',
    chartTempColor: '#38bdf8',
    chartFeelsLikeColor: '#818cf8',
    chartRainColor: '#60a5fa',
    bgTint: 'rgba(30, 41, 59, 0.05)',
    cardBorder: 'rgba(30, 58, 138, 0.2)',
  },
  'cloudy-day': {
    id: 'cloudy-day',
    category: 'cloudy',
    isDay: true,
    name: 'Cloudy Day',
    heroGradient: 'linear-gradient(135deg, #334155 0%, #475569 50%, #64748b 100%)',
    heroText: '#ffffff',
    heroSubtext: '#cbd5e1',
    accentColor: '#0ea5e9',
    chartTempColor: '#f59e0b',
    chartFeelsLikeColor: '#94a3b8',
    chartRainColor: '#38bdf8',
    bgTint: 'rgba(71, 85, 105, 0.04)',
    cardBorder: 'rgba(71, 85, 105, 0.2)',
  },
  'cloudy-night': {
    id: 'cloudy-night',
    category: 'cloudy',
    isDay: false,
    name: 'Cloudy Night',
    heroGradient: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1f2937 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#94a3b8',
    accentColor: '#60a5fa',
    chartTempColor: '#38bdf8',
    chartFeelsLikeColor: '#64748b',
    chartRainColor: '#0284c7',
    bgTint: 'rgba(17, 24, 39, 0.06)',
    cardBorder: 'rgba(75, 85, 99, 0.25)',
  },
  'fog-day': {
    id: 'fog-day',
    category: 'fog',
    isDay: true,
    name: 'Foggy Day',
    heroGradient: 'linear-gradient(135deg, #475569 0%, #64748b 60%, #94a3b8 100%)',
    heroText: '#ffffff',
    heroSubtext: '#e2e8f0',
    accentColor: '#14b8a6',
    chartTempColor: '#14b8a6',
    chartFeelsLikeColor: '#5eead4',
    chartRainColor: '#06b6d4',
    bgTint: 'rgba(100, 116, 139, 0.04)',
    cardBorder: 'rgba(148, 163, 184, 0.2)',
  },
  'fog-night': {
    id: 'fog-night',
    category: 'fog',
    isDay: false,
    name: 'Foggy Night',
    heroGradient: 'linear-gradient(135deg, #090d16 0%, #1e293b 60%, #334155 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#94a3b8',
    accentColor: '#2dd4bf',
    chartTempColor: '#2dd4bf',
    chartFeelsLikeColor: '#94a3b8',
    chartRainColor: '#0891b2',
    bgTint: 'rgba(30, 41, 59, 0.06)',
    cardBorder: 'rgba(51, 65, 85, 0.25)',
  },
  'rain-day': {
    id: 'rain-day',
    category: 'rain',
    isDay: true,
    name: 'Rainy Day',
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #0284c7 100%)',
    heroText: '#ffffff',
    heroSubtext: '#bae6fd',
    accentColor: '#38bdf8',
    chartTempColor: '#38bdf8',
    chartFeelsLikeColor: '#7dd3fc',
    chartRainColor: '#0284c7',
    bgTint: 'rgba(3, 105, 161, 0.04)',
    cardBorder: 'rgba(2, 132, 199, 0.2)',
  },
  'rain-night': {
    id: 'rain-night',
    category: 'rain',
    isDay: false,
    name: 'Rainy Night',
    heroGradient: 'linear-gradient(135deg, #020617 0%, #0c4a6e 60%, #082f49 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#7dd3fc',
    accentColor: '#38bdf8',
    chartTempColor: '#38bdf8',
    chartFeelsLikeColor: '#93c5fd',
    chartRainColor: '#0369a1',
    bgTint: 'rgba(12, 74, 110, 0.06)',
    cardBorder: 'rgba(3, 105, 161, 0.25)',
  },
  'snow-day': {
    id: 'snow-day',
    category: 'snow',
    isDay: true,
    name: 'Snowy Day',
    heroGradient: 'linear-gradient(135deg, #334155 0%, #475569 40%, #0284c7 100%)',
    heroText: '#ffffff',
    heroSubtext: '#f1f5f9',
    accentColor: '#a5f3fc',
    chartTempColor: '#a5f3fc',
    chartFeelsLikeColor: '#bae6fd',
    chartRainColor: '#38bdf8',
    bgTint: 'rgba(165, 243, 252, 0.04)',
    cardBorder: 'rgba(186, 230, 253, 0.25)',
  },
  'snow-night': {
    id: 'snow-night',
    category: 'snow',
    isDay: false,
    name: 'Snowy Night',
    heroGradient: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #164e63 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#e2e8f0',
    accentColor: '#67e8f9',
    chartTempColor: '#67e8f9',
    chartFeelsLikeColor: '#94a3b8',
    chartRainColor: '#22d3ee',
    bgTint: 'rgba(22, 78, 99, 0.06)',
    cardBorder: 'rgba(8, 145, 178, 0.25)',
  },
  'thunderstorm-day': {
    id: 'thunderstorm-day',
    category: 'thunderstorm',
    isDay: true,
    name: 'Thunderstorm Day',
    heroGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
    heroText: '#ffffff',
    heroSubtext: '#c7d2fe',
    accentColor: '#f59e0b',
    chartTempColor: '#fbbf24',
    chartFeelsLikeColor: '#a5b4fc',
    chartRainColor: '#38bdf8',
    bgTint: 'rgba(67, 56, 202, 0.04)',
    cardBorder: 'rgba(99, 102, 241, 0.25)',
  },
  'thunderstorm-night': {
    id: 'thunderstorm-night',
    category: 'thunderstorm',
    isDay: false,
    name: 'Thunderstorm Night',
    heroGradient: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #2e1065 100%)',
    heroText: '#f8fafc',
    heroSubtext: '#ddd6fe',
    accentColor: '#facc15',
    chartTempColor: '#facc15',
    chartFeelsLikeColor: '#c084fc',
    chartRainColor: '#818cf8',
    bgTint: 'rgba(46, 16, 101, 0.06)',
    cardBorder: 'rgba(126, 34, 206, 0.25)',
  },
};

/**
 * Maps WMO weather code to standard category.
 */
export function getCategoryFromWmoCode(code: number | string | undefined | null): WeatherCategory {
  const numeric = typeof code === 'number' ? code : Number(code);
  if (isNaN(numeric)) {
    return 'clear';
  }

  if (numeric === 0) return 'clear';
  if (numeric === 1 || numeric === 2) return 'partly-cloudy';
  if (numeric === 3) return 'cloudy';
  if (numeric === 45 || numeric === 48) return 'fog';
  if ((numeric >= 51 && numeric <= 67) || (numeric >= 80 && numeric <= 82)) return 'rain';
  if ((numeric >= 71 && numeric <= 77) || (numeric >= 85 && numeric <= 86)) return 'snow';
  if (numeric >= 95 && numeric <= 99) return 'thunderstorm';

  return 'clear';
}

/**
 * Returns the centralized WeatherTheme for given conditions.
 */
export function getWeatherTheme(
  conditionCode: number | string | undefined | null,
  isDay: boolean = true
): WeatherTheme {
  const category = getCategoryFromWmoCode(conditionCode);
  const themeId = `${category}-${isDay ? 'day' : 'night'}`;
  return WEATHER_THEMES[themeId] || WEATHER_THEMES['clear-day'];
}

