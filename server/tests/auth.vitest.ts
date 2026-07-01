import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

function makeFetchResponse(ok: boolean, status: number, body: unknown): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('POST /auth/signup', () => {
  let app: ReturnType<typeof createApp>; 
  let fetchSpy: any;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    app = createApp();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('returns 400 when email is missing', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ username: 'testuser', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email, username, and password are required.');
  });

  it('returns 400 when username is missing', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email, username, and password are required.');
  });

  it('returns 400 when password is missing', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', username: 'testuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email, username, and password are required.');
  });

  it('returns 400 when all fields are missing', async () => {
    const response = await request(app).post('/auth/signup').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email, username, and password are required.');
  });

  it('returns 201 when signup is successful', async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(true, 200, { user: { id: 'user-123', email: 'user@example.com' } })
    );

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', username: 'testuser', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Signup successful. Check your email to confirm your account.');
    expect(response.body.user).toMatchObject({ id: 'user-123', email: 'user@example.com' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/signup',
      expect.objectContaining({
        body: JSON.stringify({ email: 'user@example.com', password: 'password123', data: { username: 'testuser' } }),
      })
    );
  });

  it('forwards the Supabase error status and message on failure', async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(false, 422, { error_description: 'Email already registered.' })
    );

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'existing@example.com', username: 'testuser', password: 'password123' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Email already registered.');
  });

  it('returns 500 when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL;

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', username: 'testuser', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Signup request failed.');
  });

  it('returns 500 when fetch throws an unexpected error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', username: 'testuser', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Signup request failed.');
    expect(response.body.message).toBe('Network failure');
  });
});

describe('POST /auth/login', () => {
  let app: ReturnType<typeof createApp>;
  let fetchSpy: any;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    app = createApp();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('returns 400 when email and username are both missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email or username, and password are required.');
  });

  it('returns 400 when password is missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email or username, and password are required.');
  });

  it('returns an access token on successful login with email', async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(true, 200, {
        access_token: 'jwt-token-123',
        user: { id: 'user-123', email: 'user@example.com' },
      })
    );

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful.');
    expect(response.body.access_token).toBe('jwt-token-123');
    expect(response.body.user).toMatchObject({ id: 'user-123', email: 'user@example.com' });
  });

  it('returns an access token on successful login with username', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // First fetch: username → email lookup
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(true, 200, [{ email: 'user@example.com' }])
    );
    // Second fetch: Supabase auth token
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(true, 200, {
        access_token: 'jwt-token-123',
        user: { id: 'user-123', email: 'user@example.com' },
      })
    );

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful.');
    expect(response.body.access_token).toBe('jwt-token-123');
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('users?select=email&username=eq.testuser'),
      expect.objectContaining({ headers: expect.objectContaining({ apikey: 'test-service-role-key' }) })
    );

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns 400 when username is not found', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    fetchSpy.mockResolvedValueOnce(makeFetchResponse(true, 200, []));

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'unknown', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No account found with that username.');

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns 500 when logging in with username but service role key is not configured', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Login request failed.');
  });

  it('forwards the Supabase error status and message on failed login', async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(false, 400, { error_description: 'Invalid login credentials.' })
    );

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid login credentials.');
  });

  it('returns 500 when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL;

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Login request failed.');
  });

  it('returns 500 when fetch throws an unexpected error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Login request failed.');
    expect(response.body.message).toBe('Network failure');
  });
});

describe('POST /auth/logout', () => {
  let app: ReturnType<typeof createApp>;
  let fetchSpy: any;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    app = createApp();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('returns 400 when no Authorization header is provided', async () => {
    const response = await request(app).post('/auth/logout');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No token provided.');
  });

  it('returns 400 when Authorization header is not a Bearer token', async () => {
    const response = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No token provided.');
  });

  it('logs out successfully and returns a confirmation message', async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse(true, 204, {}));

    const response = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer valid-jwt-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-jwt-token',
          apikey: 'test-anon-key',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out successfully.');
  });

  it('returns 500 when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL;

    const response = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer valid-jwt-token');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Logout request failed.');
  });

  it('returns 500 when fetch throws an unexpected error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const response = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer valid-jwt-token');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Logout request failed.');
    expect(response.body.message).toBe('Network failure');
  });
});
