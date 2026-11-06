import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setAlertRepository } from '../repositories/alert-repository.factory';
import { InMemoryAlertRepository } from '../repositories/in-memory-alert.repository';

describe('Alert Controller (REST API /api/alerts)', () => {
  let memoryRepo: InMemoryAlertRepository;

  beforeEach(() => {
    memoryRepo = new InMemoryAlertRepository();
    setAlertRepository(memoryRepo);
  });

  describe('Authentication & Security', () => {
    it('returns 401 when request lacks Authorization Bearer token', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 for POST without authentication', async () => {
      const res = await request(app).post('/api/alerts').send({
        type: 'temp_above',
        threshold: 30,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/alerts', () => {
    it('returns empty array when user has no configured alerts', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('alerts');
      expect(res.body.alerts).toEqual([]);
    });

    it('returns alerts for authenticated user in descending creation order', async () => {
      await memoryRepo.saveAlert('auth0|test-user-123', {
        id: 'alert-1',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T10:00:00Z',
      });
      await memoryRepo.saveAlert('auth0|test-user-123', {
        id: 'alert-2',
        type: 'uv_index_above',
        threshold: 8,
        enabled: false,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T11:00:00Z',
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body.alerts.length).toBe(2);
      expect(res.body.alerts[0].id).toBe('alert-2'); // Newer first
      expect(res.body.alerts[1].id).toBe('alert-1');
    });

    it('isolates user alerts so other users cannot see them', async () => {
      // Save an alert for someone else
      await memoryRepo.saveAlert('auth0|other-user-999', {
        id: 'secret-alert',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 51.5, longitude: -0.1, name: 'London' },
        createdAt: '2026-11-06T10:00:00Z',
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token'); // Authenticates as auth0|test-user-123

      expect(res.status).toBe(200);
      expect(res.body.alerts.length).toBe(0);
    });
  });

  describe('POST /api/alerts', () => {
    it('creates a new alert with validated threshold and location', async () => {
      const payload = {
        type: 'rain_prob_above',
        threshold: 65,
        location: {
          latitude: 7.21,
          longitude: 79.84,
          name: 'Negombo',
        },
        enabled: true,
      };

      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe('auth0|test-user-123');
      expect(res.body.type).toBe('rain_prob_above');
      expect(res.body.threshold).toBe(65);
      expect(res.body.location.name).toBe('Negombo');
      expect(res.body.enabled).toBe(true);

      const saved = await memoryRepo.getAlertById('auth0|test-user-123', res.body.id);
      expect(saved).not.toBeNull();
    });

    it('rejects invalid alert types with 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({
          type: 'invalid_type_xyz',
          threshold: 10,
          location: { latitude: 7.21, longitude: 79.84, name: 'Negombo' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.message).toContain('Invalid alert type');
    });

    it('rejects out-of-range thresholds with 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({
          type: 'rain_prob_above',
          threshold: 150, // Max is 100%
          location: { latitude: 7.21, longitude: 79.84, name: 'Negombo' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.message).toContain('between 0% and 100%');
    });

    it('rejects invalid location coordinates with 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({
          type: 'temp_above',
          threshold: 25,
          location: { latitude: 999, longitude: 79.84, name: 'Nowhere' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.message).toContain('Invalid latitude');
    });
  });

  describe('PUT /api/alerts/:id', () => {
    it('updates an existing alert for the authenticated user', async () => {
      const created = await memoryRepo.saveAlert('auth0|test-user-123', {
        id: 'alert-to-update',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T10:00:00Z',
      });

      const res = await request(app)
        .put(`/api/alerts/${created.id}`)
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({
          enabled: false,
          threshold: 34,
        });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
      expect(res.body.threshold).toBe(34);

      const inDb = await memoryRepo.getAlertById('auth0|test-user-123', created.id);
      expect(inDb?.enabled).toBe(false);
      expect(inDb?.threshold).toBe(34);
    });

    it('returns 404 when updating an alert that does not exist', async () => {
      const res = await request(app)
        .put('/api/alerts/non-existent-id')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({ enabled: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NotFound');
    });

    it('returns 404 when attempting to update another user alert', async () => {
      await memoryRepo.saveAlert('auth0|other-user-999', {
        id: 'foreign-alert',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T10:00:00Z',
      });

      const res = await request(app)
        .put('/api/alerts/foreign-alert')
        .set('Authorization', 'Bearer mock-valid-jwt-token')
        .send({ enabled: false });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    it('deletes an alert rule belonging to the authenticated user', async () => {
      const created = await memoryRepo.saveAlert('auth0|test-user-123', {
        id: 'alert-to-delete',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T10:00:00Z',
      });

      const res = await request(app)
        .delete(`/api/alerts/${created.id}`)
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const inDb = await memoryRepo.getAlertById('auth0|test-user-123', created.id);
      expect(inDb).toBeNull();
    });

    it('returns 404 when attempting to delete non-existent alert', async () => {
      const res = await request(app)
        .delete('/api/alerts/random-id-123')
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NotFound');
    });

    it('returns 404 when attempting to delete another user alert', async () => {
      await memoryRepo.saveAlert('auth0|other-user-999', {
        id: 'foreign-alert-del',
        type: 'temp_above',
        threshold: 30,
        enabled: true,
        location: { latitude: 6.9, longitude: 79.8, name: 'Colombo' },
        createdAt: '2026-11-06T10:00:00Z',
      });

      const res = await request(app)
        .delete('/api/alerts/foreign-alert-del')
        .set('Authorization', 'Bearer mock-valid-jwt-token');

      expect(res.status).toBe(404);
      const stillExists = await memoryRepo.getAlertById('auth0|other-user-999', 'foreign-alert-del');
      expect(stillExists).not.toBeNull();
    });
  });
});
