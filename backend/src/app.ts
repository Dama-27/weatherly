import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import weatherRouter from './routes/weather.routes';
import locationRouter from './routes/location.routes';
import cacheRouter from './routes/cache.router';
import assistantRouter from './routes/assistant.routes';

export interface AppOptions {
  corsOrigin?: string | string[] | boolean;
  configureBeforeErrorHandlers?: (app: Application) => void;
}

/**
 * Creates and configures an Express application instance.
 *
 * Separating application initialization from the HTTP listener allows:
 * 1. Reusable initialization for both local HTTP server and AWS Lambda execution.
 * 2. Shared middleware, routes, validation, and error handling across environments.
 * 3. Isolated test execution with custom configuration options.
 */
export function createApp(options?: AppOptions): Application {
  const app = express();

  // Configure CORS
  const configuredOrigin = options?.corsOrigin ?? env.frontendOrigin;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, unit tests)
        if (!origin) {
          return callback(null, true);
        }

        // Wildcard or explicit true override
        if (configuredOrigin === true || configuredOrigin === '*' || env.frontendOrigin === '*') {
          return callback(null, true);
        }

        // Exact match with configured frontend origin
        if (origin === configuredOrigin || origin === env.frontendOrigin) {
          return callback(null, true);
        }

        // Support array of allowed origins
        if (Array.isArray(configuredOrigin) && configuredOrigin.includes(origin)) {
          return callback(null, true);
        }

        // Allow localhost origins in development and test environments
        if (env.nodeEnv !== 'production') {
          if (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')
          ) {
            return callback(null, true);
          }
        }

        // Allow future AWS CloudFront distributions
        if (origin.endsWith('.cloudfront.net')) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      credentials: true,
      maxAge: 86400,
    })
  );

  // Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health check endpoint (used by AWS ALB, Lambda Function URL, or container health probes)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    });
  });

  // Mount API routers
  app.use('/api', weatherRouter);
  app.use('/api', locationRouter);
  app.use('/api', cacheRouter);
  app.use('/api', assistantRouter);

  // Hook for testing custom route behavior before 404/error middleware
  if (options?.configureBeforeErrorHandlers) {
    options.configureBeforeErrorHandlers(app);
  }

  // 404 Handler for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NotFound',
      message: 'The requested resource was not found.',
    });
  });

  // Centralized Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    // Auth0 / JWT Unauthorized error
    if (err.name === 'UnauthorizedError' || err.status === 401 || err.statusCode === 401) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Authentication required or token invalid',
      });
    }

    // CORS rejection error
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: err.message,
      });
    }

    const statusCode =
      typeof err.statusCode === 'number'
        ? err.statusCode
        : typeof err.status === 'number'
        ? err.status
        : 500;

    res.status(statusCode).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
    });
  });

  return app;
}

// Default pre-initialized singleton instance for local server and Lambda adapter
const app = createApp();
export default app;
