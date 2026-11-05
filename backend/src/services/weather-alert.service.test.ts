import { describe, expect, it } from 'vitest';
import type { CurrentWeather, HourlyForecast } from '../types/weather.types';
import type { AlertRule } from '../types/weather-alert.types';
import {
  evaluateAlertRules,
  evaluateSingleRule,
  MVP_ALERT_DISCLAIMER,
} from './weather-alert.service';

const baseCurrentWeather: CurrentWeather = {
  temperatureCelsius: 25.0,
  feelsLikeCelsius: 26.0,
  humidityPercent: 65,
  windSpeedKmH: 12.0,
  windDirectionDegrees: 180,
  pressureHpa: 1012,
  cloudCoverPercent: 20,
  precipitationMm: 0,
  uvIndex: 4,
  conditionCode: 1,
  description: 'Mainly clear',
  dayNight: 'day',
  isDay: true,
  timestamp: '2026-11-05T12:00:00Z',
  timezone: 'Asia/Colombo',
  location: {
    name: 'Colombo',
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
    country: 'Sri Lanka',
    timezone: 'Asia/Colombo',
  },
};

const baseHourlyForecast: HourlyForecast[] = [
  {
    timestamp: '2026-11-05T13:00:00Z',
    temperatureCelsius: 27.0,
    feelsLikeCelsius: 29.0,
    humidityPercent: 60,
    windSpeedKmH: 15.0,
    windDirectionDegrees: 180,
    pressureHpa: 1012,
    cloudCoverPercent: 20,
    precipitationMm: 0,
    precipitationProbabilityPercent: 10,
    conditionCode: 1,
    description: 'Mainly clear',
    dayNight: 'day',
    isDay: true,
    uvIndex: 5,
  },
  {
    timestamp: '2026-11-05T14:00:00Z',
    temperatureCelsius: 32.5,
    feelsLikeCelsius: 36.0,
    humidityPercent: 70,
    windSpeedKmH: 22.0,
    windDirectionDegrees: 190,
    pressureHpa: 1010,
    cloudCoverPercent: 80,
    precipitationMm: 6.5,
    precipitationProbabilityPercent: 85,
    conditionCode: 95, // Thunderstorm
    description: 'Thunderstorm with rain',
    dayNight: 'day',
    isDay: true,
    uvIndex: 8,
  },
  {
    timestamp: '2026-11-05T15:00:00Z',
    temperatureCelsius: 33.0,
    feelsLikeCelsius: 37.0,
    humidityPercent: 75,
    windSpeedKmH: 25.0,
    windDirectionDegrees: 200,
    pressureHpa: 1009,
    cloudCoverPercent: 90,
    precipitationMm: 8.0,
    precipitationProbabilityPercent: 90,
    conditionCode: 95,
    description: 'Thunderstorm with heavy rain',
    dayNight: 'day',
    isDay: true,
    uvIndex: 7,
  },
];

const mockLocation = {
  latitude: 6.9271,
  longitude: 79.8612,
  name: 'Colombo',
};

