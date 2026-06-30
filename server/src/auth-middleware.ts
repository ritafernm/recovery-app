import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, errors as joseErrors } from 'jose';

export interface AuthenticatedRequest extends Request {
  userId: string;
  token: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
    return;
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error', message: 'Auth service is not configured.' });
    return;
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

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
