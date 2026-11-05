import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createAlertRule,
  deleteAlertRule,
  getAlertsStorageKey,
  getStoredAlerts,
  toggleAlertRule,
  updateAlertRule,
} from './alert-storage.ts';

// Mock localStorage for Node test runner environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Weather Alert Storage Utility', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    const mockStorage = new MockLocalStorage();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  describe('getAlertsStorageKey', () => {
    it('scopes storage key to authenticated user sub', () => {
      assert.strictEqual(
        getAlertsStorageKey('auth0|64abc123'),
        'weatherly_alerts_auth0|64abc123'
      );
    });

    it('falls back to guest key when userId is missing, empty, or undefined', () => {
      assert.strictEqual(getAlertsStorageKey(undefined), 'weatherly_alerts_guest');
      assert.strictEqual(getAlertsStorageKey(''), 'weatherly_alerts_guest');
      assert.strictEqual(getAlertsStorageKey('   '), 'weatherly_alerts_guest');
    });
  });

  describe('CRUD Operations and Isolation', () => {
    it('creates, retrieves, and persists alert rules for a specific user', () => {
      const userA = 'auth0|userA';

      const rule = createAlertRule(
        {
          type: 'temp_above',
          threshold: 32,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        },
        userA
      );

      assert.ok(rule.id.startsWith('alert_'));
      assert.strictEqual(rule.userId, userA);
      assert.strictEqual(rule.threshold, 32);

      const stored = getStoredAlerts(userA);
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].id, rule.id);
    });

    it('keeps alerts isolated between different authenticated users', () => {
      const userA = 'auth0|userA';
      const userB = 'auth0|userB';

      createAlertRule(
        {
          type: 'temp_above',
          threshold: 30,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        },
        userA
      );

      createAlertRule(
        {
          type: 'thunderstorm',
          threshold: null,
          enabled: true,
          location: { latitude: 7.2906, longitude: 80.6337, name: 'Kandy' },
        },
        userB
      );

      const alertsA = getStoredAlerts(userA);
      const alertsB = getStoredAlerts(userB);

      assert.strictEqual(alertsA.length, 1);
      assert.strictEqual(alertsA[0].type, 'temp_above');

      assert.strictEqual(alertsB.length, 1);
      assert.strictEqual(alertsB[0].type, 'thunderstorm');
    });

    it('toggles and updates an existing alert rule', () => {
      const user = 'auth0|testUser';
      const created = createAlertRule(
        {
          type: 'rain_prob_above',
          threshold: 50,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        },
        user
      );

      const toggled = toggleAlertRule(created.id, false, user);
      assert.strictEqual(toggled?.enabled, false);

      const updated = updateAlertRule(created.id, { threshold: 75 }, user);
      assert.strictEqual(updated?.threshold, 75);

      const stored = getStoredAlerts(user);
      assert.strictEqual(stored[0].enabled, false);
      assert.strictEqual(stored[0].threshold, 75);
    });

    it('deletes an alert rule by id', () => {
      const user = 'auth0|testUser';
      const r1 = createAlertRule(
        {
          type: 'uv_index_above',
          threshold: 8,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        },
        user
      );
      const r2 = createAlertRule(
        {
          type: 'wind_speed_above',
          threshold: 40,
          enabled: true,
          location: { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' },
        },
        user
      );

      assert.strictEqual(getStoredAlerts(user).length, 2);

      const deleted = deleteAlertRule(r1.id, user);
      assert.strictEqual(deleted, true);

      const remaining = getStoredAlerts(user);
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].id, r2.id);
    });

    it('handles corrupted JSON in localStorage gracefully without throwing', () => {
      const user = 'auth0|corruptUser';
      window.localStorage.setItem(getAlertsStorageKey(user), '{ corrupted JSON [');

      const results = getStoredAlerts(user);
      assert.deepStrictEqual(results, []);
    });
  });
});
