/**
 * Tests for the POST /api/recovery-plan route handler.
 *
 * This is the newest, most security-relevant code in the app: it does real JWT
 * verification, rate limiting, request validation, an AI call, and persistence
 * to Supabase. Coverage here follows risk.
 *
 * The AI SDK (`generateObject`) is mocked so no model is ever called; the
 * Supabase REST calls are intercepted with msw.
 */

import { SignJWT } from 'jose';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Module mocks (hoisted) -------------------------------------------------
vi.mock('ai', () => ({ generateObject: vi.fn() }));
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn(() => 'mock-model') }));

import { generateObject } from 'ai';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/recovery-plan/route';

const mockGenerateObject = vi.mocked(generateObject);

// --- Test config ------------------------------------------------------------
const SUPABASE_URL = 'https://project.supabase.co';
const SUPABASE_ANON_KEY = 'anon-key';
const JWT_SECRET = 'super-secret-signing-key-for-tests';

const validPlan = {
  name: 'Active Recovery',
  estimatedMinutes: 30,
  tasks: [{ name: 'Foam rolling', category: 'physical' as const, durationMinutes: 10 }],
};

const validBody = { description: 'Sore legs after a long run', muscleSoreness: 3, mentalStress: 2 };

// --- Helpers ----------------------------------------------------------------
async function makeToken(sub = 'user-123', secret = JWT_SECRET): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

let ipCounter = 0;
/** Each request gets a unique client IP so the module-level rate-limit store stays isolated. */
function nextIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function makeRequest(opts: { token?: string; ip?: string; body?: unknown; rawBody?: string } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('x-forwarded-for', opts.ip ?? nextIp());
  if (opts.token) headers.set('cookie', `session_token=${opts.token}`);

  const body =
    opts.rawBody !== undefined
      ? opts.rawBody
      : opts.body !== undefined
        ? JSON.stringify(opts.body)
        : undefined;

  return new NextRequest('http://localhost/api/recovery-plan', { method: 'POST', headers, body });
}

// --- msw --------------------------------------------------------------------
const recoveryPlansUrl = `${SUPABASE_URL}/rest/v1/recovery_plans`;
const recoveryPlanLogsUrl = `${SUPABASE_URL}/rest/v1/recovery_plan_logs`;

const server = setupServer(
  http.post(recoveryPlansUrl, () => HttpResponse.json([{ id: 'plan-1', name: validPlan.name }])),
  http.post(recoveryPlanLogsUrl, () => HttpResponse.json([{ id: 'log-1' }])),
);

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => server.close());

beforeEach(() => {
  mockGenerateObject.mockResolvedValue({ object: validPlan } as never);
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
describe('POST /api/recovery-plan — authentication', () => {
  it('returns 401 when no session token is present', async () => {
    const res = await POST(makeRequest({ body: validBody }));
    expect(res.status).toBe(401);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it('returns 401 when the token signature is invalid', async () => {
    const token = await makeToken('user-123', 'a-different-secret');
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(401);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it('returns 401 when the token has no subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(JWT_SECRET));
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(401);
  });

  it('returns 500 when the HS256 signing secret is not configured', async () => {
    const original = process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    try {
      const token = await makeToken();
      const res = await POST(makeRequest({ token, body: validBody }));
      expect(res.status).toBe(500);
    } finally {
      process.env.SUPABASE_JWT_SECRET = original;
    }
  });
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------
describe('POST /api/recovery-plan — request validation', () => {
  it('returns 400 for a malformed JSON body', async () => {
    const token = await makeToken();
    const res = await POST(makeRequest({ token, rawBody: 'not-json{' }));
    expect(res.status).toBe(400);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it('returns 422 when the body fails schema validation', async () => {
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: { description: '', muscleSoreness: 9, mentalStress: 2 } }));
    expect(res.status).toBe(422);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path + persistence
// ---------------------------------------------------------------------------
describe('POST /api/recovery-plan — success', () => {
  it('returns 200 with the generated plan and persists it to Supabase', async () => {
    const planHit = vi.fn();
    const logHit = vi.fn();
    server.use(
      http.post(recoveryPlansUrl, async ({ request }) => {
        planHit();
        // The user's JWT — not the anon key — must authorize the write (RLS).
        expect(request.headers.get('authorization')).toMatch(/^Bearer /);
        expect(request.headers.get('apikey')).toBe(SUPABASE_ANON_KEY);
        return HttpResponse.json([{ id: 'plan-1', name: validPlan.name }]);
      }),
      http.post(recoveryPlanLogsUrl, async ({ request }) => {
        const payload = (await request.json()) as Array<{ plan_id: string; user_id: string }>;
        expect(payload[0]).toMatchObject({ plan_id: 'plan-1', user_id: 'user-123' });
        logHit();
        return HttpResponse.json([{ id: 'log-1' }]);
      }),
    );

    const token = await makeToken('user-123');
    const res = await POST(makeRequest({ token, body: validBody }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(validPlan);
    expect(planHit).toHaveBeenCalledTimes(1);
    expect(logHit).toHaveBeenCalledTimes(1);
  });

  it('still returns 200 when persistence env vars are missing (plan not saved)', async () => {
    const original = process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    try {
      const token = await makeToken();
      const res = await POST(makeRequest({ token, body: validBody }));
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(validPlan);
    } finally {
      process.env.SUPABASE_ANON_KEY = original;
    }
  });

  it('still returns 200 when the database write fails', async () => {
    server.use(
      http.post(recoveryPlansUrl, () => new HttpResponse('forbidden', { status: 403 })),
    );
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(validPlan);
  });
});

// ---------------------------------------------------------------------------
// AI failures
// ---------------------------------------------------------------------------
describe('POST /api/recovery-plan — AI failures', () => {
  it('returns 429 when the AI service is rate-limited', async () => {
    mockGenerateObject.mockRejectedValueOnce(Object.assign(new Error('rate limited'), { statusCode: 429 }));
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(429);
  });

  it('returns 502 when the AI service throws an unexpected error', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('boom'));
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(502);
  });

  it('returns 502 when the AI output fails schema validation', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { name: 'bad', tasks: [] } } as never);
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
describe('POST /api/recovery-plan — rate limiting', () => {
  it('sets RateLimit headers on responses', async () => {
    const token = await makeToken();
    const res = await POST(makeRequest({ token, body: validBody }));
    expect(res.headers.get('RateLimit-Limit')).toBe('5');
    expect(res.headers.get('RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('RateLimit-Reset')).not.toBeNull();
  });

  it('returns 429 after the limit is exceeded for a single client IP', async () => {
    const token = await makeToken();
    const ip = '203.0.113.7';

    for (let i = 0; i < 5; i++) {
      const ok = await POST(makeRequest({ token, ip, body: validBody }));
      expect(ok.status).toBe(200);
    }

    const limited = await POST(makeRequest({ token, ip, body: validBody }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('RateLimit-Remaining')).toBe('0');
    expect(limited.headers.get('Retry-After')).not.toBeNull();
  });
});
