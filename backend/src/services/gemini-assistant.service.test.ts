import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiAssistantService } from './gemini-assistant.service';
import type { AssistantWeatherContext } from '../types/assistant.types';

const mockContext = {
  current: {
    location: { name: 'Colombo', coordinates: { latitude: 6.9271, longitude: 79.8612 } },
    temperatureCelsius: 28.0,
    feelsLikeCelsius: 31.0,
    humidityPercent: 70,
    windSpeedKmH: 12.0,
    windDirectionDegrees: 180,
    pressureHpa: 1012,
    cloudCoverPercent: 20,
    precipitationMm: 0,
    uvIndex: 6,
    conditionCode: 1,
    description: 'Clear',
    dayNight: 'day',
    isDay: true,
    timestamp: '2026-11-05T12:00:00Z',
    timezone: 'Asia/Colombo',
  },
  hourly: [],
  daily: [],
  intelligence: {
    comfortScore: 75,
    synthesis: { status: 'optimal', primaryDriver: 'Clear and pleasant' },
    risks: [],
  },
  recommendations: {
    activities: [{ activity: 'Running', suitability: 'good', reason: 'Clear' }],
    clothing: [{ title: 'Light', items: ['T-shirt'], reason: 'Warm' }],
    dailyAdvice: ['Enjoy the outdoors'],
    bestOutdoorWindow: { label: '6:00 AM – 9:00 AM', comfortScore: 85, reason: 'Cool breeze' },
  },
} as unknown as AssistantWeatherContext;

describe('GeminiAssistantService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports unavailable when no API key is provided', () => {
    const service = new GeminiAssistantService('');
    expect(service.isAvailable()).toBe(false);
  });

  it('returns null immediately when calling generateAnswer with no API key', async () => {
    const service = new GeminiAssistantService('');
    const result = await service.generateAnswer('Will it rain?', mockContext);
    expect(result).toBeNull();
  });

  it('returns generated text on successful Gemini response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: 'Running this evening is recommended between 6 PM and 8 PM.' }],
            },
          },
        ],
      }),
    } as unknown as Response);

    const service = new GeminiAssistantService('test-key-123');
    expect(service.isAvailable()).toBe(true);

    const result = await service.generateAnswer('Should I run?', mockContext);
    expect(result).toBe('Running this evening is recommended between 6 PM and 8 PM.');
  });

  it('returns null on 429 rate limit or quota exhaustion', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: 'Quota exceeded' }),
    } as unknown as Response);

    const service = new GeminiAssistantService('test-key-123');
    const result = await service.generateAnswer('Will it rain?', mockContext);
    expect(result).toBeNull();
  });

  it('returns null on provider 500 error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Internal error' }),
    } as unknown as Response);

    const service = new GeminiAssistantService('test-key-123');
    const result = await service.generateAnswer('Will it rain?', mockContext);
    expect(result).toBeNull();
  });

  it('returns null when API request times out or aborts', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const service = new GeminiAssistantService('test-key-123');
    const result = await service.generateAnswer('Will it rain?', mockContext);
    expect(result).toBeNull();
  });

  it('returns null when response has malformed parts or empty text', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: '   ' }] } }],
      }),
    } as unknown as Response);

    const service = new GeminiAssistantService('test-key-123');
    const result = await service.generateAnswer('Will it rain?', mockContext);
    expect(result).toBeNull();
  });
});

