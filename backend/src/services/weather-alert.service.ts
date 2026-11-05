import type { CurrentWeather, HourlyForecast } from '../types/weather.types';
import type {
  AlertEvaluationReport,
  AlertRule,
  TriggeredAlert,
} from '../types/weather-alert.types';

export const MVP_ALERT_DISCLAIMER =
  'MVP Notice: Alerts are evaluated when the application refreshes weather data and are not guaranteed real-time emergency warnings.';

/**
 * Known WMO weather codes associated with thunderstorms.
 * 95: Thunderstorm: Slight or moderate
 * 96: Thunderstorm with slight hail
 * 99: Thunderstorm with heavy hail
 */
const THUNDERSTORM_CODES = new Set([95, 96, 99]);

/**
 * Known WMO weather codes associated with heavy precipitation.
 * 65: Rain: Heavy intensity
 * 75: Snow fall: Heavy intensity
 * 82: Violent rain showers
 */
const HEAVY_PRECIPITATION_CODES = new Set([65, 75, 82]);

/**
 * Default precipitation threshold for heavy precipitation alerts in mm.
 */
const DEFAULT_HEAVY_PRECIPITATION_MM = 5.0;

/**
 * Format timestamp into human-readable local time where possible.
 */
function formatTimeDisplay(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  } catch {
    // fallback to original string
  }
  return timestamp;
}

/**
 * Evaluates an individual alert rule against current conditions and near-term hourly forecast.
 * Avoids duplicate alerts by returning at most one triggered event per rule (prioritizing current conditions,
 * then the earliest forecast violation).
 */
