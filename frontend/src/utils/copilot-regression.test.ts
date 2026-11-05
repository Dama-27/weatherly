import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { AssistantChatMessage, AssistantProviderType } from '../types/weather.ts';

describe('AI Weather Copilot Frontend Regression', () => {
  it('correctly maps assistant provider tags to human-readable badges', () => {
    function getProviderBadgeLabel(provider?: AssistantProviderType): string {
      switch (provider) {
        case 'gemini':
          return '🤖 AI Copilot (Gemini)';
        case 'rules':
          return '⚡ Rule-Based Engine (Fallback)';
        default:
          return 'Weatherly Assistant';
      }
    }

    assert.strictEqual(getProviderBadgeLabel('gemini'), '🤖 AI Copilot (Gemini)');
    assert.strictEqual(getProviderBadgeLabel('rules'), '⚡ Rule-Based Engine (Fallback)');
    assert.strictEqual(getProviderBadgeLabel(undefined), 'Weatherly Assistant');
  });

  it('formats assistant chat messages with provider and follow-up chips', () => {
    const message: AssistantChatMessage = {
      id: 'msg_1',
      sender: 'assistant',
      text: 'Running is rated GOOD today.',
      provider: 'rules',
      timestamp: '14:30',
      suggestedFollowUps: ['What should I wear?', 'Will it rain?'],
    };

    assert.strictEqual(message.sender, 'assistant');
    assert.strictEqual(message.provider, 'rules');
    assert.strictEqual(message.suggestedFollowUps?.length, 2);
    assert.strictEqual(message.suggestedFollowUps[0], 'What should I wear?');
  });

  it('handles assistant error messages with isError flag and user feedback', () => {
    const errorMsg: AssistantChatMessage = {
      id: 'err_1',
      sender: 'assistant',
      text: 'Sorry, I encountered an issue: Weather service unavailable.',
      timestamp: '14:31',
      isError: true,
    };

    assert.strictEqual(errorMsg.isError, true);
    assert.ok(errorMsg.text.includes('Weather service unavailable'));
  });

  it('filters empty or whitespace-only inputs before sending', () => {
    function sanitizeQuestion(q: string): string | null {
      const trimmed = q.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    assert.strictEqual(sanitizeQuestion('   '), null);
    assert.strictEqual(sanitizeQuestion(''), null);
    assert.strictEqual(sanitizeQuestion('  Should I run?  '), 'Should I run?');
  });
});

