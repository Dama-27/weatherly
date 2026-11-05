import { useEffect, useRef, useState } from 'react';
import { askWeatherAssistant } from '../services/weather.service';
import type {
  AssistantChatMessage,
  SavedLocation,
} from '../types/weather';

interface WeatherCopilotSectionProps {
  location: SavedLocation;
  getAccessTokenSilently?: (options?: any) => Promise<string | undefined>;
}

const DEFAULT_EXAMPLE_QUESTIONS = [
  'Should I go running this evening?',
  'Will it rain tomorrow?',
  'What should I wear today?',
  'Explain why today’s comfort score is low.',
  'What is the best time to go cycling?',
  'Is tomorrow suitable for a beach trip?',
];

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${messageCounter}`;
}

export default function WeatherCopilotSection({
  location,
  getAccessTokenSilently,
}: WeatherCopilotSectionProps) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [
    {
      id: createMessageId('welcome'),
      sender: 'assistant',
      text: `Hello! I am Weatherly's AI Copilot. Ask me anything about current conditions, forecasts, outdoor activity suitability, clothing suggestions, or comfort scores in ${location.name}.`,
      provider: 'rules',
      timestamp: 'Just now',
      suggestedFollowUps: [
        'Should I go running this evening?',
        'Will it rain tomorrow?',
        'What should I wear today?',
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) {
      return;
    }

    setError(null);
    setInputQuery('');

    const userMessage: AssistantChatMessage = {
      id: createMessageId('user'),
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      let token: string | undefined;
      if (getAccessTokenSilently) {
        try {
          token = await getAccessTokenSilently();
        } catch {
          // Token unavailable
        }
      }

      const response = await askWeatherAssistant(
        textToSend,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
        },
        token
      );

      const assistantMessage: AssistantChatMessage = {
        id: createMessageId('assistant'),
        sender: 'assistant',
        text: response.answer,
        provider: response.provider,
        timestamp: 'Just now',
        suggestedFollowUps: response.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unable to connect to weather assistant.';
      setError(errorMsg);

      const errorMessage: AssistantChatMessage = {
        id: createMessageId('assistant_err'),
        sender: 'assistant',
        text: `Sorry, I encountered an issue: ${errorMsg}`,
        timestamp: 'Just now',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: createMessageId('welcome'),
        sender: 'assistant',
        text: `Conversation cleared. How can I help you with the weather in ${location.name}?`,
        provider: 'rules',
        timestamp: 'Just now',
        suggestedFollowUps: [
          'Should I go running this evening?',
          'Will it rain tomorrow?',
          'What should I wear today?',
        ],
      },
    ]);
    setError(null);
  };

  return (
    <section className="forecast-section copilot-section">
      <div className="copilot-header-row">
        <div className="copilot-title-group">
          <div className="copilot-icon-badge">✨</div>
          <div>
            <h3 className="section-title">AI Weather Copilot</h3>
            <p className="copilot-subtitle">
              Ask natural-language questions about conditions, activities, clothing, and forecasts.
            </p>
          </div>
        </div>

        <div className="copilot-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearHistory}
            title="Clear chat history"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Suggested Starter Questions */}
      <div className="copilot-suggestions-bar">
        <span className="suggestions-label">Try asking:</span>
        <div className="suggestions-chips-container">
          {DEFAULT_EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSend(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="copilot-chat-box">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`copilot-message-row ${
              msg.sender === 'user' ? 'message-user' : 'message-assistant'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="assistant-avatar" aria-hidden="true">
                ✨
              </div>
            )}

            <div className="message-bubble-wrapper">
              <div
                className={`message-bubble ${
                  msg.sender === 'user' ? 'bubble-user' : 'bubble-assistant'
                } ${msg.isError ? 'bubble-error' : ''}`}
              >
                {msg.sender === 'assistant' && msg.provider && (
                  <div className="provider-tag-row">
                    {msg.provider === 'gemini' ? (
                      <span className="copilot-badge badge-gemini">
                        🤖 AI Copilot (Gemini)
                      </span>
                    ) : (
                      <span className="copilot-badge badge-rules">
                        ⚡ Rule-Based Engine (Fallback)
                      </span>
                    )}
                  </div>
                )}

                <p className="message-text">{msg.text}</p>
                <span className="message-timestamp">{msg.timestamp}</span>
              </div>

              {/* Dynamic Follow-Up Chips */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="message-follow-ups">
                  {msg.suggestedFollowUps.map((followUp) => (
                    <button
                      key={followUp}
                      type="button"
                      className="follow-up-pill"
                      onClick={() => handleSend(followUp)}
                      disabled={loading}
                    >
                      {followUp} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="copilot-message-row message-assistant">
            <div className="assistant-avatar" aria-hidden="true">
              ✨
            </div>
            <div className="message-bubble bubble-assistant bubble-loading">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
              <span className="typing-label">Analyzing meteorological data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <p className="error-message copilot-error-banner">{error}</p>}

      {/* Input Bar */}
      <div className="copilot-input-bar">
        <input
          type="text"
          className="copilot-input"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about running, rain, clothing, or comfort in ${location.name}...`}
          maxLength={300}
          disabled={loading}
          aria-label="Ask Weather Copilot"
        />
        <button
          type="button"
          className="btn btn-primary copilot-send-btn"
          onClick={() => handleSend()}
          disabled={loading || inputQuery.trim().length === 0}
        >
          {loading ? (
            'Asking...'
          ) : (
            <>
              <span>Ask</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
