'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

export type AuthState = {
  error?: string;
  message?: string;
};

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  let data: Record<string, unknown>;
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    data = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      return { error: (data.error as string) ?? 'Login failed.' };
    }
  } catch {
    return { error: 'Could not reach the server. Please try again.' };
  }

  const token = data.access_token as string | undefined;
  if (!token) {
    return { error: 'Login failed: no token received.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // 7 days
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect('/');
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const username = (formData.get('username') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? '';

  if (!email || !username || !password) {
    return { error: 'Email, username, and password are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  let data: Record<string, unknown>;
  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    data = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      return { error: (data.error as string) ?? 'Signup failed.' };
    }
  } catch {
    return { error: 'Could not reach the server. Please try again.' };
  }

  redirect('/auth/sign-in?success=1');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Intentionally swallowed — proceed with local logout.
    }
  }

  cookieStore.delete('session_token');
  redirect('/auth/sign-in');
}
