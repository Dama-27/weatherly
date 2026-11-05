export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  name: string;
  coordinates: GeoCoordinates;
  country?: string;
  timezone: string;
}

export interface CurrentWeather {
  location: LocationInfo;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  windSpeedKmH: number;
  windDirectionDegrees: number;
  windGustsKmH?: number;
  pressureHpa: number;
  cloudCoverPercent: number;
  precipitationMm: number;
  uvIndex: number;
  conditionCode: number | string;
  description: string;
  dayNight: 'day' | 'night';
  isDay: boolean;
  timestamp: string;
  timezone: string;
}

export interface HourlyForecast {
  timestamp: string;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  precipitationMm: number;
  precipitationProbabilityPercent?: number;
  windSpeedKmH: number;
  windDirectionDegrees: number;
  pressureHpa: number;
  cloudCoverPercent: number;
  uvIndex: number;
  conditionCode: number | string;
  description: string;
  dayNight: 'day' | 'night';
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  feelsLikeMinCelsius: number;
  feelsLikeMaxCelsius: number;
  precipitationSumMm: number;
  precipitationProbabilityMaxPercent?: number;
  maxWindSpeedKmH: number;
  dominantWindDirectionDegrees: number;
  conditionCode: number | string;
  description: string;
  uvIndexMax: number;
  sunrise?: string;
  sunset?: string;
}

export interface LocationSearchResult {
  name: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface SavedLocation {
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
  timezone?: string;
}

/**
 * Legacy WeatherResult for the 10-city Comfort Index table/card dashboard view.
 */
export interface WeatherResult {
  rank: number;
  comfortScore: number | null;
  description: string;
  city: string;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  rain?: number | null;
}

export type ActivityName =
  | 'Walking'
  | 'Running'
  | 'Cycling'
  | 'Outdoor sports'
  | 'Beach activities'
  | 'Hiking'
  | 'Gardening';

export type ActivitySuitability = 'excellent' | 'good' | 'moderate' | 'poor';

export interface ActivityRecommendation {
  activity: ActivityName;
  suitability: ActivitySuitability;
  reason: string;
  bestTimeWindow?: string;
}

export type ClothingCategory =
  | 'light_clothing'
  | 'warm_clothing'
  | 'rain_protection'
  | 'sun_protection'
  | 'wind_protection';

export interface ClothingRecommendation {
  category: ClothingCategory;
  title: string;
  items: string[];
  reason: string;
  isPrimary: boolean;
}

export interface BestOutdoorWindow {
  startTime: string;
  endTime: string;
  label: string;
  comfortScore: number;
  reason: string;
}

export interface WeatherRecommendationsReport {
  location: LocationInfo;
  comfortScore: number;
  overallStatus: 'optimal' | 'favorable' | 'caution' | 'adverse';
  activities: ActivityRecommendation[];
  clothing: ClothingRecommendation[];
  dailyAdvice: string[];
  bestOutdoorWindow: BestOutdoorWindow | null;
  calculatedAt: string;
}

// ==========================================================================
// Weather Alerts & Notifications Models
// ==========================================================================

export type AlertType =
  | 'temp_above'
  | 'temp_below'
  | 'rain_prob_above'
  | 'uv_index_above'
  | 'wind_speed_above'
  | 'thunderstorm'
  | 'heavy_precipitation';

export interface AlertLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export interface AlertRule {
  id: string;
  userId?: string;
  type: AlertType;
  threshold?: number | null;
  enabled: boolean;
  location: AlertLocation;
  createdAt: string;
  updatedAt?: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  type: AlertType;
  actualValue: number | string;
  threshold: number | null;
  message: string;
  timestamp: string;
  locationName: string;
  severity: 'info' | 'warning' | 'severe';
}

export interface AlertEvaluationReport {
  evaluatedCount: number;
  triggeredCount: number;
  alerts: TriggeredAlert[];
  disclaimer: string;
  evaluatedAt: string;
}

// ==========================================================================
// AI Weather Copilot Models
// ==========================================================================

export type AssistantProviderType = 'gemini' | 'rules';

export interface AssistantContextSummary {
  locationName: string;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  conditionDescription: string;
  comfortScore: number;
  overallStatus: string;
  bestOutdoorWindow?: string;
  activeHazardsCount: number;
}

export interface AssistantResponse {
  answer: string;
  provider: AssistantProviderType;
  weatherContext: AssistantContextSummary;
  suggestedFollowUps?: string[];
}

export interface AssistantChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: AssistantProviderType;
  timestamp: string;
  suggestedFollowUps?: string[];
  isError?: boolean;
}


