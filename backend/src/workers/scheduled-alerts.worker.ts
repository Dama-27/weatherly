import { randomUUID } from 'crypto';
import type { Context, Handler } from 'aws-lambda';
import { env } from '../config/env';
import { createWeatherProvider } from '../providers/weather-provider.factory';
import { getAlertRepository } from '../repositories/alert-repository.factory';
import { evaluateAlertRules } from '../services/weather-alert.service';
import type { AlertLocation, AlertRule } from '../types/weather-alert.types';

export interface ScheduledWorkerResult {
  status: 'completed' | 'failed';
  durationMs: number;
  processedAlerts: number;
  triggeredAlerts: number;
  deduplicatedAlerts: number;
  locationsEvaluated: number;
  errors: Array<{ location: string; error: string }>;
}

const DEFAULT_BATCH_LIMIT = 200;

/**
 * AWS Lambda Scheduled Event Worker.
 *
 * Triggered by AWS EventBridge (CloudWatch Events) on a recurring schedule (e.g. every 15-30 mins).
 *
 * Architecture & Execution Flow:
 * 1. Queries enabled alert configurations across all users using GSI1 ('ALERT#ENABLED') sparse index.
 * 2. Groups alerts by geographical coordinates so each city's forecast is fetched only once.
 * 3. Fetches real-time forecast data via OpenMeteoProvider (or configured provider).
 * 4. Reuses Day 2 evaluateAlertRules() engine for deterministic evaluation.
 * 5. Applies duplicate suppression via repository.hasEvaluationRecord() before saving.
 * 6. Records triggered evaluation events with 7-day TTL for audit and deduplication.
 * 7. Isolates failures: If one city's weather API fails, other cities continue processing.
 */
export async function executeScheduledAlertEvaluation(
  options?: { limit?: number; repository?: ReturnType<typeof getAlertRepository> }
): Promise<ScheduledWorkerResult> {
  const startTime = Date.now();
  const repo = options?.repository || getAlertRepository();
  const weatherProvider = createWeatherProvider(env.weatherProvider);
  const limit = options?.limit || DEFAULT_BATCH_LIMIT;

  const errors: Array<{ location: string; error: string }> = [];
  let processedAlerts = 0;
  let triggeredAlerts = 0;
  let deduplicatedAlerts = 0;

  // 1. Retrieve enabled alerts
  const { items: enabledRules } = await repo.getEnabledAlerts(limit);
  processedAlerts = enabledRules.length;

  if (enabledRules.length === 0) {
    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        worker: 'ScheduledAlertsWorker',
        status: 'completed',
        durationMs,
        processedAlerts: 0,
        message: 'No enabled alerts found to evaluate.',
      })
    );
    return {
      status: 'completed',
      durationMs,
      processedAlerts: 0,
      triggeredAlerts: 0,
      deduplicatedAlerts: 0,
      locationsEvaluated: 0,
      errors: [],
    };
  }

  // 2. Group alerts by location to minimize external weather API requests
  const locationGroups = new Map<
    string,
    { location: AlertLocation; rules: AlertRule[] }
  >();

  for (const rule of enabledRules) {
    if (!rule.location || typeof rule.location.latitude !== 'number') {
      continue;
    }
    const key = `${rule.location.latitude.toFixed(2)}:${rule.location.longitude.toFixed(2)}`;
    if (!locationGroups.has(key)) {
      locationGroups.set(key, { location: rule.location, rules: [] });
    }
    locationGroups.get(key)!.rules.push(rule);
  }

  // 3. Process each location group safely
  for (const { location, rules } of locationGroups.values()) {
    try {
      // Fetch 2-day forecast with hourly data for evaluation
      const forecast = await weatherProvider.getForecast(
        { latitude: location.latitude, longitude: location.longitude },
        { days: 2, includeHourly: true },
        location.name
      );

      // 4. Evaluate using existing Day 2 evaluation service
      const report = evaluateAlertRules(rules, forecast.current, forecast.hourly);

      // 5. Deduplication and persistence
      for (const alert of report.alerts) {
        const matchingRule = rules.find((r) => r.id === alert.ruleId);
        const userId = matchingRule?.userId;
        if (!userId) {
          continue;
        }

        // Check if this alert was already triggered for this specific forecast period
        const isDuplicate = await repo.hasEvaluationRecord(
          userId,
          alert.ruleId,
          alert.timestamp
        );

        if (isDuplicate) {
          deduplicatedAlerts++;
          continue;
        }

        // Save evaluation record with 7-day TTL
        await repo.saveEvaluationRecord({
          id: randomUUID(),
          userId,
          alertId: alert.ruleId,
          type: alert.type,
          actualValue: alert.actualValue,
          threshold: alert.threshold,
          message: alert.message,
          forecastTimestamp: alert.timestamp,
          triggeredAt: new Date().toISOString(),
          eventPeriod: alert.timestamp,
        });

        triggeredAlerts++;
      }
    } catch (locErr: any) {
      // Partial failure isolation: log and record error, but continue remaining locations
      const errorMessage = locErr?.message || 'Failed to fetch weather or evaluate alerts';
      console.error(
        `[ScheduledAlertsWorker] Error evaluating location "${location.name}":`,
        errorMessage
      );
      errors.push({
        location: location.name,
        error: errorMessage,
      });
    }
  }

  const durationMs = Date.now() - startTime;
  const result: ScheduledWorkerResult = {
    status: 'completed',
    durationMs,
    processedAlerts,
    triggeredAlerts,
    deduplicatedAlerts,
    locationsEvaluated: locationGroups.size,
    errors,
  };

  console.log(
    JSON.stringify({
      worker: 'ScheduledAlertsWorker',
      ...result,
    })
  );

  return result;
}

/**
 * Standard AWS Lambda Handler for EventBridge Scheduled Events.
 */
export const handler: Handler<any, ScheduledWorkerResult> = async (
  _event: any,
  context?: Context
): Promise<ScheduledWorkerResult> => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  return executeScheduledAlertEvaluation();
};

export default handler;
