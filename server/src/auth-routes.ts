import express from 'express';
import type { Request, Response } from 'express';

function getAuthConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth is not configured.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const authRouter = express.Router();

authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required.' });
    return;
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error_description ?? data.msg ?? 'Signup failed.' });
      return;
    }

    res.status(201).json({
      message: 'Signup successful. Check your email to confirm your account.',
      user: data.user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[signup]', message);
    res.status(500).json({ error: 'Signup request failed.', message });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required.' });
    return;
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error_description ?? data.msg ?? 'Login failed.' });
      return;
    }

    res.json({
      message: 'Login successful.',
      access_token: data.access_token as string,
      user: { id: data.user?.id as string, email: data.user?.email as string },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[login]', message);
    res.status(500).json({ error: 'Login request failed.', message });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(400).json({ error: 'No token provided.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[logout]', message);
    res.status(500).json({ error: 'Logout request failed.', message });
  }
});
