import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { AlertRule } from '../types/weather-alert.types';
import type {
  AlertEvaluationRecord,
  IAlertRepository,
  PaginatedAlertResult,
} from './alert.repository.interface';

export interface DynamoDbAlertRepositoryConfig {
  tableName: string;
  gsiName?: string;
  region?: string;
  documentClient?: DynamoDBDocumentClient;
}

/**
 * DynamoDB Single-Table persistence adapter for AWS deployments.
 *
 * Single-Table Schema:
 * - Table Primary Key:
 *   - PK: USER#<userId>
 *   - SK: ALERT#<alertId> | EVAL#<alertId>#<eventPeriod>
 * - Sparse Global Secondary Index (GSI1):
 *   - GSI1PK: 'ALERT#ENABLED' (only indexed when alert.enabled === true)
 *   - GSI1SK: <locationKey>#<userId>#<alertId>
 *
 * Access Patterns:
 * 1. Query all alerts for a user: Query(PK = 'USER#<userId>', SK begins_with 'ALERT#')
 * 2. Get single alert: GetItem(PK = 'USER#<userId>', SK = 'ALERT#<alertId>')
 * 3. Create/update alert: PutItem with sparse GSI1 attributes
 * 4. Delete alert: DeleteItem(PK = 'USER#<userId>', SK = 'ALERT#<alertId>')
 * 5. Query enabled alerts across all users (Worker): Query(IndexName = GSI1, GSI1PK = 'ALERT#ENABLED')
 * 6. Deduplication check: GetItem(PK = 'USER#<userId>', SK = 'EVAL#<alertId>#<eventPeriod>')
 * 7. Save evaluation record: PutItem(PK = 'USER#<userId>', SK = 'EVAL#<alertId>#<eventPeriod>', ttl = 7 days)
 */
export class DynamoDbAlertRepository implements IAlertRepository {
  private readonly tableName: string;
  private readonly gsiName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(config: DynamoDbAlertRepositoryConfig) {
    this.tableName = config.tableName;
    this.gsiName = config.gsiName || 'GSI1';

    if (config.documentClient) {
      this.docClient = config.documentClient;
    } else {
      const ddbClient = new DynamoDBClient({
        region: config.region || process.env.AWS_REGION || 'us-east-1',
      });
      this.docClient = DynamoDBDocumentClient.from(ddbClient, {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      });
    }
  }

  private toDynamoItem(userId: string, alert: AlertRule): Record<string, any> {
    const item: Record<string, any> = {
      PK: `USER#${userId}`,
      SK: `ALERT#${alert.id}`,
      id: alert.id,
      userId,
      type: alert.type,
      threshold: alert.threshold !== undefined ? alert.threshold : null,
      enabled: alert.enabled,
      location: alert.location,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt || new Date().toISOString(),
      entityType: 'ALERT',
    };

    // Sparse index attribute: only include GSI keys when enabled
    if (alert.enabled) {
      item.GSI1PK = 'ALERT#ENABLED';
      const lat = alert.location?.latitude?.toFixed(2) ?? '0.00';
      const lon = alert.location?.longitude?.toFixed(2) ?? '0.00';
      item.GSI1SK = `${lat}:${lon}#${userId}#${alert.id}`;
    }

    return item;
  }

  private fromDynamoItem(item: Record<string, any>): AlertRule {
    return {
      id: item.id,
      userId: item.userId,
      type: item.type,
      threshold: item.threshold,
      enabled: Boolean(item.enabled),
      location: item.location,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async getAlertsByUserId(userId: string): Promise<AlertRule[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'ALERT#',
      },
    });

    const response = await this.docClient.send(command);
    if (!response.Items) {
      return [];
    }

    const alerts = response.Items.map((item) => this.fromDynamoItem(item));
    return alerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAlertById(userId: string, alertId: string): Promise<AlertRule | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `ALERT#${alertId}`,
      },
    });

    const response = await this.docClient.send(command);
    if (!response.Item || response.Item.userId !== userId) {
      return null;
    }

    return this.fromDynamoItem(response.Item);
  }

  async saveAlert(userId: string, alert: AlertRule): Promise<AlertRule> {
    const fullAlert: AlertRule = {
      ...alert,
      userId,
      createdAt: alert.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const item = this.toDynamoItem(userId, fullAlert);
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.docClient.send(command);
    return fullAlert;
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

    await this.saveAlert(userId, updated);
    return updated;
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const existing = await this.getAlertById(userId, alertId);
    if (!existing) {
      return false;
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `ALERT#${alertId}`,
      },
    });

    await this.docClient.send(command);
    return true;
  }

  async getEnabledAlerts(limit: number = 100, cursor?: string): Promise<PaginatedAlertResult> {
    let exclusiveStartKey: Record<string, any> | undefined;
    if (cursor) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      } catch {
        // invalid cursor treated as beginning
      }
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: this.gsiName,
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'ALERT#ENABLED',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const response = await this.docClient.send(command);
    const items = (response.Items || []).map((item) => this.fromDynamoItem(item));

    let nextCursor: string | undefined;
    if (response.LastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
    }

    return {
      items,
      nextCursor,
    };
  }

  async hasEvaluationRecord(
    userId: string,
    alertId: string,
    eventPeriod: string
  ): Promise<boolean> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `EVAL#${alertId}#${eventPeriod}`,
      },
    });

    const response = await this.docClient.send(command);
    return Boolean(response.Item);
  }

  async saveEvaluationRecord(record: AlertEvaluationRecord): Promise<void> {
    const ttl =
      record.ttl || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days retention

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `USER#${record.userId}`,
        SK: `EVAL#${record.alertId}#${record.eventPeriod}`,
        id: record.id,
        userId: record.userId,
        alertId: record.alertId,
        type: record.type,
        actualValue: record.actualValue,
        threshold: record.threshold !== undefined ? record.threshold : null,
        message: record.message,
        forecastTimestamp: record.forecastTimestamp,
        triggeredAt: record.triggeredAt,
        ttl,
        entityType: 'EVALUATION',
      },
    });

    await this.docClient.send(command);
  }
}
