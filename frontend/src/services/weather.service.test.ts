import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  askWeatherAssistant,
  evaluateWeatherAlerts,
  getCurrentWeather,
  getDailyForecast,
  getHourlyForecast,
  getWeatherData,
  getWeatherRecommendations,
  searchLocations,
} from './weather.service.ts';

describe('Frontend Weather Service', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('searchLocations', () => {
    it('sends trimmed query parameter and returns results list', async () => {
      let requestedUrl = '';
      let requestedHeaders: any = null;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requestedUrl = url;
        requestedHeaders = init?.headers;
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: 'Negombo',
                country: 'Sri Lanka',
                latitude: 7.2083,
                longitude: 79.8358,
                timezone: 'Asia/Colombo',
              },
            ],
          }),
        } as unknown as Response;
      }) as any;

      const results = await searchLocations('  Negombo  ', 5, 'mock-jwt-token');

      assert.ok(requestedUrl.includes('/api/locations/search'));
      assert.ok(requestedUrl.includes('q=Negombo'));
      assert.ok(requestedUrl.includes('limit=5'));
      assert.strictEqual(requestedHeaders?.Authorization, 'Bearer mock-jwt-token');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Negombo');
    });

    it('throws descriptive error on API failure', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        json: async () => ({ error: 'Search rate limit exceeded' }),
      })) as any;

      await assert.rejects(
        async () => {
          await searchLocations('Colombo');
        },
        {
          name: 'Error',
          message: 'Search rate limit exceeded',
        }
      );
    });
  });

  describe('getCurrentWeather', () => {
    it('requests coordinates and returns normalized current weather', async () => {
      let requestedUrl = '';

      globalThis.fetch = (async (url: string) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () => ({
            location: {
              name: 'Kandy',
              coordinates: { latitude: 7.2906, longitude: 80.6337 },
              country: 'Sri Lanka',
              timezone: 'Asia/Colombo',
            },
            current: {
              temperatureCelsius: 24.2,
              feelsLikeCelsius: 25.1,
              humidityPercent: 82,
              windSpeedKmH: 8.5,
              windDirectionDegrees: 180,
              pressureHpa: 1014,
              cloudCoverPercent: 40,
              precipitationMm: 0,
              uvIndex: 6,
              conditionCode: 2,
              description: 'Partly cloudy',
              dayNight: 'day',
              isDay: true,
              timestamp: '2026-11-04T12:00:00Z',
              timezone: 'Asia/Colombo',
            },
          }),
        } as unknown as Response;
      }) as any;

      const data = await getCurrentWeather(7.2906, 80.6337, 'Kandy');

      assert.ok(requestedUrl.includes('lat=7.2906'));
      assert.ok(requestedUrl.includes('lon=80.6337'));
      assert.ok(requestedUrl.includes('name=Kandy'));
      assert.strictEqual(data.location.name, 'Kandy');
      assert.strictEqual(data.current.temperatureCelsius, 24.2);
    });
  });

  describe('getHourlyForecast', () => {
    it('requests coordinates and returns hourly forecasts array', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({
          location: { name: 'Galle', timezone: 'Asia/Colombo' },
          timezone: 'Asia/Colombo',
          hourly: [
            {
              timestamp: '2026-11-04T13:00',
              temperatureCelsius: 29.0,
              feelsLikeCelsius: 33.0,
              precipitationProbabilityPercent: 20,
            },
          ],
        }),
      })) as any;

      const data = await getHourlyForecast(6.0535, 80.221);
      assert.strictEqual(data.hourly.length, 1);
      assert.strictEqual(data.hourly[0].temperatureCelsius, 29.0);
    });
  });

  describe('getDailyForecast', () => {
    it('requests coordinates and returns daily forecasts array', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({
          location: { name: 'Jaffna', timezone: 'Asia/Colombo' },
          timezone: 'Asia/Colombo',
          daily: [
            {
              date: '2026-11-04',
              minTemperatureCelsius: 26.0,
              maxTemperatureCelsius: 32.0,
              uvIndexMax: 8.5,
            },
          ],
        }),
      })) as any;

      const data = await getDailyForecast(9.6615, 80.0255);
      assert.strictEqual(data.daily.length, 1);
      assert.strictEqual(data.daily[0].uvIndexMax, 8.5);
    });
  });

  describe('getWeatherData (Legacy 10-City Rankings)', () => {
    it('transforms legacy backend ranked format into frontend WeatherResult items', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({
          data: [
            {
              rank: 1,
              comfortIndex: 88,
              weatherData: {
                name: 'Nuwara Eliya',
                weather: [{ description: 'Pleasant' }],
                main: {
                  temp: 293.15, // 20 °C
                  feels_like: 293.15,
                  humidity: 60,
                },
                wind: { speed: 3.5 },
                rain: { '1h': 0 },
              },
            },
          ],
        }),
      })) as any;

      const results = await getWeatherData('token-123');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].rank, 1);
      assert.strictEqual(results[0].city, 'Nuwara Eliya');
      assert.strictEqual(results[0].temperature, 20);
      assert.strictEqual(results[0].comfortScore, 88);
    });
  });

  describe('getWeatherRecommendations', () => {
    it('requests coordinates and returns recommendations report', async () => {
      let requestedUrl = '';
      let requestedHeaders: any = null;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requestedUrl = url;
        requestedHeaders = init?.headers;
        return {
          ok: true,
          json: async () => ({
            location: {
              name: 'Colombo',
              coordinates: { latitude: 6.9271, longitude: 79.8612 },
              timezone: 'Asia/Colombo',
            },
            generatedAt: '2026-11-05T10:00:00Z',
            overallStatus: 'optimal',
            comfortScore: 85,
            activities: [
              {
                activity: 'Walking',
                suitability: 'excellent',
                reason: 'Pleasant temperatures and clear skies.',
                bestTimeWindow: '06:00 - 09:00',
              },
            ],
            clothing: [
              {
                category: 'light',
                title: 'Light & Breathable Clothing',
                isPrimary: true,
                reason: 'Warm weather conditions.',
                items: ['T-shirt', 'Shorts'],
              },
            ],
            dailyAdvice: ['Great day for outdoor walks.'],
            bestOutdoorWindow: {
              start: '2026-11-05T06:00',
              end: '2026-11-05T09:00',
              label: '06:00 - 09:00',
              comfortScore: 90,
              reason: 'Cool morning temperatures and low rain risk.',
            },
          }),
        } as unknown as Response;
      }) as any;

      const report = await getWeatherRecommendations(6.9271, 79.8612, 'Colombo', 'token-abc');

      assert.ok(requestedUrl.includes('/api/weather/recommendations'));
      assert.ok(requestedUrl.includes('lat=6.9271'));
      assert.ok(requestedUrl.includes('lon=79.8612'));
      assert.ok(requestedUrl.includes('name=Colombo'));
      assert.strictEqual(requestedHeaders?.Authorization, 'Bearer token-abc');
      assert.strictEqual(report.location.name, 'Colombo');
      assert.strictEqual(report.overallStatus, 'optimal');
      assert.strictEqual(report.activities.length, 1);
      assert.strictEqual(report.activities[0].activity, 'Walking');
      assert.strictEqual(report.activities[0].suitability, 'excellent');
      assert.strictEqual(report.clothing.length, 1);
      assert.strictEqual(report.bestOutdoorWindow?.label, '06:00 - 09:00');
    });

    it('throws error when recommendations API responds with non-ok status', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        json: async () => ({ error: 'Unable to evaluate weather conditions' }),
      })) as any;

      await assert.rejects(
        async () => {
          await getWeatherRecommendations(6.9271, 79.8612);
        },
        {
          name: 'Error',
          message: 'Unable to evaluate weather conditions',
        }
      );
    });
  });

  describe('evaluateWeatherAlerts', () => {
    it('sends POST request with rules and returns alert report', async () => {
      let requestedUrl = '';
      let requestedMethod = '';
      let requestedBody: any = null;
      let requestedHeaders: any = null;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requestedUrl = url;
        requestedMethod = init?.method || 'GET';
        requestedBody = init?.body ? JSON.parse(init.body as string) : null;
        requestedHeaders = init?.headers;

        return {
          ok: true,
          json: async () => ({
            evaluatedCount: 1,
            triggeredCount: 1,
            alerts: [
              {
                id: 'alert_1',
                ruleId: 'rule_1',
                type: 'temp_above',
                actualValue: 33.5,
                threshold: 30,
                message: 'Current temperature in Colombo is 33.5°C, exceeding your threshold of 30°C.',
                timestamp: '2026-11-05T12:00:00Z',
                locationName: 'Colombo',
                severity: 'warning',
              },
            ],
            disclaimer: 'MVP Notice: Alerts are evaluated when Weatherly is open and refreshing weather data.',
            evaluatedAt: '2026-11-05T12:00:00Z',
          }),
        } as unknown as Response;
      }) as any;

      const rules = [
        {
          id: 'rule_1',
          type: 'temp_above' as const,
          threshold: 30,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
          createdAt: '2026-11-05T10:00:00Z',
        },
      ];

      const report = await evaluateWeatherAlerts(
        rules,
        { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        'jwt-token-xyz'
      );

      assert.ok(requestedUrl.includes('/api/weather/alerts/evaluate'));
      assert.strictEqual(requestedMethod, 'POST');
      assert.strictEqual(requestedHeaders?.Authorization, 'Bearer jwt-token-xyz');
      assert.strictEqual(requestedHeaders?.['Content-Type'], 'application/json');
      assert.strictEqual(requestedBody.rules.length, 1);
      assert.strictEqual(report.triggeredCount, 1);
      assert.strictEqual(report.alerts[0].actualValue, 33.5);
    });

    it('throws descriptive error on evaluation API failure', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        json: async () => ({ error: 'Alert evaluation timed out' }),
      })) as any;

      await assert.rejects(
        async () => {
          await evaluateWeatherAlerts([]);
        },
        {
          name: 'Error',
          message: 'Alert evaluation timed out',
        }
      );
    });
  });

  describe('askWeatherAssistant', () => {
    it('sends question and location payload to /api/assistant/ask', async () => {
      let requestedUrl = '';
      let requestedMethod = '';
      let requestedBody: any = null;
      let requestedHeaders: any = null;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requestedUrl = url;
        requestedMethod = init?.method || 'GET';
        requestedBody = init?.body ? JSON.parse(init.body as string) : null;
        requestedHeaders = init?.headers;

        return {
          ok: true,
          json: async () => ({
            answer: 'For running in Colombo, conditions are currently rated GOOD.',
            provider: 'rules',
            weatherContext: {
              locationName: 'Colombo',
              temperatureCelsius: 28.0,
              feelsLikeCelsius: 32.0,
              conditionDescription: 'Clear',
              comfortScore: 75,
              overallStatus: 'favorable',
              bestOutdoorWindow: '6:00 AM – 8:00 AM',
              activeHazardsCount: 0,
            },
            suggestedFollowUps: ['What should I wear today?'],
          }),
        } as unknown as Response;
      }) as any;

      const response = await askWeatherAssistant(
        'Should I go running this evening?',
        { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        'auth-token-123'
      );

      assert.ok(requestedUrl.includes('/api/assistant/ask'));
      assert.strictEqual(requestedMethod, 'POST');
      assert.strictEqual(requestedHeaders?.Authorization, 'Bearer auth-token-123');
      assert.strictEqual(requestedHeaders?.['Content-Type'], 'application/json');
      assert.strictEqual(requestedBody.question, 'Should I go running this evening?');
      assert.strictEqual(requestedBody.location.latitude, 6.9271);
      assert.strictEqual(response.provider, 'rules');
      assert.ok(response.answer.includes('rated GOOD'));
      assert.strictEqual(response.weatherContext.temperatureCelsius, 28.0);
    });

    it('throws descriptive error on assistant API failure', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        json: async () => ({ error: 'Assistant service timed out' }),
      })) as any;

      await assert.rejects(
        async () => {
          await askWeatherAssistant('Will it rain?', { latitude: 6.9271, longitude: 79.8612 });
        },
        {
          name: 'Error',
          message: 'Assistant service timed out',
        }
      );
    });
  });
});