describe('Weather Alert Evaluation Service', () => {
  describe('Temperature Above Alert (temp_above)', () => {
    it('triggers immediately when current temperature exceeds threshold', () => {
      const rule: AlertRule = {
        id: 'rule-temp-above-1',
        type: 'temp_above',
        threshold: 24.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, []);
      expect(alert).not.toBeNull();
      expect(alert?.ruleId).toBe('rule-temp-above-1');
      expect(alert?.actualValue).toBe(25.0);
      expect(alert?.threshold).toBe(24.0);
      expect(alert?.message).toContain('Current temperature in Colombo is 25°C');
      expect(alert?.severity).toBe('warning');
    });

    it('triggers as severe when current temperature exceeds threshold by >= 5°C', () => {
      const rule: AlertRule = {
        id: 'rule-temp-above-2',
        type: 'temp_above',
        threshold: 20.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, []);
      expect(alert).not.toBeNull();
      expect(alert?.severity).toBe('severe');
    });

    it('triggers from forecast when current temp is below threshold but future hour exceeds it', () => {
      const rule: AlertRule = {
        id: 'rule-temp-above-forecast',
        type: 'temp_above',
        threshold: 30.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(32.5);
      expect(alert?.message).toContain('forecast to reach 32.5°C');
      expect(alert?.timestamp).toBe('2026-11-05T14:00:00Z');
    });

    it('does not trigger on exact boundary equality (temp === threshold)', () => {
      const rule: AlertRule = {
        id: 'rule-temp-boundary',
        type: 'temp_above',
        threshold: 25.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, []);
      expect(alert).toBeNull();
    });
  });

  describe('Temperature Below Alert (temp_below)', () => {
    it('triggers when current temperature is below threshold', () => {
      const rule: AlertRule = {
        id: 'rule-temp-below-1',
        type: 'temp_below',
        threshold: 28.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, []);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(25.0);
      expect(alert?.threshold).toBe(28.0);
      expect(alert?.message).toContain('dropping below your threshold of 28°C');
    });

    it('triggers from forecast when future hour drops below threshold', () => {
      const warmCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        temperatureCelsius: 22.0,
      };
      const coldHourly: HourlyForecast[] = [
        {
          ...baseHourlyForecast[0],
          timestamp: '2026-11-05T23:00:00Z',
          temperatureCelsius: 12.0,
        },
      ];

      const rule: AlertRule = {
        id: 'rule-temp-below-forecast',
        type: 'temp_below',
        threshold: 15.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, warmCurrent, coldHourly);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(12.0);
      expect(alert?.message).toContain('forecast to drop to 12°C');
    });
  });

  describe('Rain Probability Alert (rain_prob_above)', () => {
    it('triggers when upcoming hourly rain probability exceeds threshold', () => {
      const rule: AlertRule = {
        id: 'rule-rain-prob',
        type: 'rain_prob_above',
        threshold: 50,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(85);
      expect(alert?.message).toContain('Rain probability in Colombo is forecast at 85%');
    });

    it('triggers when active precipitation is currently occurring', () => {
      const rainyCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        precipitationMm: 2.4,
      };
      const rule: AlertRule = {
        id: 'rule-rain-prob-active',
        type: 'rain_prob_above',
        threshold: 70,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, rainyCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.message).toContain('Active precipitation (2.4 mm)');
    });
  });

  describe('UV Index Alert (uv_index_above)', () => {
    it('triggers when current UV index exceeds threshold', () => {
      const sunnyCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        uvIndex: 9,
      };
      const rule: AlertRule = {
        id: 'rule-uv-above',
        type: 'uv_index_above',
        threshold: 7,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, sunnyCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(9);
      expect(alert?.severity).toBe('severe');
    });

    it('triggers from hourly forecast when upcoming UV index exceeds threshold', () => {
      const rule: AlertRule = {
        id: 'rule-uv-forecast',
        type: 'uv_index_above',
        threshold: 6,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(8);
      expect(alert?.message).toContain('UV index in Colombo is forecast to reach 8');
    });
  });

  describe('Wind Speed Alert (wind_speed_above)', () => {
    it('triggers when current wind speed exceeds threshold', () => {
      const windyCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        windSpeedKmH: 45.0,
      };
      const rule: AlertRule = {
        id: 'rule-wind-above',
        type: 'wind_speed_above',
        threshold: 30.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, windyCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(45.0);
      expect(alert?.message).toContain('Wind speed in Colombo is currently 45 km/h');
    });
  });

  describe('Thunderstorm Forecast Alert (thunderstorm)', () => {
    it('triggers when thunderstorm is forecast in upcoming hourly forecast', () => {
      const rule: AlertRule = {
        id: 'rule-thunderstorm-1',
        type: 'thunderstorm',
        threshold: null,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('thunderstorm');
      expect(alert?.severity).toBe('severe');
      expect(alert?.message).toContain('Thunderstorm activity forecast');
    });

    it('triggers immediately when thunderstorm is currently occurring', () => {
      const stormCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        conditionCode: 95,
        description: 'Thunderstorm with rain',
      };
      const rule: AlertRule = {
        id: 'rule-thunderstorm-current',
        type: 'thunderstorm',
        threshold: null,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, stormCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.message).toContain('Active thunderstorm detected');
    });
  });

  describe('Heavy Precipitation Forecast Alert (heavy_precipitation)', () => {
    it('triggers from forecast when hourly precipitation >= 5mm', () => {
      const rule: AlertRule = {
        id: 'rule-heavy-rain',
        type: 'heavy_precipitation',
        threshold: 5.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('heavy_precipitation');
      expect(alert?.actualValue).toBe(6.5);
      expect(alert?.severity).toBe('severe');
    });

    it('triggers when current precipitation exceeds custom threshold', () => {
      const delugeCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        precipitationMm: 12.0,
      };
      const rule: AlertRule = {
        id: 'rule-heavy-rain-current',
        type: 'heavy_precipitation',
        threshold: 10.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, delugeCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.actualValue).toBe(12.0);
    });

    it('triggers heavy precipitation when violent rain showers code 82 is present', () => {
      const showerCurrent: CurrentWeather = {
        ...baseCurrentWeather,
        conditionCode: 82,
        precipitationMm: 1.0,
      };
      const rule: AlertRule = {
        id: 'rule-code-82',
        type: 'heavy_precipitation',
        threshold: 5.0,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, showerCurrent, []);
      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('heavy_precipitation');
    });

    it('triggers thunderstorm when severe thunderstorm with hail code 99 is forecast', () => {
      const hailHourly: HourlyForecast[] = [
        {
          ...baseHourlyForecast[0],
          conditionCode: 99,
          timestamp: '2026-11-05T16:00:00Z',
        },
      ];
      const rule: AlertRule = {
        id: 'rule-hail-storm',
        type: 'thunderstorm',
        threshold: null,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, hailHourly);
      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('thunderstorm');
      expect(alert?.severity).toBe('severe');
    });
  });

  describe('Edge Cases and Constraints', () => {
    it('does not trigger disabled rules', () => {
      const rule: AlertRule = {
        id: 'rule-disabled',
        type: 'temp_above',
        threshold: 10.0, // should trigger if enabled
        enabled: false,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      const alert = evaluateSingleRule(rule, baseCurrentWeather, baseHourlyForecast);
      expect(alert).toBeNull();
    });

    it('gracefully returns null for invalid or missing thresholds on threshold-based rules', () => {
      const invalidRule: AlertRule = {
        id: 'rule-nan',
        type: 'temp_above',
        threshold: Number.NaN,
        enabled: true,
        location: mockLocation,
        createdAt: '2026-11-05T10:00:00Z',
      };

      expect(evaluateSingleRule(invalidRule, baseCurrentWeather, baseHourlyForecast)).toBeNull();
    });

    it('suppresses duplicate alerts for the same rule even if multiple hours qualify', () => {
      // Hours at 14:00 and 15:00 both have temp > 30 and thunderstorm code 95
      const rules: AlertRule[] = [
        {
          id: 'rule-temp-multi-hour',
          type: 'temp_above',
          threshold: 30.0,
          enabled: true,
          location: mockLocation,
          createdAt: '2026-11-05T10:00:00Z',
        },
        {
          id: 'rule-thunderstorm-multi-hour',
          type: 'thunderstorm',
          threshold: null,
          enabled: true,
          location: mockLocation,
          createdAt: '2026-11-05T10:00:00Z',
        },
      ];

      const report = evaluateAlertRules(rules, baseCurrentWeather, baseHourlyForecast);
      expect(report.evaluatedCount).toBe(2);
      expect(report.triggeredCount).toBe(2);
      // Exactly 1 alert per rule
      const tempAlerts = report.alerts.filter((a) => a.ruleId === 'rule-temp-multi-hour');
      const stormAlerts = report.alerts.filter((a) => a.ruleId === 'rule-thunderstorm-multi-hour');
      expect(tempAlerts.length).toBe(1);
      expect(stormAlerts.length).toBe(1);
      expect(report.disclaimer).toBe(MVP_ALERT_DISCLAIMER);
    });
  });
});
