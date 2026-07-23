import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { HistoryList } from '@/components/HistoryList';

export const metadata: Metadata = {
  title: 'History | RecoveryApp',
  description: 'View your past recovery plan logs and mark them as done.',
};

// Always fetch fresh data — never serve a cached response for user logs.
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set');

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
  const data = await res.json() as { logs: Log[] };
  return data.logs;
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

  if (!session.userId) redirect('/auth/sign-in');

  const logs = await getLogs(session.token, session.userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recovery History</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your past recovery plan logs.
        </p>
      </div>
      <HistoryList logs={logs} onMarkDone={markDone} />
    </div>
  );
}
