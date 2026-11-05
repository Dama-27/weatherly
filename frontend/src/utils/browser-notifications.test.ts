import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  clearNotificationDeduplication,
  getNotificationStatus,
  isNotificationSupported,
  notifyTriggeredAlert,
  requestNotificationPermission,
} from './browser-notifications.ts';
import type { TriggeredAlert } from '../types/weather';

describe('Browser Notifications Utility', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    clearNotificationDeduplication();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    clearNotificationDeduplication();
  });

  it('reports unsupported when Notification is not in window', () => {
    (globalThis as any).window = {};
    assert.strictEqual(isNotificationSupported(), false);
    assert.strictEqual(getNotificationStatus(), 'unsupported');
  });

  it('requests and returns notification permission', async () => {
    (globalThis as any).window = {
      Notification: {
        permission: 'default',
        requestPermission: async () => 'granted',
      },
    };

    assert.strictEqual(isNotificationSupported(), true);
    assert.strictEqual(getNotificationStatus(), 'default');

    const result = await requestNotificationPermission();
    assert.strictEqual(result, 'granted');
  });

  it('dispatches desktop notification when permission is granted and suppresses duplicates', () => {
    let dispatchedTitle = '';
    let dispatchedOptions: any = null;
    let callCount = 0;

    class MockNotification {
      static permission: NotificationPermission = 'granted';
      constructor(title: string, options?: NotificationOptions) {
        dispatchedTitle = title;
        dispatchedOptions = options;
        callCount++;
      }
    }

    (globalThis as any).window = {
      Notification: MockNotification,
    };

    const mockAlert: TriggeredAlert = {
      id: 'alert_1',
      ruleId: 'rule_100',
      type: 'temp_above',
      actualValue: 33,
      threshold: 30,
      message: 'Current temperature in Colombo is 33°C, exceeding your threshold.',
      timestamp: '2026-11-05T12:00:00Z',
      locationName: 'Colombo',
      severity: 'warning',
    };

    // First dispatch should succeed
    const firstResult = notifyTriggeredAlert(mockAlert);
    assert.strictEqual(firstResult, true);
    assert.strictEqual(callCount, 1);
    assert.ok(dispatchedTitle.includes('Colombo'));
    assert.strictEqual(dispatchedOptions.tag, 'rule_100');

    // Duplicate dispatch for identical rule & timestamp should be suppressed
    const duplicateResult = notifyTriggeredAlert(mockAlert);
    assert.strictEqual(duplicateResult, false);
    assert.strictEqual(callCount, 1);
  });

  it('does not dispatch notifications when permission is denied or default', () => {
    class MockNotification {
      static permission: NotificationPermission = 'denied';
      constructor() {
        assert.fail('Should not instantiate Notification when denied');
      }
    }

    (globalThis as any).window = {
      Notification: MockNotification,
    };

    const mockAlert: TriggeredAlert = {
      id: 'alert_2',
      ruleId: 'rule_200',
      type: 'thunderstorm',
      actualValue: 'Thunderstorm',
      threshold: null,
      message: 'Thunderstorm detected',
      timestamp: '2026-11-05T12:00:00Z',
      locationName: 'Kandy',
      severity: 'severe',
    };

    const result = notifyTriggeredAlert(mockAlert);
    assert.strictEqual(result, false);
  });
});

