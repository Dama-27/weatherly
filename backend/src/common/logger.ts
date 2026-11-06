import { randomUUID } from 'crypto';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type ErrorCategory =
  | 'ValidationError'
  | 'AuthenticationError'
  | 'AuthorizationError'
  | 'NotFoundError'
  | 'RateLimitError'
  | 'UpstreamTimeout'
  | 'UpstreamHttpError'
  | 'StorageError'
  | 'InternalError';

export interface StructuredLogPayload {
  timestamp?: string;
  level?: LogLevel;
  service: string;
  correlationId?: string;
  requestId?: string;
  operation: string;
  durationMs?: number;
  status?: 'success' | 'error' | 'warn' | 'info';
  statusCode?: number;
  errorCategory?: ErrorCategory | string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

const SENSITIVE_KEY_PATTERNS = [
  /auth/i,
  /token/i,
  /secret/i,
  /password/i,
  /cookie/i,
  /key/i,
  /credential/i,
  /bearer/i,
];

/**
 * Recursively redacts sensitive fields (passwords, tokens, authorization headers, keys)
 * from objects and queries before serialization into CloudWatch logs.
 */
export function sanitizeData(data: any, depth = 0): any {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact JWT-like strings: eyJ...
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return '[REDACTED_JWT]';
    }
    // Redact Bearer tokens
    if (/^Bearer\s+/i.test(data)) {
      return 'Bearer [REDACTED]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(val, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Standard CloudWatch JSON Structured Logger.
 * Emits uniform, machine-readable JSON logs consumable by CloudWatch Logs Insights,
 * Datadog, or Elasticsearch without risking sensitive credential leaks.
 */
class Logger {
  private formatLog(
    level: LogLevel,
    payload: Omit<StructuredLogPayload, 'level' | 'timestamp'>
  ): string {
    const entry: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      service: payload.service || 'weatherly-backend',
      correlationId: payload.correlationId,
      requestId: payload.requestId,
      operation: payload.operation,
      durationMs: payload.durationMs,
      status: payload.status || (level === 'ERROR' ? 'error' : 'success'),
      statusCode: payload.statusCode,
      errorCategory: payload.errorCategory,
      errorMessage: payload.errorMessage,
      metadata: payload.metadata ? sanitizeData(payload.metadata) : undefined,
    };

    return JSON.stringify(entry);
  }

  info(payload: Omit<StructuredLogPayload, 'level' | 'timestamp'>): void {
    console.log(this.formatLog('INFO', payload));
  }

  warn(payload: Omit<StructuredLogPayload, 'level' | 'timestamp'>): void {
    console.warn(this.formatLog('WARN', payload));
  }

  error(payload: Omit<StructuredLogPayload, 'level' | 'timestamp'>): void {
    console.error(this.formatLog('ERROR', payload));
  }

  debug(payload: Omit<StructuredLogPayload, 'level' | 'timestamp'>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatLog('DEBUG', payload));
    }
  }

  /**
   * Generates a unique correlation ID if one was not provided in request headers.
   */
  generateCorrelationId(): string {
    return randomUUID();
  }
}

export const logger = new Logger();
