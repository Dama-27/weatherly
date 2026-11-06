import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getAlertRepository } from '../repositories/alert-repository.factory';
import type { AlertLocation, AlertRule, AlertType } from '../types/weather-alert.types';

const VALID_ALERT_TYPES: Set<AlertType> = new Set([
  'temp_above',
  'temp_below',
  'rain_prob_above',
  'uv_index_above',
  'wind_speed_above',
  'thunderstorm',
  'heavy_precipitation',
]);

function validateLocation(location: any): AlertLocation {
  if (!location || typeof location !== 'object') {
    throw new Error('Location is required');
  }
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const name = typeof location.name === 'string' ? location.name.trim() : '';

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }
  if (!name) {
    throw new Error('Location name is required');
  }

  return { latitude: lat, longitude: lon, name };
}

function validateThreshold(type: AlertType, threshold: any): number | null {
  if (type === 'thunderstorm' || type === 'heavy_precipitation') {
    return null;
  }

  if (threshold === undefined || threshold === null || threshold === '') {
    throw new Error(`Threshold is required for alert type "${type}"`);
  }

  const num = Number(threshold);
  if (Number.isNaN(num)) {
    throw new Error('Threshold must be a valid number');
  }

  switch (type) {
    case 'temp_above':
    case 'temp_below':
      if (num < -60 || num > 60) {
        throw new Error('Temperature threshold must be between -60°C and 60°C');
      }
      break;
    case 'rain_prob_above':
      if (num < 0 || num > 100) {
        throw new Error('Rain probability threshold must be between 0% and 100%');
      }
      break;
    case 'uv_index_above':
      if (num < 0 || num > 16) {
        throw new Error('UV index threshold must be between 0 and 16');
      }
      break;
    case 'wind_speed_above':
      if (num < 0 || num > 200) {
        throw new Error('Wind speed threshold must be between 0 and 200 km/h');
      }
      break;
  }

  return num;
}

/**
 * Extracts and asserts the verified user ID from the backend JWT token payload.
 */
function getAuthenticatedUserId(req: Request): string {
  const userId = (req as any).auth?.sub;
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: User identity claim missing from token');
  }
  return userId;
}

/**
 * GET /api/alerts
 * Retrieves all alerts configured for the authenticated user.
 */
export async function getUserAlerts(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const repo = getAlertRepository();
    const alerts = await repo.getAlertsByUserId(userId);
    res.json({ alerts });
  } catch (err: any) {
    res.status(err.message?.includes('Unauthorized') ? 401 : 500).json({
      error: err.name || 'Error',
      message: err.message || 'Failed to retrieve alerts',
    });
  }
}

/**
 * POST /api/alerts
 * Creates a new alert for the authenticated user.
 */
export async function createAlert(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { type, threshold, location, enabled } = req.body || {};

    if (!VALID_ALERT_TYPES.has(type)) {
      res.status(400).json({
        error: 'ValidationError',
        message: `Invalid alert type "${type}". Must be one of: ${Array.from(VALID_ALERT_TYPES).join(', ')}`,
      });
      return;
    }

    const validatedLocation = validateLocation(location);
    const validatedThreshold = validateThreshold(type, threshold);

    const now = new Date().toISOString();
    const newAlert: AlertRule = {
      id: randomUUID(),
      userId,
      type,
      threshold: validatedThreshold,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      location: validatedLocation,
      createdAt: now,
      updatedAt: now,
    };

    const repo = getAlertRepository();
    const created = await repo.saveAlert(userId, newAlert);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({
      error: 'ValidationError',
      message: err.message || 'Failed to create alert',
    });
  }
}

/**
 * PUT /api/alerts/:id
 * Updates an existing alert for the authenticated user.
 */
export async function updateAlert(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    const updates: Partial<Omit<AlertRule, 'id' | 'userId' | 'createdAt'>> = {};

    if (req.body.enabled !== undefined) {
      updates.enabled = Boolean(req.body.enabled);
    }
    if (req.body.threshold !== undefined) {
      const existingAlert = await getAlertRepository().getAlertById(userId, alertId);
      if (!existingAlert) {
        res.status(404).json({ error: 'NotFound', message: 'Alert not found' });
        return;
      }
      updates.threshold = validateThreshold(existingAlert.type, req.body.threshold);
    }
    if (req.body.location !== undefined) {
      updates.location = validateLocation(req.body.location);
    }

    const repo = getAlertRepository();
    const updated = await repo.updateAlert(userId, alertId, updates);

    if (!updated) {
      res.status(404).json({ error: 'NotFound', message: 'Alert not found' });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({
      error: 'ValidationError',
      message: err.message || 'Failed to update alert',
    });
  }
}

/**
 * DELETE /api/alerts/:id
 * Deletes an alert rule belonging to the authenticated user.
 */
export async function deleteAlert(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    const repo = getAlertRepository();
    const deleted = await repo.deleteAlert(userId, alertId);

    if (!deleted) {
      res.status(404).json({ error: 'NotFound', message: 'Alert not found' });
      return;
    }

    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (err: any) {
    res.status(500).json({
      error: err.name || 'Error',
      message: err.message || 'Failed to delete alert',
    });
  }
}
