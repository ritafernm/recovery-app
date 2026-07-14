const API_URL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
  console.error('⚠️ NEXT_PUBLIC_API_URL is missing in production — API calls will fail');
}

export type Log = {
  id: string;
  plan_id: string;
  user_id: string;
  user_status: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function viewHistory(token: string, userId: string): Promise<Log[]> {
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

export function withMarkDone(logs: Log[], logId: string): Log[] {
  return logs.map((log) =>
    log.id === logId
      ? { ...log, user_status: 'done', completed_at: new Date().toISOString() }
      : log,
  );
}

export async function markDone(token: string, logId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/logs/${encodeURIComponent(logId)}/done`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Failed to mark log done: ${res.status}`);
}
