import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { InMemoryAlertRepository } from './in-memory-alert.repository';
import { DynamoDbAlertRepository } from './dynamodb-alert.repository';
import type { AlertRule } from '../types/weather-alert.types';

describe('Alert Repositories (In-Memory & DynamoDB)', () => {
  const sampleRule1: AlertRule = {
    id: 'rule-101',
    userId: 'user-alpha',
    type: 'temp_above',
    threshold: 30,
    enabled: true,
    location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
    createdAt: '2026-11-06T10:00:00.000Z',
  };

  const sampleRule2: AlertRule = {
    id: 'rule-102',
    userId: 'user-alpha',
    type: 'rain_prob_above',
    threshold: 70,
    enabled: false,
    location: { latitude: 7.21, longitude: 79.84, name: 'Negombo' },
    createdAt: '2026-11-06T11:00:00.000Z',
  };

  const otherUserRule: AlertRule = {
    id: 'rule-999',
    userId: 'user-beta',
    type: 'wind_speed_above',
    threshold: 40,
    enabled: true,
    location: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
    createdAt: '2026-11-06T09:00:00.000Z',
  };

  describe('InMemoryAlertRepository', () => {
    let repo: InMemoryAlertRepository;

    beforeEach(() => {
      repo = new InMemoryAlertRepository();
    });

    it('saves and retrieves alerts with strict user isolation', async () => {
      await repo.saveAlert('user-alpha', sampleRule1);
      await repo.saveAlert('user-alpha', sampleRule2);
      await repo.saveAlert('user-beta', otherUserRule);

      const alphaAlerts = await repo.getAlertsByUserId('user-alpha');
      expect(alphaAlerts.length).toBe(2);
      expect(alphaAlerts.map((a) => a.id)).toContain('rule-101');
      expect(alphaAlerts.map((a) => a.id)).toContain('rule-102');

      const betaAlerts = await repo.getAlertsByUserId('user-beta');
      expect(betaAlerts.length).toBe(1);
      expect(betaAlerts[0].id).toBe('rule-999');

      // User Alpha cannot retrieve User Beta's alert by ID
      const notFoundForAlpha = await repo.getAlertById('user-alpha', 'rule-999');
      expect(notFoundForAlpha).toBeNull();
    });

    it('updates an alert partially while preserving immutable fields', async () => {
      await repo.saveAlert('user-alpha', sampleRule1);

      const updated = await repo.updateAlert('user-alpha', 'rule-101', {
        threshold: 35,
        enabled: false,
      });

      expect(updated).not.toBeNull();
      expect(updated?.threshold).toBe(35);
      expect(updated?.enabled).toBe(false);
      expect(updated?.createdAt).toBe(sampleRule1.createdAt);
      expect(updated?.updatedAt).toBeDefined();

      const retrieved = await repo.getAlertById('user-alpha', 'rule-101');
      expect(retrieved?.threshold).toBe(35);
      expect(retrieved?.enabled).toBe(false);
    });

    it('returns null when updating non-existent alert or alert belonging to another user', async () => {
      await repo.saveAlert('user-beta', otherUserRule);

      const res = await repo.updateAlert('user-alpha', 'rule-999', { threshold: 50 });
      expect(res).toBeNull();
    });

    it('deletes an alert rule belonging to user', async () => {
      await repo.saveAlert('user-alpha', sampleRule1);

      const deleted = await repo.deleteAlert('user-alpha', 'rule-101');
      expect(deleted).toBe(true);

      const retrieved = await repo.getAlertById('user-alpha', 'rule-101');
      expect(retrieved).toBeNull();

      // Deleting again returns false
      const secondDelete = await repo.deleteAlert('user-alpha', 'rule-101');
      expect(secondDelete).toBe(false);
    });

    it('returns only enabled alerts across all users with cursor pagination', async () => {
      await repo.saveAlert('user-alpha', sampleRule1); // enabled
      await repo.saveAlert('user-alpha', sampleRule2); // disabled
      await repo.saveAlert('user-beta', otherUserRule); // enabled

      const page1 = await repo.getEnabledAlerts(1);
      expect(page1.items.length).toBe(1);
      expect(page1.nextCursor).toBe('1');

      const page2 = await repo.getEnabledAlerts(1, page1.nextCursor);
      expect(page2.items.length).toBe(1);
      expect(page2.nextCursor).toBeUndefined();

      const allEnabled = [...page1.items, ...page2.items];
      expect(allEnabled.map((a) => a.id)).toEqual(['rule-101', 'rule-999']);
    });

    it('persists and verifies evaluation records for duplicate suppression', async () => {
      const isAlreadyEvaluated = await repo.hasEvaluationRecord(
        'user-alpha',
        'rule-101',
        '2026-11-06T12:00:00Z'
      );
      expect(isAlreadyEvaluated).toBe(false);

      await repo.saveEvaluationRecord({
        id: 'eval-1',
        userId: 'user-alpha',
        alertId: 'rule-101',
        type: 'temp_above',
        actualValue: 33,
        threshold: 30,
        message: 'Temp exceeded threshold',
        forecastTimestamp: '2026-11-06T12:00:00Z',
        triggeredAt: '2026-11-06T11:55:00Z',
        eventPeriod: '2026-11-06T12:00:00Z',
      });

      const hasRecordNow = await repo.hasEvaluationRecord(
        'user-alpha',
        'rule-101',
        '2026-11-06T12:00:00Z'
      );
      expect(hasRecordNow).toBe(true);

      // Different period should return false
      const otherPeriod = await repo.hasEvaluationRecord(
        'user-alpha',
        'rule-101',
        '2026-11-06T13:00:00Z'
      );
      expect(otherPeriod).toBe(false);
    });
  });

  describe('DynamoDbAlertRepository', () => {
    let ddbMock: ReturnType<typeof mockClient>;
    let repo: DynamoDbAlertRepository;

    beforeEach(() => {
      ddbMock = mockClient(DynamoDBDocumentClient);
      repo = new DynamoDbAlertRepository({
        tableName: 'weatherly-test-table',
        gsiName: 'GSI1',
        region: 'us-east-1',
        documentClient: ddbMock as any,
      });
    });

    it('persists alert with sparse GSI1 attributes when enabled', async () => {
      ddbMock.on(PutCommand).resolves({});

      await repo.saveAlert('user-alpha', sampleRule1);

      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(1);
      const item = putCalls[0].args[0].input.Item!;

      expect(item.PK).toBe('USER#user-alpha');
      expect(item.SK).toBe('ALERT#rule-101');
      expect(item.GSI1PK).toBe('ALERT#ENABLED');
      expect(item.GSI1SK).toContain('6.93:79.86#user-alpha#rule-101');
      expect(item.enabled).toBe(true);
    });

    it('omits GSI1 attributes when alert is disabled (sparse index)', async () => {
      ddbMock.on(PutCommand).resolves({});

      await repo.saveAlert('user-alpha', sampleRule2);

      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(1);
      const item = putCalls[0].args[0].input.Item!;

      expect(item.PK).toBe('USER#user-alpha');
      expect(item.SK).toBe('ALERT#rule-102');
      expect(item.GSI1PK).toBeUndefined();
      expect(item.GSI1SK).toBeUndefined();
      expect(item.enabled).toBe(false);
    });

    it('queries user alerts using partition key and sort key prefix', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            PK: 'USER#user-alpha',
            SK: 'ALERT#rule-101',
            id: 'rule-101',
            userId: 'user-alpha',
            type: 'temp_above',
            threshold: 30,
            enabled: true,
            location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
            createdAt: '2026-11-06T10:00:00Z',
          },
        ],
      });

      const alerts = await repo.getAlertsByUserId('user-alpha');
      expect(alerts.length).toBe(1);
      expect(alerts[0].id).toBe('rule-101');

      const queryCalls = ddbMock.commandCalls(QueryCommand);
      expect(queryCalls[0].args[0].input.KeyConditionExpression).toContain('PK = :pk');
      expect(queryCalls[0].args[0].input.ExpressionAttributeValues?.[':pk']).toBe('USER#user-alpha');
    });

    it('retrieves single alert by ID and verifies user ownership', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'USER#user-alpha',
          SK: 'ALERT#rule-101',
          id: 'rule-101',
          userId: 'user-alpha',
          type: 'temp_above',
          threshold: 30,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
          createdAt: '2026-11-06T10:00:00Z',
        },
      });

      const alert = await repo.getAlertById('user-alpha', 'rule-101');
      expect(alert).not.toBeNull();
      expect(alert?.id).toBe('rule-101');

      // If item in table had different userId, return null
      ddbMock.on(GetCommand).resolves({
        Item: {
          id: 'rule-101',
          userId: 'attacker-sub',
        },
      });

      const mismatchedUserAlert = await repo.getAlertById('user-alpha', 'rule-101');
      expect(mismatchedUserAlert).toBeNull();
    });

    it('deletes alert by key', async () => {
      ddbMock
        .on(GetCommand)
        .resolves({ Item: { id: 'rule-101', userId: 'user-alpha' } });
      ddbMock.on(DeleteCommand).resolves({});

      const deleted = await repo.deleteAlert('user-alpha', 'rule-101');
      expect(deleted).toBe(true);

      const deleteCalls = ddbMock.commandCalls(DeleteCommand);
      expect(deleteCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#user-alpha',
        SK: 'ALERT#rule-101',
      });
    });

    it('queries GSI1 for enabled alerts with pagination tokens', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            id: 'rule-101',
            userId: 'user-alpha',
            type: 'temp_above',
            threshold: 30,
            enabled: true,
            location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
            createdAt: '2026-11-06T10:00:00Z',
          },
        ],
        LastEvaluatedKey: { PK: 'USER#user-alpha', SK: 'ALERT#rule-101' },
      });

      const result = await repo.getEnabledAlerts(10);
      expect(result.items.length).toBe(1);
      expect(result.nextCursor).toBeDefined();

      const queryCalls = ddbMock.commandCalls(QueryCommand);
      expect(queryCalls[0].args[0].input.IndexName).toBe('GSI1');
      expect(queryCalls[0].args[0].input.ExpressionAttributeValues?.[':gsi1pk']).toBe('ALERT#ENABLED');
    });

    it('records and checks evaluation records with TTL', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { PK: 'USER#user-alpha' } });

      const exists = await repo.hasEvaluationRecord('user-alpha', 'rule-101', '2026-11-06T12:00:00Z');
      expect(exists).toBe(true);

      ddbMock.on(PutCommand).resolves({});
      await repo.saveEvaluationRecord({
        id: 'eval-1',
        userId: 'user-alpha',
        alertId: 'rule-101',
        type: 'temp_above',
        actualValue: 33,
        threshold: 30,
        message: 'High heat',
        forecastTimestamp: '2026-11-06T12:00:00Z',
        triggeredAt: '2026-11-06T11:55:00Z',
        eventPeriod: '2026-11-06T12:00:00Z',
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const evalItem = putCalls[0].args[0].input.Item!;
      expect(evalItem.entityType).toBe('EVALUATION');
      expect(evalItem.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});
