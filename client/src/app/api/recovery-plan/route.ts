import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RecoveryPlanSchema } from '@/lib/schema';

const RequestSchema = z.object({
  description: z.string().min(1),
  muscleSoreness: z.number().int().min(0).max(5),
  mentalStress: z.number().int().min(0).max(5),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const COUNTABLE_STATUSES = new Set([200, 201, 401, 500, 502, 503, 504]);

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getRateLimitEntry(ip: string): RateLimitEntry {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);
  if (!existing || existing.resetAt <= now) {
    const fresh: RateLimitEntry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(ip, fresh);
    return fresh;
  }
  return existing;
}

function applyRateLimitHeaders(res: NextResponse, entry: RateLimitEntry): void {
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const resetSeconds = Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
  res.headers.set('RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.headers.set('RateLimit-Remaining', String(remaining));
  res.headers.set('RateLimit-Reset', String(resetSeconds));
  if (res.status === 429) {
    res.headers.set('Retry-After', String(resetSeconds));
  }
}

// --- Authentication (real JWT verification, mirrors the server's requireAuth) ---
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

function getTokenAlgorithm(token: string): string | undefined {
  try {
    const part = token.split('.')[0];
    if (!part) return undefined;
    return JSON.parse(Buffer.from(part, 'base64url').toString()).alg;
  } catch {
    return undefined;
  }
}

type AuthResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; response: NextResponse };

async function authenticate(req: NextRequest): Promise<AuthResult> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required.' },
        { status: 401 }
      ),
    };
  }

  const alg = getTokenAlgorithm(token);

  try {
    let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];

    if (alg === 'HS256') {
      // Symmetric secret — used in tests / local development
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (!jwtSecret) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Server configuration error', message: 'Auth service is not configured.' },
            { status: 500 }
          ),
        };
      }
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret)));
    } else {
      // Asymmetric (ES256, RS256) — verify via Supabase JWKS endpoint
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Server configuration error', message: 'Auth service is not configured.' },
            { status: 500 }
          ),
        };
      }
      ({ payload } = await jwtVerify(token, getJWKS(supabaseUrl)));
    }

    const userId = payload.sub;
    if (!userId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Unauthorized', message: 'Could not identify user from token.' },
          { status: 401 }
        ),
      };
    }

    return { ok: true, userId, token };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token.' },
        { status: 401 }
      ),
    };
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const entry = getRateLimitEntry(ip);

  if (entry.count >= RATE_LIMIT_MAX) {
    const res = NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
    applyRateLimitHeaders(res, entry);
    return res;
  }

  const res = await handleRequest(req);

  // Only count requests that resulted in a "successful" status (skipFailedRequests).
  if (COUNTABLE_STATUSES.has(res.status)) {
    entry.count += 1;
  }
  applyRateLimitHeaders(res, entry);
  return res;
}

async function handleRequest(req: NextRequest): Promise<NextResponse> {
  // Reject unauthenticated requests before doing any expensive work (e.g. the Anthropic call).
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { userId, token } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { description, muscleSoreness, mentalStress } = parsed.data;

  let object: unknown;
  try {
    ({ object } = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: RecoveryPlanSchema,
      prompt: `You are a certified sports-recovery coach. A user has submitted the following symptoms:

Description: ${description}
Muscle soreness: ${muscleSoreness}/5
Mental stress: ${mentalStress}/5

Generate a personalised recovery plan for today. Each task must belong to one of the categories: physical, mental, or biophysical.
Return structured JSON that matches the schema exactly.`,
    }));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      return NextResponse.json(
        { error: 'The AI service is rate-limited. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    console.error('generateObject failed', err);
    return NextResponse.json(
      { error: 'The AI service is currently unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }

  const validated = RecoveryPlanSchema.safeParse(object);
  if (!validated.success) {
    console.error('AI output failed schema validation', validated.error.flatten());
    return NextResponse.json({ error: 'AI returned an invalid recovery plan. Please try again.' }, { status: 502 });
  }

  const plan = validated.data;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      // Save the plan to recovery_plans.
      // Authorize as the end user (their JWT) so Row Level Security stays enforced.
      // The anon key is only the gateway apikey — it does NOT grant elevated access.
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/recovery_plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify([{ name: plan.name, plan_data: plan }]),
      });

      if (!dbRes.ok) {
        console.error('Failed to save recovery plan to database:', dbRes.status, await dbRes.text());
      } else {
        const savedData = await dbRes.json();
        const [savedPlan] = Array.isArray(savedData) ? savedData : [savedData];

        if (savedPlan?.id) {
          // Create a log entry with no user_status (not done yet) for the authenticated user.
          const logRes = await fetch(`${supabaseUrl}/rest/v1/recovery_plan_logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${token}`,
              Prefer: 'return=representation',
            },
            body: JSON.stringify([{ plan_id: savedPlan.id, user_id: userId }]),
          });
          if (!logRes.ok) {
            console.error('Failed to create recovery plan log:', logRes.status, await logRes.text());
          }
        }
      }
    } catch (err) {
      console.error('Error persisting recovery plan:', err);
    }
  } else {
    console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not configured — recovery plan not persisted.');
  }

  return NextResponse.json(plan);
}
