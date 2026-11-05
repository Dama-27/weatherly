import type { CurrentWeather, DailyForecast, HourlyForecast } from './weather-domain.types';
import type { WeatherIntelligenceReport } from './weather-intelligence.types';
import type { WeatherRecommendationsReport } from './weather-recommendation.types';

export type AssistantProviderType = 'gemini' | 'rules';

/**
 * Normalized ground-truth weather context passed to assistant providers.
 */
export interface AssistantWeatherContext {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  intelligence: WeatherIntelligenceReport;
  recommendations: WeatherRecommendationsReport;
}

/**
 * Clean metadata summary returned alongside the assistant answer.
 */
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

/**
 * Public response contract for POST /api/assistant/ask
 */
export interface AssistantResponse {
  answer: string;
  provider: AssistantProviderType;
  weatherContext: AssistantContextSummary;
  suggestedFollowUps?: string[];
}

/**
 * Common provider interface for AI and rule-based assistants.
 */
export interface IAssistantProvider {
  readonly providerName: AssistantProviderType;
  isAvailable(): boolean;
  generateAnswer(
    question: string,
    context: AssistantWeatherContext
  ): Promise<string | null>;
}

/**
 * Request payload for POST /api/assistant/ask
 */
export interface AskAssistantRequest {
  question: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

