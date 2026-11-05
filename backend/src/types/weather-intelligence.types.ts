import type { LocationInfo } from './weather-domain.types';

/**
 * Standard weather risk categories evaluated by the intelligence engine.
 */
export type RiskType =
  | 'extreme_heat'
  | 'cold_conditions'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'strong_winds'
  | 'high_uv';

/**
 * Hierarchical severity levels for identified weather risks.
 */
export type RiskSeverity = 'low' | 'moderate' | 'high' | 'extreme';

/**
 * Individual weather risk assessment detail.
 */
export interface WeatherRisk {
  type: RiskType;
  severity: RiskSeverity;
  headline: string;
  explanation: string;
  measuredValue: {
    value: number;
    unit: string;
    metric: string;
  };
  suggestedPrecaution: string;
}

/**
 * Overall synthesized weather condition status.
 * - 'optimal': High comfort, pleasant conditions, no notable risks.
 * - 'favorable': Good comfort with mild conditions; minor low-level risks at most.
 * - 'caution': Noticeable discomfort or moderate risks present requiring basic precautions.
 * - 'adverse': Significant weather hazards (high or extreme risk) or severely degraded comfort.
 */
export type OverallWeatherStatus = 'optimal' | 'favorable' | 'caution' | 'adverse';

/**
 * Complete Weather Intelligence Report contract.
 */
export interface WeatherIntelligenceReport {
  location: LocationInfo;
  overallStatus: OverallWeatherStatus;
  comfortScore: number;
  highestRisk: WeatherRisk | null;
  summary: string;
  risks: WeatherRisk[];
  evaluatedConditions: {
    temperatureCelsius?: number;
    feelsLikeCelsius?: number;
    humidityPercent?: number;
    windSpeedKmH?: number;
    windGustsKmH?: number;
    pressureHpa?: number;
    precipitationMm?: number;
    uvIndex?: number;
    conditionCode?: number | string;
    description?: string;
  };
  advisoryDisclaimer: string;
  calculatedAt: string;
}

