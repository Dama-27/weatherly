import type { TriggeredAlert } from '../types/weather';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Tracks alert event signatures dispatched during the current browser session
 * to prevent duplicate notification spam for the same forecast/condition event.
 */
const notifiedSessionAlertSignatures = new Set<string>();

/**
 * Checks whether the browser supports the HTML5 Notifications API.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retrieves the current browser notification permission state.
 */
export function getNotificationStatus(): NotificationSupportStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

/**
 * Requests browser notification permission after explicit user interaction.
 */
export async function requestNotificationPermission(): Promise<NotificationSupportStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return window.Notification.permission;
  }
}

/**
 * Dispatches a native browser desktop notification for a newly triggered alert event.
 * Automatically suppresses duplicate notifications for the same rule & timestamp period.
 */
export function notifyTriggeredAlert(alert: TriggeredAlert): boolean {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') {
    return false;
  }

  const signature = `${alert.ruleId}_${alert.timestamp}`;
  if (notifiedSessionAlertSignatures.has(signature)) {
    return false;
  }

  try {
    const title = `Weatherly Alert: ${alert.locationName}`;
    const options: NotificationOptions = {
      body: alert.message,
      tag: alert.ruleId, // Replaces any previous notification for this rule in the OS center
      icon: '/favicon.ico',
    };

    new window.Notification(title, options);
    notifiedSessionAlertSignatures.add(signature);
    return true;
  } catch (err) {
    console.warn('Failed to display native browser notification:', err);
    return false;
  }
}

/**
 * Clears the session deduplication cache (useful for testing and reset).
 */
export function clearNotificationDeduplication(): void {
  notifiedSessionAlertSignatures.clear();
}

