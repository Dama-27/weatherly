import type { LocationInfo } from './weather-domain.types';
import type { OverallWeatherStatus } from './weather-intelligence.types';

/**
 * Outdoor activities evaluated for suitability.
 */
export type ActivityName =
  | 'Walking'
  | 'Running'
  | 'Cycling'
  | 'Outdoor sports'
  | 'Beach activities'
  | 'Hiking'
  | 'Gardening';

/**
 * Suitability level for outdoor activities.
 */
export type ActivitySuitability = 'excellent' | 'good' | 'moderate' | 'poor';

/**
 * Individual activity recommendation detail.
 */
export interface ActivityRecommendation {
  activity: ActivityName;
  suitability: ActivitySuitability;
  reason: string;
  bestTimeWindow?: string;
}

/**
 * Categories of clothing suggestions.
 */
export type ClothingCategory =
  | 'light_clothing'
  | 'warm_clothing'
  | 'rain_protection'
  | 'sun_protection'
  | 'wind_protection';

/**
 * Specific clothing advice with actionable items.
 */
export interface ClothingRecommendation {
  category: ClothingCategory;
  title: string;
  items: string[];
  reason: string;
  isPrimary: boolean;
}

/**
 * Best predicted outdoor time window within the next 24 hours.
 */
export interface BestOutdoorWindow {
  startTime: string;
  endTime: string;
  label: string;
  comfortScore: number;
  reason: string;
}

/**
 * Complete smart weather recommendations payload.
 */
export interface WeatherRecommendationsReport {
  location: LocationInfo;
  comfortScore: number;
  overallStatus: OverallWeatherStatus;
  activities: ActivityRecommendation[];
  clothing: ClothingRecommendation[];
  dailyAdvice: string[];
  bestOutdoorWindow: BestOutdoorWindow | null;
  calculatedAt: string;
}

