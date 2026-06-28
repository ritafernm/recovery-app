import type { RecoveryPlan } from './recovery-plan.js';

export async function saveRecoveryPlan(plan: RecoveryPlan) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a Supabase key must be configured to save recovery plans.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/recovery_plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{ name: plan.name, plan_data: plan }]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save recovery plan in Supabase: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const [savedPlan] = Array.isArray(data) ? data : [data];

  if (!savedPlan?.id) {
    throw new Error('Supabase did not return a persisted recovery plan id.');
  }

  return { id: String(savedPlan.id) };
}
