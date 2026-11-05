import { describe, expect, it } from 'vitest';
import {
  evaluateActivities,
  findBestOutdoorWindow,
  generateClothingRecommendations,
  generateDailyAdvice,
  generateRecommendations,
} from './weather-recommendation.service';
import type { CurrentWeather, HourlyForecast } from '../types/weather-domain.types';

describe('Weather Recommendation Service', () => {
  const baseComfortableWeather: CurrentWeather = {
    location: {
      name: 'Kandy',
      coordinates: { latitude: 7.2906, longitude: 80.6337 },
      timezone: 'Asia/Colombo',
    },
    temperatureCelsius: 21,
    feelsLikeCelsius: 22,
    humidityPercent: 55,
    windSpeedKmH: 10,
    windDirectionDegrees: 120,
    pressureHpa: 1013,
    cloudCoverPercent: 25,
    precipitationMm: 0,
    uvIndex: 2,
    conditionCode: 1,
    description: 'Mainly clear',
    dayNight: 'day',
    isDay: true,
    timestamp: '2026-11-05T08:00:00Z',
    timezone: 'Asia/Colombo',
  };

  const sampleHourly: HourlyForecast[] = [
    {
      timestamp: '2026-11-05T06:00:00Z',
      temperatureCelsius: 18,
      feelsLikeCelsius: 18,
      humidityPercent: 65,
      precipitationMm: 0,
      windSpeedKmH: 8,
      windDirectionDegrees: 100,
      pressureHpa: 1014,
      cloudCoverPercent: 20,
      uvIndex: 0,
      conditionCode: 0,
      description: 'Clear',
      dayNight: 'night',
      isDay: false,
    },
    {
      timestamp: '2026-11-05T07:00:00Z',
      temperatureCelsius: 20,
      feelsLikeCelsius: 20,
      humidityPercent: 60,
      precipitationMm: 0,
      windSpeedKmH: 9,
      windDirectionDegrees: 110,
      pressureHpa: 1014,
      cloudCoverPercent: 15,
      uvIndex: 1,
      conditionCode: 0,
      description: 'Clear',
      dayNight: 'day',
      isDay: true,
    },
    {
      timestamp: '2026-11-05T08:00:00Z',
      temperatureCelsius: 22,
      feelsLikeCelsius: 22,
      humidityPercent: 55,
      precipitationMm: 0,
      windSpeedKmH: 10,
      windDirectionDegrees: 120,
      pressureHpa: 1013,
      cloudCoverPercent: 10,
      uvIndex: 3,
      conditionCode: 0,
      description: 'Clear',
      dayNight: 'day',
      isDay: true,
    },
    {
      timestamp: '2026-11-05T13:00:00Z',
      temperatureCelsius: 32,
      feelsLikeCelsius: 38,
      humidityPercent: 70,
      precipitationMm: 0,
      windSpeedKmH: 12,
      windDirectionDegrees: 180,
      pressureHpa: 1011,
      cloudCoverPercent: 40,
      uvIndex: 9,
      conditionCode: 2,
      description: 'Partly cloudy',
      dayNight: 'day',
      isDay: true,
    },
  ];

  describe('Outdoor Activities Evaluation', () => {
    it('rates activities as excellent in pleasant comfortable conditions', () => {
      const activities = evaluateActivities(baseComfortableWeather, sampleHourly);

      const walking = activities.find((a) => a.activity === 'Walking');
      const running = activities.find((a) => a.activity === 'Running');
      const cycling = activities.find((a) => a.activity === 'Cycling');

      expect(walking?.suitability).toBe('excellent');
      expect(running?.suitability).toBe('excellent');
      expect(cycling?.suitability).toBe('excellent');
      expect(walking?.bestTimeWindow).toBeDefined();
    });

    it('marks high-exertion activities as poor during severe heat', () => {
      const hotWeather: CurrentWeather = {
        ...baseComfortableWeather,
        temperatureCelsius: 35,
        feelsLikeCelsius: 41,
        humidityPercent: 78,
      };

      const activities = evaluateActivities(hotWeather);
      const running = activities.find((a) => a.activity === 'Running');
      const hiking = activities.find((a) => a.activity === 'Hiking');

      expect(running?.suitability).toBe('poor');
      expect(running?.reason).toContain('Heat stress');
      expect(hiking?.suitability).toBe('poor');
    });

    it('marks road and trail activities as poor during heavy rain and thunderstorms', () => {
      const stormyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        conditionCode: 96,
        precipitationMm: 15,
        windSpeedKmH: 45,
      };

      const activities = evaluateActivities(stormyWeather);

      activities.forEach((act) => {
        expect(act.suitability).toBe('poor');
      });
      expect(activities[0].reason).toContain('Thunderstorm');
    });

    it('marks beach activities as poor when it is chilly or raining', () => {
      const coldRainyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        temperatureCelsius: 16,
        feelsLikeCelsius: 15,
        precipitationMm: 4,
      };

      const activities = evaluateActivities(coldRainyWeather);
      const beach = activities.find((a) => a.activity === 'Beach activities');
      expect(beach?.suitability).toBe('poor');
    });

    it('marks cycling as poor in dangerous high winds', () => {
      const windyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        windSpeedKmH: 48,
      };

      const activities = evaluateActivities(windyWeather);
      const cycling = activities.find((a) => a.activity === 'Cycling');
      expect(cycling?.suitability).toBe('poor');
      expect(cycling?.reason).toContain('wind resistance');
    });
  });

  describe('Clothing Recommendations', () => {
    it('suggests light breathable clothing and sun protection for warm sunny conditions', () => {
      const sunnyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        temperatureCelsius: 29,
        feelsLikeCelsius: 33,
        uvIndex: 8,
      };

      const clothing = generateClothingRecommendations(sunnyWeather);
      const categories = clothing.map((c) => c.category);

      expect(categories).toContain('light_clothing');
      expect(categories).toContain('sun_protection');

      const sun = clothing.find((c) => c.category === 'sun_protection');
      expect(sun?.isPrimary).toBe(true);
      expect(sun?.items.some((i) => i.includes('SPF'))).toBe(true);
    });

    it('suggests warm layering and winter protection for cold conditions', () => {
      const chillyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        temperatureCelsius: 8,
        feelsLikeCelsius: 6,
      };

      const clothing = generateClothingRecommendations(chillyWeather);
      const warm = clothing.find((c) => c.category === 'warm_clothing');

      expect(warm).toBeDefined();
      expect(warm?.title).toContain('Heavy Cold Protection');
    });

    it('suggests rain protection when precipitation is active', () => {
      const rainyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        precipitationMm: 3.5,
        conditionCode: 61,
      };

      const clothing = generateClothingRecommendations(rainyWeather);
      const rain = clothing.find((c) => c.category === 'rain_protection');

      expect(rain).toBeDefined();
      expect(rain?.isPrimary).toBe(true);
      expect(rain?.items).toContain('Compact umbrella');
    });

    it('suggests wind protection when winds are strong', () => {
      const blusteryWeather: CurrentWeather = {
        ...baseComfortableWeather,
        windSpeedKmH: 42,
      };

      const clothing = generateClothingRecommendations(blusteryWeather);
      const wind = clothing.find((c) => c.category === 'wind_protection');

      expect(wind).toBeDefined();
      expect(wind?.isPrimary).toBe(true);
    });
  });

  describe('Best Outdoor Window Discovery', () => {
    it('discovers continuous comfortable time windows with minimal rain', () => {
      const best = findBestOutdoorWindow(sampleHourly, 'Asia/Colombo');

      expect(best).not.toBeNull();
      expect(best?.label).toBeDefined();
      expect(best?.comfortScore).toBeGreaterThan(60);
      expect(best?.reason).toContain('Highest predicted comfort');
    });

    it('returns null when hourly data has insufficient entries', () => {
      expect(findBestOutdoorWindow([])).toBeNull();
      expect(findBestOutdoorWindow(sampleHourly.slice(0, 2))).toBeNull();
    });
  });

  describe('Daily Advice Generation', () => {
    it('includes specific precautions for severe heat and UV', () => {
      const hotWeather: CurrentWeather = {
        ...baseComfortableWeather,
        temperatureCelsius: 36,
        feelsLikeCelsius: 41,
        uvIndex: 9,
      };

      const advice = generateDailyAdvice(hotWeather, null);

      expect(advice.some((a) => a.includes('hydration'))).toBe(true);
      expect(advice.some((a) => a.includes('UV index is very high'))).toBe(true);
    });

    it('includes umbrella warning during rain', () => {
      const rainyWeather: CurrentWeather = {
        ...baseComfortableWeather,
        precipitationMm: 2.0,
      };

      const advice = generateDailyAdvice(rainyWeather, null);
      expect(advice.some((a) => a.includes('umbrella'))).toBe(true);
    });
  });

  describe('Complete Recommendations Synthesis', () => {
    it('synthesizes full report reusing intelligence comfort score and status', () => {
      const report = generateRecommendations(baseComfortableWeather, sampleHourly);

      expect(report.location.name).toBe('Kandy');
      expect(report.comfortScore).toBe(100);
      expect(report.overallStatus).toBe('optimal');
      expect(report.activities).toHaveLength(7);
      expect(report.clothing.length).toBeGreaterThan(0);
      expect(report.dailyAdvice.length).toBeGreaterThan(0);
      expect(report.bestOutdoorWindow).not.toBeNull();
      expect(report.calculatedAt).toBeDefined();
    });
  });
});
