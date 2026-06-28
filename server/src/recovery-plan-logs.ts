export async function markLogDone(logId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a Supabase key must be configured.');
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/recovery_plan_logs?id=eq.${encodeURIComponent(logId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_status: 'done' }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update log: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const [updated] = Array.isArray(data) ? data : [data];

  if (!updated?.id) {
    throw new Error('Log not found.');
  }

  return updated;
}

export async function getUserLogs(userId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a Supabase key must be configured.');
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/recovery_plan_logs?user_id=eq.${encodeURIComponent(userId)}&order=completed_at.desc`,
    {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch logs: ${response.status} ${errorText}`);
  }

  return response.json();
}
