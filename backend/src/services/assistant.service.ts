import type {
  AssistantContextSummary,
  AssistantResponse,
  AssistantWeatherContext,
  IAssistantProvider,
} from '../types/assistant.types';
import { DeterministicAssistantService } from './deterministic-assistant.service';
import { GeminiAssistantService } from './gemini-assistant.service';

export class AssistantService {
  private readonly aiProvider: IAssistantProvider;
  private readonly fallbackProvider: IAssistantProvider;

  constructor(
    aiProvider: IAssistantProvider = new GeminiAssistantService(),
    fallbackProvider: IAssistantProvider = new DeterministicAssistantService()
  ) {
    this.aiProvider = aiProvider;
    this.fallbackProvider = fallbackProvider;
  }

  /**
   * Generates dynamic follow-up question chips based on the user's inquiry and conditions.
   */
  private generateFollowUpSuggestions(question: string): string[] {
    const q = question.toLowerCase();

    if (q.includes('run') || q.includes('jog') || q.includes('cycling') || q.includes('walk')) {
      return [
        'What should I wear today?',
        'Will it rain this evening?',
        'What is the best time to go outside?',
      ];
    }

    if (q.includes('rain') || q.includes('umbrella') || q.includes('storm')) {
      return [
        'What should I wear today?',
        'Should I go running this evening?',
        'Will it rain tomorrow?',
      ];
    }

    if (q.includes('wear') || q.includes('clothing') || q.includes('jacket')) {
      return [
        'Should I carry an umbrella?',
        'Should I go running this evening?',
        'Explain why today’s comfort score is low.',
      ];
    }

    if (q.includes('comfort') || q.includes('score')) {
      return [
        'What is the best time to go outside?',
        'What should I wear today?',
        'Will it rain tomorrow?',
      ];
    }

    return [
      'Should I go running this evening?',
      'Will it rain tomorrow?',
      'What should I wear today?',
      'Explain why today’s comfort score is low.',
    ];
  }

  /**
   * Builds the clean summary object from the full weather context.
   */
  buildContextSummary(context: AssistantWeatherContext): AssistantContextSummary {
    return {
      locationName: context.current.location.name || 'Selected Location',
      temperatureCelsius: context.current.temperatureCelsius,
      feelsLikeCelsius: context.current.feelsLikeCelsius,
      conditionDescription: context.current.description,
      comfortScore: context.intelligence.comfortScore,
      overallStatus: context.intelligence.overallStatus || 'favorable',
      bestOutdoorWindow: context.recommendations.bestOutdoorWindow?.label,
      activeHazardsCount: context.intelligence.risks?.length || 0,
    };
  }

  /**
   * Evaluates the user's question, querying the AI provider first and seamlessly
   * falling back to the deterministic rule-based assistant if unavailable.
   */
  async ask(
    question: string,
    context: AssistantWeatherContext
  ): Promise<AssistantResponse> {
    const weatherContext = this.buildContextSummary(context);
    const suggestedFollowUps = this.generateFollowUpSuggestions(question);

    // 1. Attempt AI Provider if available
    if (this.aiProvider.isAvailable()) {
      try {
        const aiAnswer = await this.aiProvider.generateAnswer(question, context);
        if (aiAnswer) {
          return {
            answer: aiAnswer,
            provider: this.aiProvider.providerName,
            weatherContext,
            suggestedFollowUps,
          };
        }
      } catch (err) {
        console.warn('[AssistantService] Primary AI provider encountered error. Falling back:', err);
      }
    }

    // 2. Deterministic Fallback Assistant
    const fallbackAnswer = await this.fallbackProvider.generateAnswer(question, context);

    return {
      answer: fallbackAnswer || 'Unable to generate an answer for this condition.',
      provider: this.fallbackProvider.providerName,
      weatherContext,
      suggestedFollowUps,
    };
  }
}

export const assistantService = new AssistantService();
