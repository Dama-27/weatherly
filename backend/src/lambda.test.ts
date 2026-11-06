import { describe, expect, it } from 'vitest';
import type { Context } from 'aws-lambda';
import { handler } from './lambda';

function createMockLambdaContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'weatherly-backend-api',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:weatherly-backend-api',
    memoryLimitInMB: '256',
    awsRequestId: 'test-aws-req-98765',
    logGroupName: '/aws/lambda/weatherly-backend-api',
    logStreamName: '2026/11/06/[$LATEST]abc123def456',
    getRemainingTimeInMillis: () => 5000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

describe('AWS Lambda Adapter Entry Point (lambda.ts)', () => {
  it('disables callbackWaitsForEmptyEventLoop to prevent Lambda event loop hangs', async () => {
    const context = createMockLambdaContext();
    const event = {
      version: '2.0',
      routeKey: 'GET /health',
      rawPath: '/health',
      rawQueryString: '',
      headers: { host: 'api.weatherly.local' },
      requestContext: {
        http: {
          method: 'GET',
          path: '/health',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'vitest-test-runner',
        },
      },
      isBase64Encoded: false,
    };

    expect(context.callbackWaitsForEmptyEventLoop).toBe(true);
    await handler(event as any, context, () => {});
    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
  });

  describe('API Gateway HTTP API (Payload Format v2.0)', () => {
    it('successfully processes GET /health and returns 200 JSON payload', async () => {
      const context = createMockLambdaContext();
      const event = {
        version: '2.0',
        routeKey: 'GET /health',
        rawPath: '/health',
        rawQueryString: '',
        headers: {
          host: 'weatherly.lambda-url.us-east-1.on.aws',
          accept: 'application/json',
        },
        requestContext: {
          http: {
            method: 'GET',
            path: '/health',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'curl/8.0.1',
          },
        },
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('environment');
    });

    it('handles CORS OPTIONS preflight through Lambda adapter returning 204', async () => {
      const context = createMockLambdaContext();
      const event = {
        version: '2.0',
        routeKey: 'OPTIONS /health',
        rawPath: '/health',
        rawQueryString: '',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization,content-type',
        },
        requestContext: {
          http: {
            method: 'OPTIONS',
            path: '/health',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
          },
        },
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result).toBeDefined();
      expect(result.statusCode).toBe(204);
      expect(result.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(result.headers['access-control-allow-methods']).toContain('GET');
    });

    it('parses JSON request body in POST /api/weather/alerts/evaluate', async () => {
      const context = createMockLambdaContext();
      const requestPayload = {
        rules: [],
      };

      const event = {
        version: '2.0',
        routeKey: 'POST /api/weather/alerts/evaluate',
        rawPath: '/api/weather/alerts/evaluate',
        rawQueryString: '',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/weather/alerts/evaluate',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-runner',
          },
        },
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('alerts');
      expect(Array.isArray(body.alerts)).toBe(true);
      expect(body.evaluatedCount).toBe(0);
    });

    it('handles JSON validation errors through Lambda adapter returning 400', async () => {
      const context = createMockLambdaContext();
      const event = {
        version: '2.0',
        routeKey: 'POST /api/assistant/ask',
        rawPath: '/api/assistant/ask',
        rawQueryString: '',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ question: '' }),
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/assistant/ask',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-runner',
          },
        },
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Question cannot be empty');
    });

    it('handles query parameters and returns 404 for unknown routes', async () => {
      const context = createMockLambdaContext();
      const event = {
        version: '2.0',
        routeKey: 'GET /api/unknown-endpoint',
        rawPath: '/api/unknown-endpoint',
        rawQueryString: 'foo=bar',
        headers: { accept: 'application/json' },
        queryStringParameters: { foo: 'bar' },
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/unknown-endpoint',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-runner',
          },
        },
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('NotFound');
    });
  });

  describe('API Gateway REST API (Payload Format v1.0)', () => {
    it('successfully processes legacy v1 GET /health event format', async () => {
      const context = createMockLambdaContext();
      const event = {
        httpMethod: 'GET',
        path: '/health',
        headers: {
          Host: 'api.weatherly.local',
          Accept: 'application/json',
        },
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api-id',
          protocol: 'HTTP/1.1',
          httpMethod: 'GET',
          path: '/health',
          stage: 'prod',
          requestId: 'req-v1-test-12345',
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'aws-sdk-nodejs',
          },
        },
        body: null,
        isBase64Encoded: false,
      };

      const result: any = await handler(event as any, context, () => {});
      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.status).toBe('ok');
    });
  });
});
