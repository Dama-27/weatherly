import { Request, Response } from 'express';
import { parseCoordinates, ValidationError } from '../common/validation';
import { env } from '../config/env';
import { OpenMeteoError } from '../providers/open-meteo/open-meteo.types';
import { createWeatherProvider } from '../providers/weather-provider.factory';
import { assistantService } from '../services/assistant.service';
import { analyzeWeather } from '../services/weather-intelligence.service';
import { generateRecommendations } from '../services/weather-recommendation.service';
import type { CompleteWeatherResponse } from '../types/weather-domain.types';
import type { AssistantWeatherContext } from '../types/assistant.types';

const MAX_QUESTION_LENGTH = 300;

export async function askAssistant(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const rawQuestion = request.body?.question;
    if (typeof rawQuestion !== 'string' || rawQuestion.trim().length === 0) {
      throw new ValidationError('Question cannot be empty.');
    }

    const question = rawQuestion.trim();
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new ValidationError(`Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.`);
    }

    const rawLoc = request.body?.location;
    if (!rawLoc || typeof rawLoc !== 'object') {
      throw new ValidationError('Location coordinates are required.');
    }

    const { latitude, longitude } = parseCoordinates(rawLoc.latitude, rawLoc.longitude);
    const locationName = typeof rawLoc.name === 'string' ? rawLoc.name.trim() : undefined;

    // Retrieve weather forecast data
    const provider = createWeatherProvider(env.weatherProvider);
    const forecast: CompleteWeatherResponse = await provider.getForecast(
      { latitude, longitude },
      { days: 7, includeHourly: true },
      locationName
    );

    // Synthesize intelligence and recommendations
    const intelligence = analyzeWeather(forecast.current);
    const recommendations = generateRecommendations(forecast.current, forecast.hourly);

    const weatherContext: AssistantWeatherContext = {
      current: forecast.current,
      hourly: forecast.hourly,
      daily: forecast.daily,
      intelligence,
      recommendations,
    };

    const result = await assistantService.ask(question, weatherContext);

    response.json(result);
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      response.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof OpenMeteoError) {
      if (err.isTimeout) {
        response.status(504).json({ error: 'Weather provider timed out while gathering context for assistant.' });
        return;
      }
      response.status(502).json({ error: 'Weather provider error while gathering context for assistant.' });
      return;
    }

    if (err instanceof Error && err.name === 'AbortError') {
      response.status(504).json({ error: 'Assistant request timed out.' });
      return;
    }

    console.error('Unexpected error in askAssistant:', err);
    response.status(500).json({ error: 'Internal server error while processing assistant question.' });
  }
}

