import { describe, expect, it } from 'vitest';
import { DeterministicAssistantService } from './deterministic-assistant.service';
import type { AssistantWeatherContext } from '../types/assistant.types';

const mockContext: AssistantWeatherContext = {
  current: {
    location: {
      name: 'Colombo',
      coordinates: { latitude: 6.9271, longitude: 79.8612 },
      country: 'Sri Lanka',
      timezone: 'Asia/Colombo',
    },
    temperatureCelsius: 28.0,
    feelsLikeCelsius: 32.0,
    humidityPercent: 75,
    windSpeedKmH: 14.0,
    windDirectionDegrees: 180,
    pressureHpa: 1012,
    cloudCoverPercent: 30,
    precipitationMm: 0,
    uvIndex: 7,
    conditionCode: 1,
    description: 'Mainly clear',
    dayNight: 'day',
    isDay: true,
    timestamp: '2026-11-05T12:00:00Z',
    timezone: 'Asia/Colombo',
  },
  hourly: [
    {
      timestamp: '2026-11-05T17:00:00Z',
      temperatureCelsius: 27.0,
      feelsLikeCelsius: 29.0,
      humidityPercent: 70,
      windSpeedKmH: 12.0,
      windDirectionDegrees: 180,
      pressureHpa: 1011,
      cloudCoverPercent: 40,
      precipitationMm: 0,
      precipitationProbabilityPercent: 15,
      conditionCode: 1,
      description: 'Clear',
      dayNight: 'day',
      isDay: true,
      uvIndex: 2,
    },
    {
      timestamp: '2026-11-05T18:00:00Z',
      temperatureCelsius: 26.0,
      feelsLikeCelsius: 28.0,
      humidityPercent: 75,
      windSpeedKmH: 10.0,
      windDirectionDegrees: 180,
      pressureHpa: 1011,
      cloudCoverPercent: 40,
      precipitationMm: 0,
      precipitationProbabilityPercent: 20,
      conditionCode: 1,
      description: 'Clear',
      dayNight: 'night',
      isDay: false,
      uvIndex: 0,
    },
  ],
  daily: [
    {
      date: '2026-11-05',
      conditionCode: 1,
      description: 'Mainly clear',
      minTemperatureCelsius: 24.0,
      maxTemperatureCelsius: 31.0,
      feelsLikeMinCelsius: 25.0,
      feelsLikeMaxCelsius: 34.0,
      precipitationProbabilityMaxPercent: 20,
      precipitationSumMm: 0,
      uvIndexMax: 8,
      maxWindSpeedKmH: 16.0,
      dominantWindDirectionDegrees: 180,
    },
    {
      date: '2026-11-06',
      conditionCode: 61,
      description: 'Slight rain',
      minTemperatureCelsius: 24.5,
      maxTemperatureCelsius: 29.5,
      feelsLikeMinCelsius: 26.0,
      feelsLikeMaxCelsius: 32.0,
      precipitationProbabilityMaxPercent: 65,
      precipitationSumMm: 4.2,
      uvIndexMax: 6,
      maxWindSpeedKmH: 18.0,
      dominantWindDirectionDegrees: 190,
    },
  ],
  intelligence: {
    location: {
      name: 'Colombo',
      coordinates: { latitude: 6.9271, longitude: 79.8612 },
      country: 'Sri Lanka',
      timezone: 'Asia/Colombo',
    },
    comfortScore: 68,
    overallStatus: 'favorable',
    highestRisk: null,
    summary: 'Pleasant temperatures and mild breeze.',
    risks: [
      {
        type: 'high_uv',
        severity: 'moderate',
        headline: 'High Solar UV Radiation (Index 7)',
        explanation: 'Protection required during midday.',
        measuredValue: { value: 7, unit: 'index', metric: 'UV' },
        suggestedPrecaution: 'Wear sunscreen and sunglasses.',
      },
    ],
    evaluatedConditions: {},
    advisoryDisclaimer: 'Notice',
    calculatedAt: '2026-11-05T12:00:00Z',
  },
  recommendations: {
    location: {
      name: 'Colombo',
      coordinates: { latitude: 6.9271, longitude: 79.8612 },
      timezone: 'Asia/Colombo',
    },
    comfortScore: 68,
    overallStatus: 'favorable',
    activities: [
      {
        activity: 'Running',
        suitability: 'good',
        reason: 'Temperatures are moderate. Hydrate well.',
        bestTimeWindow: '6:00 AM – 8:00 AM',
      },
      {
        activity: 'Cycling',
        suitability: 'excellent',
        reason: 'Dry roads and calm wind conditions.',
        bestTimeWindow: '5:00 PM – 7:00 PM',
      },
    ],
    clothing: [
      {
        category: 'light_clothing',
        title: 'Light & Breathable Attire',
        items: ['T-shirt', 'Shorts', 'Cotton fabrics'],
        reason: 'Warm conditions with feels-like 32°C.',
        isPrimary: true,
      },
      {
        category: 'sun_protection',
        title: 'Sun Protection',
        items: ['Sunglasses', 'Sunscreen'],
        reason: 'UV index is 7.',
        isPrimary: false,
      },
    ],
    dailyAdvice: ['Carry sunglasses for daytime activities.'],
    bestOutdoorWindow: {
      startTime: '2026-11-05T06:00',
      endTime: '2026-11-05T08:00',
      label: '6:00 AM – 8:00 AM',
      comfortScore: 78,
      reason: 'Cool morning temperatures and low humidity.',
    },
    calculatedAt: '2026-11-05T12:00:00Z',
  },
};

