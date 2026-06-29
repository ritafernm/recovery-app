import { config } from 'dotenv';

config();

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a Supabase key must be configured.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/recovery_plans?select=id,name,plan_data,created_at&order=created_at.desc`, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Select failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exitCode = 1;
});
