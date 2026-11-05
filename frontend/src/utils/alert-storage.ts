import type { AlertRule } from '../types/weather';

/**
 * Derives the localStorage key scoped by the authenticated user's Auth0 ID (`sub`).
 * Falls back to 'weatherly_alerts_guest' for unauthenticated/guest users.
 * Never stores authentication tokens or sensitive credentials.
 */
export function getAlertsStorageKey(userId?: string): string {
  if (userId && typeof userId === 'string' && userId.trim().length > 0) {
    return `weatherly_alerts_${userId.trim()}`;
  }
  return 'weatherly_alerts_guest';
}

/**
 * Safely retrieves stored alert rules from browser localStorage.
 */
export function getStoredAlerts(userId?: string): AlertRule[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const key = getAlertsStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is AlertRule =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.type === 'string' &&
          typeof item.enabled === 'boolean' &&
          Boolean(item.location) &&
          typeof item.location.latitude === 'number' &&
          typeof item.location.longitude === 'number'
      );
    }
  } catch (err) {
    console.warn('Failed to parse stored weather alerts:', err);
  }

  return [];
}

/**
 * Persists alert rules into browser localStorage.
 */
export function saveStoredAlerts(alerts: AlertRule[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const key = getAlertsStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to persist weather alerts into localStorage:', err);
  }
}

/**
 * Creates and persists a new alert rule.
 * Schema is structured for frictionless future migration to DynamoDB (PK: USER#<userId>, SK: ALERT#<id>).
 */
export function createAlertRule(
  data: Omit<AlertRule, 'id' | 'createdAt'>,
  userId?: string
): AlertRule {
  const current = getStoredAlerts(userId);
  const now = new Date().toISOString();
  const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const newRule: AlertRule = {
    ...data,
    id,
    userId: userId || 'guest',
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newRule, ...current];
  saveStoredAlerts(updated, userId);
  return newRule;
}

/**
 * Updates an existing alert rule.
 */
export function updateAlertRule(
  id: string,
  updates: Partial<AlertRule>,
  userId?: string
): AlertRule | null {
  const current = getStoredAlerts(userId);
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) {
    return null;
  }

  const updatedRule: AlertRule = {
    ...current[index],
    ...updates,
    id: current[index].id, // protect ID immutability
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedRule;
  saveStoredAlerts(current, userId);
  return updatedRule;
}

/**
 * Deletes an alert rule by ID.
 */
export function deleteAlertRule(id: string, userId?: string): boolean {
  const current = getStoredAlerts(userId);
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length !== current.length) {
    saveStoredAlerts(filtered, userId);
    return true;
  }
  return false;
}

/**
 * Toggles an alert rule's enabled status.
 */
export function toggleAlertRule(
  id: string,
  enabled: boolean,
  userId?: string
): AlertRule | null {
  return updateAlertRule(id, { enabled }, userId);
}