describe('DeterministicAssistantService', () => {
  const assistant = new DeterministicAssistantService();

  it('answers running query with suitability, reasons, and evening inspection', async () => {
    const answer = await assistant.generateAnswer('Should I go running this evening?', mockContext);
    expect(answer).toContain('For running in Colombo');
    expect(answer).toContain('GOOD');
    expect(answer).toContain('6:00 AM – 8:00 AM');
    expect(answer).toContain('temperatures will hover around');
  });

  it('answers cycling query with activity suitability and recommended window', async () => {
    const answer = await assistant.generateAnswer('What is the best time to go cycling?', mockContext);
    expect(answer).toContain('Cycling conditions in Colombo');
    expect(answer).toContain('EXCELLENT');
    expect(answer).toContain('5:00 PM – 7:00 PM');
  });

  it('answers tomorrow rain query using tomorrow daily forecast data', async () => {
    const answer = await assistant.generateAnswer('Will it rain tomorrow?', mockContext);
    expect(answer).toContain('Tomorrow in Colombo');
    expect(answer).toContain('65%');
    expect(answer).toContain('4.2 mm');
    expect(answer).toContain('Carrying an umbrella is recommended');
  });

  it('answers clothing query with recommended garments and UV protection', async () => {
    const answer = await assistant.generateAnswer('What should I wear today?', mockContext);
    expect(answer).toContain('Wear T-shirt, Shorts, Cotton fabrics');
    expect(answer).toContain('Bring sunglasses and apply sunscreen');
  });

  it('explains comfort score drivers and active risk considerations', async () => {
    const answer = await assistant.generateAnswer('Explain why today’s comfort score is low', mockContext);
    expect(answer).toContain('Comfort Score for Colombo is 68/100');
    expect(answer).toContain('FAVORABLE');
    expect(answer).toContain('High Solar UV Radiation');
  });

  it('answers best outdoor window query', async () => {
    const answer = await assistant.generateAnswer('What is the best time to go outside?', mockContext);
    expect(answer).toContain('The best outdoor window in Colombo is 6:00 AM – 8:00 AM');
    expect(answer).toContain('78/100');
  });

  it('politely rejects non-weather queries and explains assistant boundaries', async () => {
    const answer = await assistant.generateAnswer('What is the capital of Australia?', mockContext);
    expect(answer).toContain("I am Weatherly's weather copilot");
    expect(answer).toContain('I cannot assist with non-weather topics');
  });
});
