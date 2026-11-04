import { beforeEach, describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { getCachedStatus, handleClearCache } from './cache.controller';
import { clearCache, setCached } from '../services/cache.service';

function createMockReqRes() {
  const req = {} as Request;
  let statusCode = 200;
  let responseBody: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getBody: () => responseBody,
  };
}

describe('Cache Controller', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('GET /api/cache/status', () => {
    it('returns cache statistics including keys count, hits, and misses', () => {
      setCached('test:key1', { value: 123 }, 60);
      setCached('test:key2', { value: 456 }, 60);

      const { req, res, getStatusCode, getBody } = createMockReqRes();
      getCachedStatus(req, res);

      expect(getStatusCode()).toBe(200);
      const body = getBody();
      expect(body).toHaveProperty('cache');
      expect(body.cache.keys).toHaveLength(2);
      expect(body.cache.keys).toContain('test:key1');
      expect(body.cache.keys).toContain('test:key2');
      expect(body.cache).toHaveProperty('hits');
      expect(body.cache).toHaveProperty('misses');
    });
  });

  describe('DELETE /api/cache', () => {
    it('clears all cached entries and returns a success message', () => {
      setCached('test:key1', { value: 123 }, 60);
      setCached('test:key2', { value: 456 }, 60);

      const { req, res, getStatusCode, getBody } = createMockReqRes();
      handleClearCache(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getBody().message).toBe('Cache cleared successfully');

      // Verify cache is now empty
      const statusReqRes = createMockReqRes();
      getCachedStatus(statusReqRes.req, statusReqRes.res);
      expect(statusReqRes.getBody().cache.keys).toHaveLength(0);
    });
  });
});
