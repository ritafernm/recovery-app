import type { Request, Response, NextFunction } from 'express';

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
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error', message: 'Auth service is not configured.' });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!response.ok) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token.' });
      return;
    }

    const user = await response.json();

    if (!user?.id) {
      res.status(401).json({ error: 'Unauthorized', message: 'Could not identify user from token.' });
      return;
    }

    (req as AuthenticatedRequest).userId = user.id as string;
    (req as AuthenticatedRequest).token = token;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Token verification failed.' });
  }
}
