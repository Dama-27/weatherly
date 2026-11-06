import { describe, it, expect, vi } from 'vitest';
import { logger, sanitizeData } from './logger';

describe('Structured Logger & Sanitizer', () => {
  describe('sanitizeData', () => {
    it('redacts raw JWT token strings', () => {
      const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak_signature';
      expect(sanitizeData(mockJwt)).toBe('[REDACTED_JWT]');
    });

    it('redacts Bearer authorization header values', () => {
      expect(sanitizeData('Bearer some-secret-token-xyz')).toBe('Bearer [REDACTED]');
    });

    it('redacts sensitive object keys recursively', () => {
      const sensitiveObj = {
        city: 'Colombo',
        temperature: 28,
        apiKey: 'gemini-secret-key-12345',
        authorization: 'Bearer token-123',
        userPassword: 'plaintext-password',
        nested: {
          sessionToken: 'xyz-token',
          safeProperty: 'safe-value',
        },
      };

      const sanitized = sanitizeData(sensitiveObj);

      expect(sanitized.city).toBe('Colombo');
      expect(sanitized.temperature).toBe(28);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.userPassword).toBe('[REDACTED]');
      expect(sanitized.nested.sessionToken).toBe('[REDACTED]');
      expect(sanitized.nested.safeProperty).toBe('safe-value');
    });

    it('preserves non-sensitive arrays and primitive types', () => {
      expect(sanitizeData(42)).toBe(42);
      expect(sanitizeData(true)).toBe(true);
      expect(sanitizeData(null)).toBe(null);
      expect(sanitizeData(['apple', 'banana'])).toEqual(['apple', 'banana']);
    });
  });

  describe('Logger JSON formatting', () => {
    it('outputs valid single-line JSON log entry with expected fields', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info({
        service: 'weatherly-api',
        operation: 'GET /api/weather/current',
        correlationId: 'test-corr-id-123',
        requestId: 'aws-req-id-456',
        durationMs: 45,
        status: 'success',
        statusCode: 200,
        metadata: { location: 'Negombo' },
      });

      expect(spy).toHaveBeenCalledOnce();
      const rawLog = spy.mock.calls[0][0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.level).toBe('INFO');
      expect(parsed.service).toBe('weatherly-api');
      expect(parsed.operation).toBe('GET /api/weather/current');
      expect(parsed.correlationId).toBe('test-corr-id-123');
      expect(parsed.requestId).toBe('aws-req-id-456');
      expect(parsed.durationMs).toBe(45);
      expect(parsed.status).toBe('success');
      expect(parsed.statusCode).toBe(200);
      expect(parsed.metadata.location).toBe('Negombo');
      expect(typeof parsed.timestamp).toBe('string');

      spy.mockRestore();
    });

    it('outputs structured JSON error with category and message', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error({
        service: 'weatherly-api',
        operation: 'POST /api/weather/alerts/evaluate',
        correlationId: 'err-corr-id',
        status: 'error',
        statusCode: 504,
        errorCategory: 'UpstreamTimeout',
        errorMessage: 'Open-Meteo gateway timeout',
      });

      expect(spy).toHaveBeenCalledOnce();
      const parsed = JSON.parse(spy.mock.calls[0][0]);

      expect(parsed.level).toBe('ERROR');
      expect(parsed.status).toBe('error');
      expect(parsed.statusCode).toBe(504);
      expect(parsed.errorCategory).toBe('UpstreamTimeout');
      expect(parsed.errorMessage).toBe('Open-Meteo gateway timeout');

      spy.mockRestore();
    });
  });
});
