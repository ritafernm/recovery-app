import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockMarkLogDone, mockGetUserLogs, mockRequireAuth } = vi.hoisted(() => ({
  mockMarkLogDone: vi.fn(),
  mockGetUserLogs: vi.fn(),
  mockRequireAuth: vi.fn(),
}));

vi.mock('../src/recovery-plan.js', () => ({
  generateRecoveryPlan: vi.fn(),
  saveRecoveryPlan: vi.fn(),
}));

vi.mock('../src/recovery-plan-logs.js', () => ({
  markLogDone: mockMarkLogDone,
  getUserLogs: mockGetUserLogs,
}));

vi.mock('../src/auth-middleware.js', () => ({
  requireAuth: mockRequireAuth,
}));

import { createApp } from '../src/app.js';

describe('PATCH /logs/:id/done', () => {
  const originalToken = process.env.API_TOKEN;
  const validLogId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.API_TOKEN = 'test-token';
    mockRequireAuth.mockReset();
    mockRequireAuth.mockImplementation((req: any, res: any, next: any) => {
      const authHeader = req.headers?.authorization as string | undefined;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
        return;
      }
      const token = authHeader.slice(7);
      if (token !== process.env.API_TOKEN) {
        res.status(403).json({ error: 'Forbidden', message: 'The provided token is not allowed.' });
        return;
      }
      req.token = token;
      next();
    });
    mockMarkLogDone.mockReset();
    app = createApp();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = originalToken;
    }
  });

  it('returns 401 when no bearer token is provided', async () => {
    const response = await request(app).patch(`/logs/${validLogId}/done`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 403 when the token is invalid', async () => {
    const response = await request(app)
      .patch(`/logs/${validLogId}/done`)
      .set('Authorization', 'Bearer wrong-token');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Forbidden' });
  });

  it('returns 400 when the log id is not a valid UUID', async () => {
    const response = await request(app)
      .patch('/logs/not-a-uuid/done')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid log id');
  });

  it('marks the log as done and returns the updated record', async () => {
    const updatedLog = { id: validLogId, user_status: 'done', completed_at: '2026-06-28T00:00:00Z' };
    mockMarkLogDone.mockResolvedValueOnce(updatedLog);

    const response = await request(app)
      .patch(`/logs/${validLogId}/done`)
      .set('Authorization', 'Bearer test-token');

    expect(mockMarkLogDone).toHaveBeenCalledWith(validLogId, 'test-token');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ message: 'Log marked as done.', log: updatedLog });
  });

  it('returns 404 when the log is not found', async () => {
    mockMarkLogDone.mockRejectedValueOnce(new Error('Log not found.'));

    const response = await request(app)
      .patch(`/logs/${validLogId}/done`)
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Update failed');
  });

  it('returns 502 when the store throws an unexpected error', async () => {
    mockMarkLogDone.mockRejectedValueOnce(new Error('Database connection failed.'));

    const response = await request(app)
      .patch(`/logs/${validLogId}/done`)
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('Update failed');
  });
});

describe('GET /logs', () => {
  const originalToken = process.env.API_TOKEN;
  const validUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.API_TOKEN = 'test-token';
    mockRequireAuth.mockReset();
    mockRequireAuth.mockImplementation((req: any, res: any, next: any) => {
      const authHeader = req.headers?.authorization as string | undefined;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
        return;
      }
      const token = authHeader.slice(7);
      if (token !== process.env.API_TOKEN) {
        res.status(403).json({ error: 'Forbidden', message: 'The provided token is not allowed.' });
        return;
      }
      req.token = token;
      req.userId = validUserId;
      next();
    });
    mockGetUserLogs.mockReset();
    app = createApp();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = originalToken;
    }
  });

  it('returns 401 when no bearer token is provided', async () => {
    const response = await request(app).get('/logs');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 403 when the token is invalid', async () => {
    const response = await request(app)
      .get('/logs')
      .set('Authorization', 'Bearer wrong-token');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Forbidden' });
  });

  it('returns the logs for the given user ordered newest-first', async () => {
    const logs = [
      { id: 'log-2', user_id: validUserId, user_status: 'done', completed_at: '2026-06-28T12:00:00Z' },
      { id: 'log-1', user_id: validUserId, user_status: null, completed_at: '2026-06-27T08:00:00Z' },
    ];
    mockGetUserLogs.mockResolvedValueOnce(logs);

    const response = await request(app)
      .get('/logs')
      .set('Authorization', 'Bearer test-token');

    expect(mockGetUserLogs).toHaveBeenCalledWith(validUserId, 'test-token');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ logs });
  });

  it('returns an empty array when the user has no logs', async () => {
    mockGetUserLogs.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/logs')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body.logs).toEqual([]);
  });

  it('returns 502 when the store throws an unexpected error', async () => {
    mockGetUserLogs.mockRejectedValueOnce(new Error('Database connection failed.'));

    const response = await request(app)
      .get('/logs')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('Fetch failed');
  });
});
