import { describe, expect, it, vi } from 'vitest';
import { AssistantService } from './assistant.service';
import type {
  AssistantWeatherContext,
  IAssistantProvider,
} from '../types/assistant.types';

const mockContext = {
  current: {
    location: { name: 'Colombo' },
    temperatureCelsius: 28.0,
    feelsLikeCelsius: 32.0,
    description: 'Partly cloudy',
  },
  intelligence: {
    comfortScore: 72,
    overallStatus: 'favorable',
    summary: 'Clear and pleasant',
    risks: [],
  },
  recommendations: {
    bestOutdoorWindow: { label: '6:00 AM – 8:00 AM' },
  },
} as unknown as AssistantWeatherContext;

describe('AssistantService Coordinator', () => {
  it('returns AI response and provider tag when AI succeeds', async () => {
    const mockAi: IAssistantProvider = {
      providerName: 'gemini',
      isAvailable: () => true,
      generateAnswer: vi.fn().mockResolvedValue('AI generated answer for running.'),
    };

    const mockFallback: IAssistantProvider = {
      providerName: 'rules',
      isAvailable: () => true,
      generateAnswer: vi.fn().mockResolvedValue('Fallback answer.'),
    };

    const coordinator = new AssistantService(mockAi, mockFallback);
    const response = await coordinator.ask('Should I run?', mockContext);

    expect(response.provider).toBe('gemini');
    expect(response.answer).toBe('AI generated answer for running.');
    expect(response.weatherContext.temperatureCelsius).toBe(28.0);
    expect(response.weatherContext.comfortScore).toBe(72);
    expect(Array.isArray(response.suggestedFollowUps)).toBe(true);
    expect(mockAi.generateAnswer).toHaveBeenCalledTimes(1);
    expect(mockFallback.generateAnswer).not.toHaveBeenCalled();
  });

  it('falls back to deterministic assistant when AI provider is unavailable', async () => {
    const mockAi: IAssistantProvider = {
      providerName: 'gemini',
      isAvailable: () => false,
      generateAnswer: vi.fn(),
    };

    const mockFallback: IAssistantProvider = {
      providerName: 'rules',
      isAvailable: () => true,
      generateAnswer: vi.fn().mockResolvedValue('Deterministic rule answer.'),
    };

    const coordinator = new AssistantService(mockAi, mockFallback);
    const response = await coordinator.ask('Should I run?', mockContext);

    expect(response.provider).toBe('rules');
    expect(response.answer).toBe('Deterministic rule answer.');
    expect(mockAi.generateAnswer).not.toHaveBeenCalled();
    expect(mockFallback.generateAnswer).toHaveBeenCalledTimes(1);
  });

  it('falls back to deterministic assistant when AI provider fails or returns null', async () => {
    const mockAi: IAssistantProvider = {
      providerName: 'gemini',
      isAvailable: () => true,
      generateAnswer: vi.fn().mockResolvedValue(null),
    };

    const mockFallback: IAssistantProvider = {
      providerName: 'rules',
      isAvailable: () => true,
      generateAnswer: vi.fn().mockResolvedValue('Deterministic fallback answer after AI timeout.'),
    };

    const coordinator = new AssistantService(mockAi, mockFallback);
    const response = await coordinator.ask('Will it rain?', mockContext);

    expect(response.provider).toBe('rules');
    expect(response.answer).toBe('Deterministic fallback answer after AI timeout.');
    expect(mockFallback.generateAnswer).toHaveBeenCalledTimes(1);
  });
});
