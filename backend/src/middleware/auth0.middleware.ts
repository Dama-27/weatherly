import type { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import { env } from '../config/env';

/**
 * Configure Auth0 RS256 JWT verifier if domain and audience are defined.
 * If credentials are not set (e.g. initial setup or test mode), defaults to null
 * and returns a clear 401 response on protected endpoint access.
 */
const auth0JwtValidator =
  env.auth0Domain && env.auth0Audience
    ? auth({
        issuerBaseURL: `https://${env.auth0Domain}`,
        audience: env.auth0Audience,
      })
    : null;

/**
 * Authentication middleware that verifies JWT access tokens on protected endpoints.
 *
 * Security & Architecture Principles:
 * - Verification happens on the backend: Clients cannot bypass security by omitting headers.
 * - Token Privacy: Tokens and Authorization headers are NEVER logged in logs or error traces.
 * - Identity Abstraction: Designed to support future AWS Cognito User Pool verification
 *   by abstracting the token validator.
 */
export const validateAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header with Bearer token',
    });
    return;
  }

  // In test environments, allow controlled mock token verification without internet dependency on Auth0
  if (env.nodeEnv === 'test') {
    const token = authHeader.slice(7).trim();
    if (token === 'mock-valid-jwt-token') {
      (req as any).auth = {
        sub: 'auth0|test-user-123',
        scope: 'read:weather',
      };
      return next();
    }
  }

  if (!auth0JwtValidator) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication provider is not configured or token could not be verified',
    });
    return;
  }

  // Invoke Auth0 JWT bearer verification
  auth0JwtValidator(req, res, (err) => {
    if (err) {
      // Pass error to centralized error handler without logging the token
      return next(err);
    }
    next();
  });
};
