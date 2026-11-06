import type { AlertRule } from '../types/weather-alert.types';

/**
 * Record representing an alert evaluation event saved for audit and duplicate suppression.
 */
export interface AlertEvaluationRecord {
  id: string;
  userId: string;
  alertId: string;
  type: string;
  actualValue: number | string;
  threshold?: number | null;
  message: string;
  forecastTimestamp: string;
  triggeredAt: string;
  eventPeriod: string;
  ttl?: number;
}

/**
 * Paginated query result for bulk operations such as the scheduled alert worker.
 */
export interface PaginatedAlertResult {
  items: AlertRule[];
  nextCursor?: string;
}

/**
 * Abstract repository interface for weather alert persistence.
 *
 * Decouples business logic and scheduled workers from the concrete storage engine
 * (DynamoDB in AWS vs. In-Memory storage for local development & unit testing).
 */
export interface IAlertRepository {
  /**
   * Retrieves all alerts configured for a specific authenticated user.
   */
  getAlertsByUserId(userId: string): Promise<AlertRule[]>;

  /**
   * Retrieves a single alert by ID, strictly enforcing user ownership.
   */
  getAlertById(userId: string, alertId: string): Promise<AlertRule | null>;

  /**
   * Persists or updates an alert rule for a specific user.
   */
  saveAlert(userId: string, alert: AlertRule): Promise<AlertRule>;

  /**
   * Partially updates an existing alert rule for a user.
   */
  updateAlert(
    userId: string,
    alertId: string,
    updates: Partial<Omit<AlertRule, 'id' | 'userId' | 'createdAt'>>
  ): Promise<AlertRule | null>;

  /**
   * Deletes an alert rule by ID, strictly enforcing user ownership.
   */
  deleteAlert(userId: string, alertId: string): Promise<boolean>;

  /**
   * Retrieves enabled alerts across all users for scheduled evaluation.
   * Utilizes sparse secondary index in DynamoDB to avoid table scans.
   */
  getEnabledAlerts(limit?: number, cursor?: string): Promise<PaginatedAlertResult>;

  /**
   * Checks whether an alert event has already been recorded for a specific period (deduplication).
   */
  hasEvaluationRecord(userId: string, alertId: string, eventPeriod: string): Promise<boolean>;

  /**
   * Persists an evaluation record to prevent duplicate triggers.
   */
  saveEvaluationRecord(record: AlertEvaluationRecord): Promise<void>;
}
