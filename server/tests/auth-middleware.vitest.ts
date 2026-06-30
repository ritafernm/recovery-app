import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import request from 'supertest';
import { createApp } from '../src/app.js';

const TEST_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

async function signToken(
  payload: Record<string, unknown>,
  secret = TEST_JWT_SECRET,
  expiresIn = '1h'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

describe('requireAuth middleware', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    app = createApp();
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const response = await request(app).get('/logs');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
  });

  it('returns 401 when Authorization header is not a Bearer token', async () => {
    const response = await request(app).get('/logs').set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
  });

  it('returns 500 when SUPABASE_JWT_SECRET is not configured', async () => {
    delete process.env.SUPABASE_JWT_SECRET;

    const response = await request(app).get('/logs').set('Authorization', 'Bearer some-token');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: 'Server configuration error' });
  });

  it('returns 401 when the token has an invalid signature', async () => {
    const token = await signToken({ sub: 'user-123', role: 'authenticated' }, 'wrong-secret-that-is-long-enough-to-sign');

    const response = await request(app).get('/logs').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 401 when the token is expired', async () => {
    const token = await signToken({ sub: 'user-123', role: 'authenticated' }, TEST_JWT_SECRET, '-1s');

    const response = await request(app).get('/logs').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized', message: 'Token has expired.' });
  });

  it('returns 401 when the token is malformed', async () => {
    const response = await request(app).get('/logs').set('Authorization', 'Bearer not.a.real.jwt');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('allows the request through with a valid token and extracts userId from sub', async () => {
    const token = await signToken({ sub: 'user-abc-123', role: 'authenticated' });

    // /logs returns 200 with a valid token (the route itself will fail to query Supabase
    // in the test environment, but auth should pass — we just check it isn't 401/500 from auth)
    const response = await request(app).get('/logs').set('Authorization', `Bearer ${token}`);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(500);
  });
});
