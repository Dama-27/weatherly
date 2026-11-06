import type { Request, Response, NextFunction } from 'express';
import { logger, sanitizeData, type ErrorCategory } from '../common/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      lambdaRequestId?: string;
    }
  }
}

/**
 * Maps standard HTTP status codes to CloudWatch operational error categories.
 */
function resolveErrorCategory(statusCode: number): ErrorCategory {
  if (statusCode === 400) return 'ValidationError';
  if (statusCode === 401) return 'AuthenticationError';
  if (statusCode === 403) return 'AuthorizationError';
  if (statusCode === 404) return 'NotFoundError';
  if (statusCode === 429) return 'RateLimitError';
  if (statusCode === 502) return 'UpstreamHttpError';
  if (statusCode === 504) return 'UpstreamTimeout';
  return 'InternalError';
}

/**
 * Express middleware for CloudWatch structured request logging.
 *
 * Capabilities:
 * - Generates or propagates X-Correlation-Id across services.
 * - Extracts AWS Lambda Request ID from API Gateway / Lambda Function URL headers.
 * - Measures precise request duration in milliseconds.
 * - Emits a single, structured JSON log on response completion.
 * - Redacts sensitive headers (authorization, cookies) and query parameters.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Extract or generate correlation ID
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    logger.generateCorrelationId();

  // Extract Lambda Request ID forwarded by AWS Lambda runtime or API Gateway
  const lambdaRequestId =
    (req.headers['x-amzn-requestid'] as string) ||
    (req.headers['x-amzn-trace-id'] as string) ||
    undefined;

  req.correlationId = correlationId;
  req.lambdaRequestId = lambdaRequestId;

  res.setHeader('X-Correlation-Id', correlationId);

  // Skip noisy automated health check probing from CloudWatch logs in production
  const isHealthCheck = req.path === '/health';

  res.on('finish', () => {
    if (isHealthCheck && res.statusCode === 200) {
      return;
    }

    const durationMs = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    const errorCategory = isError ? resolveErrorCategory(res.statusCode) : undefined;

    const logPayload = {
      service: 'weatherly-api',
      correlationId,
      requestId: lambdaRequestId,
      operation: `${req.method} ${req.baseUrl || ''}${req.path}`,
      durationMs,
      status: isError ? ('error' as const) : ('success' as const),
      statusCode: res.statusCode,
      errorCategory,
      metadata: {
        method: req.method,
        path: req.path,
        query: sanitizeData(req.query),
        userAgent: req.get('user-agent'),
      },
    };

    if (isError) {
      logger.error(logPayload);
    } else {
      logger.info(logPayload);
    }
  });

  next();
}
