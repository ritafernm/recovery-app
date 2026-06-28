import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateRecoveryPlan, mockSaveRecoveryPlan } = vi.hoisted(() => ({
  mockGenerateRecoveryPlan: vi.fn(),
  mockSaveRecoveryPlan: vi.fn(),
}));

vi.mock('../src/recovery-plan.js', () => ({
  generateRecoveryPlan: mockGenerateRecoveryPlan,
}));

vi.mock('../src/recovery-plan-store.js', () => ({
  saveRecoveryPlan: mockSaveRecoveryPlan,
}));

vi.mock('../src/recovery-plan-logs.js', () => ({}));

import { createApp } from '../src/app.js';

const defaultPlan = {
  name: 'Gentle Reset',
  estimatedMinutes: 30,
  tasks: [
    {
      name: 'Hydrate and rest',
      category: 'physical' as const,
      durationMinutes: 10,
      tip: 'Drink water slowly',
      difficulty: 1,
      isRequired: true,
      tags: ['rest'],
    },
  ],
};

describe('POST /recovery-plan', () => {
  const originalToken = process.env.API_TOKEN;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.API_TOKEN = 'test-token';
    mockGenerateRecoveryPlan.mockReset();
    mockSaveRecoveryPlan.mockReset();
    mockGenerateRecoveryPlan.mockResolvedValue(defaultPlan);
    mockSaveRecoveryPlan.mockResolvedValue({ id: 'plan-123' });
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
    const response = await request(app).post('/recovery-plan').send({ input: 'Rest and hydrate' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: 'Unauthorized',
      message: 'A valid bearer token is required.',
    });
  });

  it('returns 403 when the token is invalid', async () => {
    const response = await request(app)
      .post('/recovery-plan')
      .set('Authorization', 'Bearer wrong-token')
      .send({ input: 'Rest and hydrate' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'Forbidden',
      message: 'The provided token is not allowed.',
    });
  });

  it('returns 400 when the request body is invalid', async () => {
    const response = await request(app)
      .post('/recovery-plan')
      .set('Authorization', 'Bearer test-token')
      .send({ input: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
    expect(response.body.details).toBeDefined();
  });

  it('generates and persists a recovery plan for a valid request', async () => {
    const plan = defaultPlan;

    mockGenerateRecoveryPlan.mockResolvedValueOnce(plan);
    mockSaveRecoveryPlan.mockResolvedValueOnce({ id: 'plan-123' });

    const response = await request(app)
      .post('/recovery-plan')
      .set('Authorization', 'Bearer test-token')
      .send({ input: 'Rest and hydrate' });

    expect(mockGenerateRecoveryPlan).toHaveBeenCalledWith('Rest and hydrate');
    expect(mockSaveRecoveryPlan).toHaveBeenCalledWith(plan);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'New recovery plan created successfully!',
      input: 'Rest and hydrate',
      plan,
      savedPlanId: 'plan-123',
    });
  });

  it('returns 429 after the rate limit is exceeded', async () => {
    const auth = 'Bearer test-token';

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app)
        .post('/recovery-plan')
        .set('Authorization', auth)
        .send({ input: 'Rest and hydrate' });

      expect(response.status).toBe(201);
    }

    const response = await request(app)
      .post('/recovery-plan')
      .set('Authorization', auth)
      .send({ input: 'Rest and hydrate' });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  });

  it('allows requests again after the rate limit window expires', async () => {
    vi.useFakeTimers();

    try {
      const auth = 'Bearer test-token';

      for (let index = 0; index < 5; index += 1) {
        const response = await request(app)
          .post('/recovery-plan')
          .set('Authorization', auth)
          .send({ input: 'Rest and hydrate' });

        expect(response.status).toBe(201);
      }

      const blockedResponse = await request(app)
        .post('/recovery-plan')
        .set('Authorization', auth)
        .send({ input: 'Rest and hydrate' });

      expect(blockedResponse.status).toBe(429);

      vi.advanceTimersByTime(15 * 60 * 1000);

      const allowedResponse = await request(app)
        .post('/recovery-plan')
        .set('Authorization', auth)
        .send({ input: 'Rest and hydrate' });

      expect(allowedResponse.status).toBe(201);
    } finally {
      vi.useRealTimers();
    }
  });
});
