import type { AlertRule } from '../types/weather-alert.types';
import type {
  AlertEvaluationRecord,
  IAlertRepository,
  PaginatedAlertResult,
} from './alert.repository.interface';

/**
 * In-Memory persistence adapter for local development, fallback, and automated unit testing.
 *
 * Implements strict user isolation and identical semantics to the DynamoDB adapter.
 */
export class InMemoryAlertRepository implements IAlertRepository {
  private alerts = new Map<string, AlertRule>();
  private evaluations = new Map<string, AlertEvaluationRecord>();

  private buildAlertKey(userId: string, alertId: string): string {
    return `${userId}#${alertId}`;
  }

  private buildEvalKey(userId: string, alertId: string, eventPeriod: string): string {
    return `${userId}#${alertId}#${eventPeriod}`;
  }

  async getAlertsByUserId(userId: string): Promise<AlertRule[]> {
    const userAlerts: AlertRule[] = [];
    for (const [key, alert] of this.alerts.entries()) {
      if (key.startsWith(`${userId}#`) && alert.userId === userId) {
        userAlerts.push({ ...alert });
      }
    }
    return userAlerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAlertById(userId: string, alertId: string): Promise<AlertRule | null> {
    const key = this.buildAlertKey(userId, alertId);
    const item = this.alerts.get(key);
    if (!item || item.userId !== userId) {
      return null;
    }
    return { ...item };
  }

  async saveAlert(userId: string, alert: AlertRule): Promise<AlertRule> {
    const fullAlert: AlertRule = {
      ...alert,
      userId,
      createdAt: alert.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const key = this.buildAlertKey(userId, fullAlert.id);
    this.alerts.set(key, fullAlert);
    return { ...fullAlert };
  }

  async updateAlert(
    userId: string,
    alertId: string,
    updates: Partial<Omit<AlertRule, 'id' | 'userId' | 'createdAt'>>
  ): Promise<AlertRule | null> {
    const existing = await this.getAlertById(userId, alertId);
    if (!existing) {
      return null;
    }
    const updated: AlertRule = {
      ...existing,
      ...updates,
      id: existing.id,
      userId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const key = this.buildAlertKey(userId, alertId);
    this.alerts.set(key, updated);
    return { ...updated };
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const key = this.buildAlertKey(userId, alertId);
    const existing = this.alerts.get(key);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    return this.alerts.delete(key);
  }

  async getEnabledAlerts(limit: number = 100, cursor?: string): Promise<PaginatedAlertResult> {
    const allEnabled: AlertRule[] = [];
    for (const alert of this.alerts.values()) {
      if (alert.enabled) {
        allEnabled.push({ ...alert });
      }
    }

    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const pageItems = allEnabled.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    const nextCursor = nextIndex < allEnabled.length ? nextIndex.toString() : undefined;

    return {
      items: pageItems,
      nextCursor,
    };
  }

  async hasEvaluationRecord(
    userId: string,
    alertId: string,
    eventPeriod: string
  ): Promise<boolean> {
    const key = this.buildEvalKey(userId, alertId, eventPeriod);
    return this.evaluations.has(key);
  }

  async saveEvaluationRecord(record: AlertEvaluationRecord): Promise<void> {
    const key = this.buildEvalKey(record.userId, record.alertId, record.eventPeriod);
    this.evaluations.set(key, { ...record });
  }

  /**
   * Helper method for testing: clears all stored alerts and evaluations.
   */
  clear(): void {
    this.alerts.clear();
    this.evaluations.clear();
  }
}
