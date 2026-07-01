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
  const { email, username, password } = req.body ?? {};

  if (!email || !username || !password) {
    res.status(400).json({ error: 'email, username, and password are required.' });
    return;
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify({ email, password, data: { username } }),
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
  const { email: emailInput, username, password } = req.body ?? {};

  if ((!emailInput && !username) || !password) {
    res.status(400).json({ error: 'email or username, and password are required.' });
    return;
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    let email: string = emailInput;

    if (!email && username) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        res.status(500).json({ error: 'Login request failed.', message: 'Supabase service role is not configured.' });
        return;
      }

      const lookupRes = await fetch(
        `${supabaseUrl}/rest/v1/users?select=email&username=eq.${encodeURIComponent(username as string)}&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (!lookupRes.ok) {
        res.status(500).json({ error: 'Login request failed.', message: 'Username lookup failed.' });
        return;
      }

      const rows = await lookupRes.json() as Array<{ email: string }>;
      const foundEmail = rows[0]?.email;
      if (!foundEmail) {
        res.status(400).json({ error: 'No account found with that username.' });
        return;
      }

      email = foundEmail;
    }

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

    const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      res.status(response.status).json({ error: data.error_description ?? data.msg ?? 'Logout failed.' });
      return;
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[logout]', message);
    res.status(500).json({ error: 'Logout request failed.', message });
  }
});
