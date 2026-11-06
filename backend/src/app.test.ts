import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app, { createApp } from './app';
import { env } from './config/env';

describe('Express Application Initialization & Shared Architecture', () => {
  it('creates an Express application instance using createApp() factory', () => {
    const customApp = createApp();
    expect(customApp).toBeDefined();
    expect(typeof customApp.use).toBe('function');
    expect(typeof customApp.listen).toBe('function');
  });

  it('exports a pre-configured default application singleton', () => {
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
  });

  describe('Health Route (GET /health)', () => {
    it('returns 200 with status ok and environment metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.environment).toBe(env.nodeEnv);
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('CORS and Preflight Handling', () => {
    it('handles OPTIONS preflight requests for configured frontend origin', async () => {
      const res = await request(app)
        .options('/api/weather/current')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('allows requests without an Origin header (server-to-server / curl)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('allows CloudFront distribution origins', async () => {
      const res = await request(app)
        .options('/health')
        .set('Origin', 'https://d111111abcdef8.cloudfront.net')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(
        'https://d111111abcdef8.cloudfront.net'
      );
    });

    it('rejects disallowed origins with 403 Forbidden in production mode', async () => {
      const prodApp = createApp({ corsOrigin: 'https://weatherly.example.com' });
      // In production, origins not matching produce an error caught by error middleware
      const originalNodeEnv = env.nodeEnv;
      (env as any).nodeEnv = 'production';

      try {
        const res = await request(prodApp)
          .get('/health')
          .set('Origin', 'https://malicious-attacker.com');

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');
        expect(res.body.message).toContain('not allowed by CORS');
      } finally {
        (env as any).nodeEnv = originalNodeEnv;
      }
    });
  });

  describe('Authentication Middleware (Auth0 RS256 Verification)', () => {
    it('returns 401 when Authorization header is missing on protected route', async () => {
      const res = await request(app).get('/api/cache/status');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.message).toContain('Missing or malformed Authorization header');
    });

    it('returns 401 when Authorization header does not use Bearer scheme', async () => {
      const res = await request(app)
        .get('/api/cache/status')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.message).toContain('Missing or malformed Authorization header');
    });

    it('returns 401 when Bearer token is invalid or unverified', async () => {
      const res = await request(app)
        .get('/api/cache/status')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('allows authenticated requests with valid mock token in test mode', async () => {
      const res = await request(app)
        .get('/api/cache/status')
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cache');
      expect(res.body.cache).toHaveProperty('hits');
      expect(res.body.cache).toHaveProperty('misses');
    });

    it('does not log or leak tokens in responses', async () => {
      const secretToken = 'super-secret-test-token-12345';
      const res = await request(app)
        .get('/api/cache/status')
        .set('Authorization', `Bearer ${secretToken}`);

      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain(secretToken);
    });
  });

  describe('Centralized Error and 404 Handling', () => {
    it('returns JSON 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/non-existent-route-404');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NotFound');
      expect(res.body.message).toContain('not found');
    });

    it('formats unhandled exceptions into structured JSON 500 error responses', async () => {
      const testApp = createApp({
        configureBeforeErrorHandlers: (subApp) => {
          subApp.get('/api/test-crash', () => {
            throw new Error('Simulated internal failure');
          });
        },
      });

      const res = await request(testApp).get('/api/test-crash');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error');
      expect(res.body.message).toBe('Simulated internal failure');
    });
  });
});
