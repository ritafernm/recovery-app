import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from 'jose';

export interface AuthenticatedRequest extends Request {
  userId: string;
  token: string;
}

// Cached JWKS fetcher — reused across requests to avoid refetching on every call
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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
    return;
  }

  const token = authHeader.slice(7);
  const alg = getTokenAlgorithm(token);

  try {
    let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];

    if (alg === 'HS256') {
      // Symmetric secret — used in tests
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({ error: 'Server configuration error', message: 'Auth service is not configured.' });
        return;
      }
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret)));
    } else {
      // Asymmetric (ES256, RS256) — verify via Supabase JWKS endpoint
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        res.status(500).json({ error: 'Server configuration error', message: 'Auth service is not configured.' });
        return;
      }
      ({ payload } = await jwtVerify(token, getJWKS(supabaseUrl)));
    }

    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Could not identify user from token.' });
      return;
    }

    (req as AuthenticatedRequest).userId = userId;
    (req as AuthenticatedRequest).token = token;
    next();
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token has expired.' });
      return;
    }
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token.' });
  }
}
