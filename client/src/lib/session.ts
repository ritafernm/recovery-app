import { cookies } from 'next/headers';

export type Session = {
  token: string;
  email: string | null;
  userId: string | null;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  // Decode the JWT payload (no signature verification — display only).
  try {
    const [, payloadB64] = token.split('.');
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as Record<string, unknown>;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    return { token, email, userId };
  } catch {
    // Malformed token — treat as unauthenticated.
    return null;
  }
}
