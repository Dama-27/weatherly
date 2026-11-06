import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeScheduledAlertEvaluation, handler } from './scheduled-alerts.worker';
import { InMemoryAlertRepository } from '../repositories/in-memory-alert.repository';
import { setAlertRepository } from '../repositories/alert-repository.factory';
import * as weatherFactory from '../providers/weather-provider.factory';
import type { CompleteWeatherResponse } from '../types/weather-domain.types';

describe('Scheduled Alerts Lambda Worker', () => {
  let memoryRepo: InMemoryAlertRepository;

  const colomboLocation = {
    name: 'Colombo',
    country: 'LK',
    timezone: 'Asia/Colombo',
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
  };

  const mockColomboWeather: CompleteWeatherResponse = {
    location: colomboLocation,
    current: {
      location: colomboLocation,
      temperatureCelsius: 34,
      feelsLikeCelsius: 38,
      humidityPercent: 80,
      windSpeedKmH: 15,
      windDirectionDegrees: 200,
      uvIndex: 9,
      precipitationMm: 0,
      pressureHpa: 1012,
      cloudCoverPercent: 10,
      conditionCode: 0,
      description: 'Clear sky',
      dayNight: 'day',
      isDay: true,
      timestamp: '2026-11-06T12:00:00Z',
      timezone: 'Asia/Colombo',
    },
    hourly: [
      {
        timestamp: '2026-11-06T13:00:00Z',
        temperatureCelsius: 35,
        feelsLikeCelsius: 39,
        humidityPercent: 78,
        precipitationProbabilityPercent: 10,
        precipitationMm: 0,
        windSpeedKmH: 16,
        windDirectionDegrees: 200,
        pressureHpa: 1012,
        cloudCoverPercent: 10,
        uvIndex: 9,
        conditionCode: 0,
        description: 'Clear sky',
        dayNight: 'day',
        isDay: true,
      },
    ],
    daily: [],
  };

  const londonLocation = {
    name: 'London',
    country: 'GB',
    timezone: 'Europe/London',
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
  };

  const mockLondonWeather: CompleteWeatherResponse = {
    location: londonLocation,
    current: {
      location: londonLocation,
      temperatureCelsius: 12,
      feelsLikeCelsius: 10,
      humidityPercent: 70,
      windSpeedKmH: 18,
      windDirectionDegrees: 240,
      uvIndex: 2,
      precipitationMm: 0,
      pressureHpa: 1015,
      cloudCoverPercent: 80,
      conditionCode: 3,
      description: 'Overcast',
      dayNight: 'day',
      isDay: true,
      timestamp: '2026-11-06T12:00:00Z',
      timezone: 'Europe/London',
    },
    hourly: [],
    daily: [],
  };

  beforeEach(() => {
    memoryRepo = new InMemoryAlertRepository();
    setAlertRepository(memoryRepo);
    vi.restoreAllMocks();
  });

  it('completes gracefully when no enabled alerts exist', async () => {
    const result = await executeScheduledAlertEvaluation({ repository: memoryRepo });
    expect(result.status).toBe('completed');
    expect(result.processedAlerts).toBe(0);
    expect(result.triggeredAlerts).toBe(0);
    expect(result.deduplicatedAlerts).toBe(0);
    expect(result.locationsEvaluated).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('evaluates enabled alerts, triggers notifications, and persists evaluation records', async () => {
    // Alert that WILL trigger: temp_above 30 in Colombo (mock is 34°C)
    await memoryRepo.saveAlert('user-1', {
      id: 'alert-heat',
      userId: 'user-1',
      type: 'temp_above',
      threshold: 30,
      enabled: true,
      location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
      createdAt: '2026-11-06T10:00:00Z',
    });

    // Alert that will NOT trigger: temp_below 10 in Colombo (mock is 34°C)
    await memoryRepo.saveAlert('user-1', {
      id: 'alert-cold',
      userId: 'user-1',
      type: 'temp_below',
      threshold: 10,
      enabled: true,
      location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
      createdAt: '2026-11-06T10:00:00Z',
    });

    // Mock weather provider
    const getForecastMock = vi.fn().mockResolvedValue(mockColomboWeather);
    vi.spyOn(weatherFactory, 'createWeatherProvider').mockReturnValue({
      getForecast: getForecastMock,
    } as any);

    const result = await executeScheduledAlertEvaluation({ repository: memoryRepo });

    expect(result.status).toBe('completed');
    expect(result.processedAlerts).toBe(2);
    expect(result.triggeredAlerts).toBe(1);
    expect(result.deduplicatedAlerts).toBe(0);
    expect(result.locationsEvaluated).toBe(1);
    expect(result.errors).toEqual([]);

    // Location should be fetched exactly once for both rules
    expect(getForecastMock).toHaveBeenCalledTimes(1);

    // Verify evaluation record was persisted for duplicate suppression
    const hasRecord = await memoryRepo.hasEvaluationRecord(
      'user-1',
      'alert-heat',
      '2026-11-06T12:00:00Z'
    );
    expect(hasRecord).toBe(true);
  });

  it('suppresses duplicate alert triggers when already evaluated for the same period', async () => {
    await memoryRepo.saveAlert('user-1', {
      id: 'alert-uv',
      userId: 'user-1',
      type: 'uv_index_above',
      threshold: 7,
      enabled: true,
      location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
      createdAt: '2026-11-06T10:00:00Z',
    });

    vi.spyOn(weatherFactory, 'createWeatherProvider').mockReturnValue({
      getForecast: vi.fn().mockResolvedValue(mockColomboWeather),
    } as any);

    // 1st run triggers and persists
    const run1 = await executeScheduledAlertEvaluation({ repository: memoryRepo });
    expect(run1.triggeredAlerts).toBe(1);
    expect(run1.deduplicatedAlerts).toBe(0);

    // 2nd run with same timestamp should be deduplicated
    const run2 = await executeScheduledAlertEvaluation({ repository: memoryRepo });
    expect(run2.triggeredAlerts).toBe(0);
    expect(run2.deduplicatedAlerts).toBe(1);
  });

  it('safely isolates partial location failures without aborting worker execution', async () => {
    // Alert in London (will fail)
    await memoryRepo.saveAlert('user-1', {
      id: 'alert-london',
      userId: 'user-1',
      type: 'wind_speed_above',
      threshold: 15,
      enabled: true,
      location: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
      createdAt: '2026-11-06T10:00:00Z',
    });

    // Alert in Colombo (will succeed)
    await memoryRepo.saveAlert('user-2', {
      id: 'alert-colombo',
      userId: 'user-2',
      type: 'temp_above',
      threshold: 28,
      enabled: true,
      location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
      createdAt: '2026-11-06T10:00:00Z',
    });

    const getForecastMock = vi.fn().mockImplementation((coords: any) => {
      if (coords.latitude > 50) {
        throw new Error('Upstream weather service timeout in London');
      }
      return Promise.resolve(mockColomboWeather);
    });

    vi.spyOn(weatherFactory, 'createWeatherProvider').mockReturnValue({
      getForecast: getForecastMock,
    } as any);

    const result = await executeScheduledAlertEvaluation({ repository: memoryRepo });

    expect(result.status).toBe('completed');
    expect(result.locationsEvaluated).toBe(2);
    expect(result.triggeredAlerts).toBe(1); // Colombo succeeded
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].location).toBe('London');
    expect(result.errors[0].error).toContain('Upstream weather service timeout');
  });

  it('disables callbackWaitsForEmptyEventLoop in Lambda handler wrapper', async () => {
    const mockContext: any = {
      callbackWaitsForEmptyEventLoop: true,
    };

    vi.spyOn(weatherFactory, 'createWeatherProvider').mockReturnValue({
      getForecast: vi.fn().mockResolvedValue(mockColomboWeather),
    } as any);

    const result: any = await handler({}, mockContext, () => {});
    expect(mockContext.callbackWaitsForEmptyEventLoop).toBe(false);
    expect(result.status).toBe('completed');
  });
});
