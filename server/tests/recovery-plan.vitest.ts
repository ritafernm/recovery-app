import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('POST /recovery-plan', () => {
  const originalToken = process.env.API_TOKEN;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.API_TOKEN = 'test-token';
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

  it('returns 201 and echoes the input for a valid request', async () => {
    const response = await request(app)
      .post('/recovery-plan')
      .set('Authorization', 'Bearer test-token')
      .send({ input: 'Rest and hydrate' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'New recovery plan created successfully!',
      input: 'Rest and hydrate',
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
});
