/**
 * Supported weather alert rule types.
 */
export type AlertType =
  | 'temp_above'
  | 'temp_below'
  | 'rain_prob_above'
  | 'uv_index_above'
  | 'wind_speed_above'
  | 'thunderstorm'
  | 'heavy_precipitation';

/**
 * Geographic location association for an alert rule.
 */
export interface AlertLocation {
  latitude: number;
  longitude: number;
  name: string;
}

/**
 * User-configured alert rule definition.
 * Designed to cleanly map to a DynamoDB Item in future iterations:
 * PK: USER#<userId>, SK: ALERT#<id>
 */
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

/**
 * Triggered alert event produced by the evaluation service.
 */
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

/**
 * Complete evaluation report returned by the backend alert evaluation endpoint.
 */
export interface AlertEvaluationReport {
  evaluatedCount: number;
  triggeredCount: number;
  alerts: TriggeredAlert[];
  disclaimer: string;
  evaluatedAt: string;
}

/**
 * Request payload for POST /api/weather/alerts/evaluate
 */
export interface EvaluateAlertsRequest {
  rules: AlertRule[];
  defaultLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

