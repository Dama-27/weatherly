import { describe, expect, it } from 'vitest';
import {
  ADVISORY_DISCLAIMER,
  analyzeWeather,
  assessWeatherRisks,
  calculateIntelligenceComfortScore,
  determineOverallStatus,
  generateWeatherSummary,
} from './weather-intelligence.service';
import type { CurrentWeather } from '../types/weather-domain.types';

describe('Weather Intelligence Service', () => {
  const baseIdealWeather: CurrentWeather = {
    location: {
      name: 'Nuwara Eliya',
      coordinates: { latitude: 6.9497, longitude: 80.7891 },
      timezone: 'Asia/Colombo',
    },
    temperatureCelsius: 22,
    feelsLikeCelsius: 23,
    humidityPercent: 50,
    windSpeedKmH: 10,
    windDirectionDegrees: 180,
    pressureHpa: 1013,
    cloudCoverPercent: 20,
    precipitationMm: 0,
    uvIndex: 2,
    conditionCode: 1,
    description: 'Mainly clear',
    dayNight: 'day',
    isDay: true,
    timestamp: '2026-11-05T12:00:00Z',
    timezone: 'Asia/Colombo',
  };

  describe('Comfort Score Calculation', () => {
    it('returns 100 for ideal, comfortable weather conditions', () => {
      const score = calculateIntelligenceComfortScore(baseIdealWeather);
      expect(score).toBe(100);
    });

    it('penalizes very hot and humid conditions significantly', () => {
      const hotWeather: Partial<CurrentWeather> = {
        temperatureCelsius: 37,
        feelsLikeCelsius: 43,
        humidityPercent: 88,
        windSpeedKmH: 3,
        precipitationMm: 0,
      };
      const score = calculateIntelligenceComfortScore(hotWeather);
      expect(score).toBeLessThan(30);
    });

    it('penalizes freezing cold conditions', () => {
      const coldWeather: Partial<CurrentWeather> = {
        temperatureCelsius: -10,
        feelsLikeCelsius: -18,
        humidityPercent: 75,
        windSpeedKmH: 30,
        precipitationMm: 0,
      };
      const score = calculateIntelligenceComfortScore(coldWeather);
      expect(score).toBeLessThan(35);
    });

    it('penalizes heavy rain and strong gale-force winds', () => {
      const stormyWeather: Partial<CurrentWeather> = {
        temperatureCelsius: 22,
        feelsLikeCelsius: 22,
        humidityPercent: 95,
        windSpeedKmH: 60,
        precipitationMm: 28,
      };
      const score = calculateIntelligenceComfortScore(stormyWeather);
      expect(score).toBeLessThan(50);
    });

    it('handles missing telemetry by re-normalizing available weights without NaN', () => {
      const partialWeather: Partial<CurrentWeather> = {
        temperatureCelsius: 22,
        feelsLikeCelsius: 22,
        // humidity, wind, and precipitation are undefined
      };
      const score = calculateIntelligenceComfortScore(partialWeather);
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBe(100); // Because available temp metrics are ideal
    });

    it('returns neutral 50 when all telemetry is missing', () => {
      const emptyWeather: Partial<CurrentWeather> = {};
      const score = calculateIntelligenceComfortScore(emptyWeather);
      expect(score).toBe(50);
    });

    it('clamps scores to boundary range [0, 100]', () => {
      const extremeWeather: Partial<CurrentWeather> = {
        temperatureCelsius: 50,
        feelsLikeCelsius: 55,
        humidityPercent: 100,
        windSpeedKmH: 100,
        precipitationMm: 100,
      };
      const score = calculateIntelligenceComfortScore(extremeWeather);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Weather Risk Assessment', () => {
    it('identifies no risks during ideal comfortable conditions', () => {
      const risks = assessWeatherRisks(baseIdealWeather);
      expect(risks).toHaveLength(0);
    });

    it('evaluates extreme heat tiers accurately', () => {
      // Moderate heat (34°C)
      const moderateRisks = assessWeatherRisks({ feelsLikeCelsius: 34 });
      expect(moderateRisks[0].type).toBe('extreme_heat');
      expect(moderateRisks[0].severity).toBe('moderate');

      // High heat (38°C)
      const highRisks = assessWeatherRisks({ feelsLikeCelsius: 38 });
      expect(highRisks[0].type).toBe('extreme_heat');
      expect(highRisks[0].severity).toBe('high');

      // Extreme heat (43°C)
      const extremeRisks = assessWeatherRisks({ feelsLikeCelsius: 43 });
      expect(extremeRisks[0].type).toBe('extreme_heat');
      expect(extremeRisks[0].severity).toBe('extreme');
      expect(extremeRisks[0].suggestedPrecaution).toContain('air-conditioned');
    });

    it('evaluates cold conditions tiers accurately', () => {
      // Low / cool (13°C)
      const lowRisks = assessWeatherRisks({ feelsLikeCelsius: 13 });
      expect(lowRisks[0].type).toBe('cold_conditions');
      expect(lowRisks[0].severity).toBe('low');

      // Moderate cold (7°C)
      const modRisks = assessWeatherRisks({ feelsLikeCelsius: 7 });
      expect(modRisks[0].type).toBe('cold_conditions');
      expect(modRisks[0].severity).toBe('moderate');

      // Freezing high (0°C)
      const highRisks = assessWeatherRisks({ feelsLikeCelsius: 0 });
      expect(highRisks[0].type).toBe('cold_conditions');
      expect(highRisks[0].severity).toBe('high');

      // Severe extreme freeze (-16°C)
      const extremeRisks = assessWeatherRisks({ feelsLikeCelsius: -16 });
      expect(extremeRisks[0].type).toBe('cold_conditions');
      expect(extremeRisks[0].severity).toBe('extreme');
      expect(extremeRisks[0].suggestedPrecaution).toContain('insulated layers');
    });

    it('evaluates rainfall volume tiers accurately', () => {
      expect(assessWeatherRisks({ precipitationMm: 0.5 })).toHaveLength(0);

      const light = assessWeatherRisks({ precipitationMm: 2.0 });
      expect(light[0].type).toBe('heavy_rain');
      expect(light[0].severity).toBe('low');

      const moderate = assessWeatherRisks({ precipitationMm: 6.0 });
      expect(moderate[0].type).toBe('heavy_rain');
      expect(moderate[0].severity).toBe('moderate');

      const heavy = assessWeatherRisks({ precipitationMm: 14.0 });
      expect(heavy[0].type).toBe('heavy_rain');
      expect(heavy[0].severity).toBe('high');

      const torrential = assessWeatherRisks({ precipitationMm: 35.0 });
      expect(torrential[0].type).toBe('heavy_rain');
      expect(torrential[0].severity).toBe('extreme');
    });

    it('evaluates thunderstorm WMO code tiers accurately', () => {
      // WMO 95
      const ts95 = assessWeatherRisks({ conditionCode: 95 });
      expect(ts95[0].type).toBe('thunderstorm');
      expect(ts95[0].severity).toBe('moderate');

      // WMO 96 (with hail)
      const ts96 = assessWeatherRisks({ conditionCode: 96 });
      expect(ts96[0].type).toBe('thunderstorm');
      expect(ts96[0].severity).toBe('high');

      // WMO 99 (with heavy hail)
      const ts99 = assessWeatherRisks({ conditionCode: 99 });
      expect(ts99[0].type).toBe('thunderstorm');
      expect(ts99[0].severity).toBe('extreme');
    });

    it('evaluates wind speeds and incorporates wind gusts', () => {
      // Wind speed alone
      const brisk = assessWeatherRisks({ windSpeedKmH: 38 });
      expect(brisk[0].type).toBe('strong_winds');
      expect(brisk[0].severity).toBe('moderate');

      // Wind gust higher than sustained wind
      const gusty = assessWeatherRisks({ windSpeedKmH: 20, windGustsKmH: 55 });
      expect(gusty[0].type).toBe('strong_winds');
      expect(gusty[0].severity).toBe('high');
      expect(gusty[0].measuredValue.value).toBe(55);

      // Storm force
      const storm = assessWeatherRisks({ windSpeedKmH: 80 });
      expect(storm[0].type).toBe('strong_winds');
      expect(storm[0].severity).toBe('extreme');
    });

    it('evaluates UV radiation index tiers accurately', () => {
      expect(assessWeatherRisks({ uvIndex: 2 })).toHaveLength(0);

      const mod = assessWeatherRisks({ uvIndex: 4 });
      expect(mod[0].type).toBe('high_uv');
      expect(mod[0].severity).toBe('low');

      const high = assessWeatherRisks({ uvIndex: 7 });
      expect(high[0].type).toBe('high_uv');
      expect(high[0].severity).toBe('moderate');

      const veryHigh = assessWeatherRisks({ uvIndex: 9 });
      expect(veryHigh[0].type).toBe('high_uv');
      expect(veryHigh[0].severity).toBe('high');

      const extreme = assessWeatherRisks({ uvIndex: 12 });
      expect(extreme[0].type).toBe('high_uv');
      expect(extreme[0].severity).toBe('extreme');
    });

    it('identifies and orders multiple simultaneous risks by severity descending', () => {
      const compoundHazard: Partial<CurrentWeather> = {
        conditionCode: 96, // High thunderstorm
        precipitationMm: 30, // Extreme torrential rain
        windSpeedKmH: 40, // Moderate wind
        feelsLikeCelsius: 31, // Low heat
        uvIndex: 1,
      };

      const risks = assessWeatherRisks(compoundHazard);
      expect(risks.length).toBeGreaterThanOrEqual(3);

      // Verify strict descending severity ordering: extreme > high > moderate > low
      expect(risks[0].severity).toBe('extreme');
      expect(risks[0].type).toBe('heavy_rain');
      expect(risks[1].severity).toBe('high');
      expect(risks[1].type).toBe('thunderstorm');
      expect(risks[2].severity).toBe('moderate');
      expect(risks[2].type).toBe('strong_winds');
    });

    it('does not treat missing values as zero', () => {
      const missingConditions: Partial<CurrentWeather> = {
        temperatureCelsius: 22,
        // uvIndex, precipitation, wind are all undefined
      };
      const risks = assessWeatherRisks(missingConditions);
      expect(risks).toHaveLength(0);
    });
  });

  describe('Overall Status and Summary Synthesis', () => {
    it('classifies ideal weather as optimal', () => {
      const status = determineOverallStatus(95, null);
      expect(status).toBe('optimal');

      const summary = generateWeatherSummary(status, 95, null, baseIdealWeather);
      expect(summary).toContain('Outstanding weather');
    });

    it('classifies good weather with minor low-level risk as favorable', () => {
      const lowRisk = assessWeatherRisks({ uvIndex: 4 })[0];
      const status = determineOverallStatus(85, lowRisk);
      expect(status).toBe('favorable');
    });

    it('classifies moderate risk or degraded comfort as caution', () => {
      const modRisk = assessWeatherRisks({ windSpeedKmH: 38 })[0];
      const status = determineOverallStatus(70, modRisk);
      expect(status).toBe('caution');
    });

    it('classifies high or extreme risks as adverse', () => {
      const highRisk = assessWeatherRisks({ feelsLikeCelsius: 40 })[0];
      const status = determineOverallStatus(40, highRisk);
      expect(status).toBe('adverse');
    });

    it('generates complete WeatherIntelligenceReport with non-official disclaimer', () => {
      const report = analyzeWeather(baseIdealWeather);

      expect(report.location.name).toBe('Nuwara Eliya');
      expect(report.comfortScore).toBe(100);
      expect(report.overallStatus).toBe('optimal');
      expect(report.highestRisk).toBeNull();
      expect(report.risks).toHaveLength(0);
      expect(report.advisoryDisclaimer).toBe(ADVISORY_DISCLAIMER);
      expect(report.advisoryDisclaimer).toContain('does not replace or supersede official warnings');
      expect(report.calculatedAt).toBeDefined();
    });
  });
});