export function evaluateSingleRule(
  rule: AlertRule,
  current: CurrentWeather,
  hourly: HourlyForecast[] = []
): TriggeredAlert | null {
  if (!rule.enabled) {
    return null;
  }

  const locationName = rule.location?.name || current.location.name || 'Selected Location';
  // Consider hourly entries within the next 24 hours
  const upcomingHourly = hourly.slice(0, 24);

  switch (rule.type) {
    case 'temp_above': {
      if (typeof rule.threshold !== 'number' || Number.isNaN(rule.threshold)) {
        return null;
      }
      const threshold = rule.threshold;

      // 1. Check current temperature
      if (current.temperatureCelsius > threshold) {
        const diff = current.temperatureCelsius - threshold;
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'temp_above',
          actualValue: current.temperatureCelsius,
          threshold,
          message: `Current temperature in ${locationName} is ${current.temperatureCelsius}°C, exceeding your threshold of ${threshold}°C.`,
          timestamp: current.timestamp,
          locationName,
          severity: diff >= 5 ? 'severe' : 'warning',
        };
      }

      // 2. Check upcoming forecast hours
      const violation = upcomingHourly.find(
        (h) => typeof h.temperatureCelsius === 'number' && h.temperatureCelsius > threshold
      );
      if (violation) {
        const diff = violation.temperatureCelsius - threshold;
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'temp_above',
          actualValue: violation.temperatureCelsius,
          threshold,
          message: `Temperature in ${locationName} is forecast to reach ${violation.temperatureCelsius}°C at ${timeStr}, exceeding your threshold of ${threshold}°C.`,
          timestamp: violation.timestamp,
          locationName,
          severity: diff >= 5 ? 'severe' : 'warning',
        };
      }
      return null;
    }

    case 'temp_below': {
      if (typeof rule.threshold !== 'number' || Number.isNaN(rule.threshold)) {
        return null;
      }
      const threshold = rule.threshold;

      // 1. Check current temperature
      if (current.temperatureCelsius < threshold) {
        const diff = threshold - current.temperatureCelsius;
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'temp_below',
          actualValue: current.temperatureCelsius,
          threshold,
          message: `Current temperature in ${locationName} is ${current.temperatureCelsius}°C, dropping below your threshold of ${threshold}°C.`,
          timestamp: current.timestamp,
          locationName,
          severity: diff >= 5 ? 'severe' : 'warning',
        };
      }

      // 2. Check upcoming forecast hours
      const violation = upcomingHourly.find(
        (h) => typeof h.temperatureCelsius === 'number' && h.temperatureCelsius < threshold
      );
      if (violation) {
        const diff = threshold - violation.temperatureCelsius;
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'temp_below',
          actualValue: violation.temperatureCelsius,
          threshold,
          message: `Temperature in ${locationName} is forecast to drop to ${violation.temperatureCelsius}°C at ${timeStr}, below your threshold of ${threshold}°C.`,
          timestamp: violation.timestamp,
          locationName,
          severity: diff >= 5 ? 'severe' : 'warning',
        };
      }
      return null;
    }

    case 'rain_prob_above': {
      if (typeof rule.threshold !== 'number' || Number.isNaN(rule.threshold)) {
        return null;
      }
      const threshold = rule.threshold;

      // Check upcoming hourly rain probabilities
      const violation = upcomingHourly.find(
        (h) =>
          typeof h.precipitationProbabilityPercent === 'number' &&
          h.precipitationProbabilityPercent > threshold
      );

      if (violation && violation.precipitationProbabilityPercent !== undefined) {
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'rain_prob_above',
          actualValue: violation.precipitationProbabilityPercent,
          threshold,
          message: `Rain probability in ${locationName} is forecast at ${violation.precipitationProbabilityPercent}% at ${timeStr}, exceeding your threshold of ${threshold}%.`,
          timestamp: violation.timestamp,
          locationName,
          severity: violation.precipitationProbabilityPercent >= 80 ? 'warning' : 'info',
        };
      }

      // If current condition already has active precipitation and rain prob was exceeded
      if (current.precipitationMm > 0 && threshold < 100) {
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'rain_prob_above',
          actualValue: current.precipitationMm,
          threshold,
          message: `Active precipitation (${current.precipitationMm} mm) currently occurring in ${locationName}.`,
          timestamp: current.timestamp,
          locationName,
          severity: 'warning',
        };
      }
      return null;
    }

    case 'uv_index_above': {
      if (typeof rule.threshold !== 'number' || Number.isNaN(rule.threshold)) {
        return null;
      }
      const threshold = rule.threshold;

      // 1. Check current UV index
      if (current.uvIndex > threshold) {
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'uv_index_above',
          actualValue: current.uvIndex,
          threshold,
          message: `UV index in ${locationName} is currently ${current.uvIndex}, exceeding your threshold of ${threshold}.`,
          timestamp: current.timestamp,
          locationName,
          severity: current.uvIndex >= 8 ? 'severe' : 'warning',
        };
      }

      // 2. Check upcoming forecast hours if available
      const violation = upcomingHourly.find(
        (h) => typeof h.uvIndex === 'number' && h.uvIndex > threshold
      );
      if (violation && violation.uvIndex !== undefined) {
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'uv_index_above',
          actualValue: violation.uvIndex,
          threshold,
          message: `UV index in ${locationName} is forecast to reach ${violation.uvIndex} at ${timeStr}, exceeding your threshold of ${threshold}.`,
          timestamp: violation.timestamp,
          locationName,
          severity: violation.uvIndex >= 8 ? 'severe' : 'warning',
        };
      }
      return null;
    }

    case 'wind_speed_above': {
      if (typeof rule.threshold !== 'number' || Number.isNaN(rule.threshold)) {
        return null;
      }
      const threshold = rule.threshold;

      // 1. Check current wind speed
      if (current.windSpeedKmH > threshold) {
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'wind_speed_above',
          actualValue: current.windSpeedKmH,
          threshold,
          message: `Wind speed in ${locationName} is currently ${current.windSpeedKmH} km/h, exceeding your threshold of ${threshold} km/h.`,
          timestamp: current.timestamp,
          locationName,
          severity: current.windSpeedKmH >= 50 ? 'severe' : 'warning',
        };
      }

      // 2. Check upcoming hourly wind speeds
      const violation = upcomingHourly.find(
        (h) => typeof h.windSpeedKmH === 'number' && h.windSpeedKmH > threshold
      );
      if (violation && violation.windSpeedKmH !== undefined) {
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'wind_speed_above',
          actualValue: violation.windSpeedKmH,
          threshold,
          message: `Wind speed in ${locationName} is forecast to reach ${violation.windSpeedKmH} km/h at ${timeStr}, exceeding your threshold of ${threshold} km/h.`,
          timestamp: violation.timestamp,
          locationName,
          severity: violation.windSpeedKmH >= 50 ? 'severe' : 'warning',
        };
      }
      return null;
    }

    case 'thunderstorm': {
      // 1. Check current condition code
      const currentCodeNum = Number(current.conditionCode);
      if (!Number.isNaN(currentCodeNum) && THUNDERSTORM_CODES.has(currentCodeNum)) {
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'thunderstorm',
          actualValue: current.description,
          threshold: null,
          message: `Active thunderstorm detected in ${locationName} (${current.description}). Take shelter indoors.`,
          timestamp: current.timestamp,
          locationName,
          severity: 'severe',
        };
      }

      // 2. Check upcoming hourly codes
      const violation = upcomingHourly.find((h) => {
        const codeNum = Number(h.conditionCode);
        return !Number.isNaN(codeNum) && THUNDERSTORM_CODES.has(codeNum);
      });
      if (violation && violation.conditionCode !== undefined) {
        const timeStr = formatTimeDisplay(violation.timestamp);
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'thunderstorm',
          actualValue: violation.conditionCode,
          threshold: null,
          message: `Thunderstorm activity forecast in ${locationName} around ${timeStr}. Plan outdoor activities accordingly.`,
          timestamp: violation.timestamp,
          locationName,
          severity: 'severe',
        };
      }
      return null;
    }

    case 'heavy_precipitation': {
      const precipThreshold =
        typeof rule.threshold === 'number' && rule.threshold > 0
          ? rule.threshold
          : DEFAULT_HEAVY_PRECIPITATION_MM;

      // 1. Check current precipitation or heavy rain code
      const currentCodeNum = Number(current.conditionCode);
      if (
        current.precipitationMm >= precipThreshold ||
        (!Number.isNaN(currentCodeNum) && HEAVY_PRECIPITATION_CODES.has(currentCodeNum))
      ) {
        return {
          id: `${rule.id}-${current.timestamp}`,
          ruleId: rule.id,
          type: 'heavy_precipitation',
          actualValue: current.precipitationMm,
          threshold: precipThreshold,
          message: `Heavy precipitation (${current.precipitationMm} mm) occurring in ${locationName}. Caution advised on roads.`,
          timestamp: current.timestamp,
          locationName,
          severity: 'severe',
        };
      }

      // 2. Check upcoming forecast hours
      const violation = upcomingHourly.find((h) => {
        const codeNum = Number(h.conditionCode);
        const hasHeavyCode = !Number.isNaN(codeNum) && HEAVY_PRECIPITATION_CODES.has(codeNum);
        return (
          (typeof h.precipitationMm === 'number' && h.precipitationMm >= precipThreshold) ||
          hasHeavyCode
        );
      });
      if (violation) {
        const timeStr = formatTimeDisplay(violation.timestamp);
        const actualMm = violation.precipitationMm ?? precipThreshold;
        return {
          id: `${rule.id}-${violation.timestamp}`,
          ruleId: rule.id,
          type: 'heavy_precipitation',
          actualValue: actualMm,
          threshold: precipThreshold,
          message: `Heavy precipitation (${actualMm} mm) forecast in ${locationName} around ${timeStr}.`,
          timestamp: violation.timestamp,
          locationName,
          severity: 'severe',
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Evaluates a list of alert rules against weather data.
 * Guarantees at most one triggered alert per rule ID (suppressing duplicate events for the same period).
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  current: CurrentWeather,
  hourly: HourlyForecast[] = []
): AlertEvaluationReport {
  const triggeredAlerts: TriggeredAlert[] = [];
  const seenRuleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule || !rule.enabled || seenRuleIds.has(rule.id)) {
      continue;
    }

    const alert = evaluateSingleRule(rule, current, hourly);
    if (alert) {
      triggeredAlerts.push(alert);
      seenRuleIds.add(rule.id);
    }
  }

  // Sort by severity (severe first, then warning, then info)
  const severityRank = { severe: 3, warning: 2, info: 1 };
  triggeredAlerts.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  return {
    evaluatedCount: rules.filter((r) => r && r.enabled).length,
    triggeredCount: triggeredAlerts.length,
    alerts: triggeredAlerts,
    disclaimer: MVP_ALERT_DISCLAIMER,
    evaluatedAt: new Date().toISOString(),
  };
}
