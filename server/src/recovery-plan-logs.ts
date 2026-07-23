function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export async function markLogDone(logId: string, userToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/recovery_plan_logs?id=eq.${encodeURIComponent(logId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${userToken}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_status: 'done', completed_at: new Date().toISOString() }),
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

export async function getUserLogs(userId: string, userToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/recovery_plan_logs?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${userToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch logs: ${response.status} ${errorText}`);
  }

  return response.json();
}
