import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'History | RecoveryApp',
  description: 'View your past recovery plan logs and mark them as done.',
};

// Always fetch fresh data — never serve a cached response for user logs.
export const dynamic = 'force-dynamic';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

type Log = {
  id: string;
  plan_id: string;
  user_id: string;
  user_status: string | null;
  completed_at: string | null;
  created_at: string;
};

async function getLogs(token: string, userId: string): Promise<Log[]> {
  const res = await fetch(
    `${API_URL}/logs?userId=${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json() as Promise<Log[]>;
}

async function markDone(logId: string) {
  'use server';

  const session = await getSession();
  if (!session) redirect('/auth/sign-in');

  const res = await fetch(
    `${API_URL}/logs/${encodeURIComponent(logId)}/done`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.token}` },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to mark log done: ${res.status}`);
  }

  revalidatePath('/history');
}

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect('/auth/sign-in');

  let userId = '';
  try {
    const [, payloadB64] = session.token.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    if (typeof payload.sub === 'string') userId = payload.sub;
  } catch {
    // malformed token — treated as unauthenticated below
  }

  if (!userId) redirect('/auth/sign-in');

  const logs = await getLogs(session.token, userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recovery History</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your past recovery plan logs.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No logs yet. Complete a recovery plan to see your history here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Plan {log.plan_id}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Logged {new Date(log.created_at).toLocaleDateString()}
                </span>
                {log.completed_at && (
                  <span className="text-xs text-teal-600 dark:text-teal-400">
                    Completed {new Date(log.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {log.user_status !== 'done' ? (
                <form action={markDone.bind(null, log.id)}>
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700"
                  >
                    Mark done
                  </button>
                </form>
              ) : (
                <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Done
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
