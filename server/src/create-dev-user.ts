import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const email = process.argv[2] ?? 'dev@recovery.local';
const username = process.argv[3] ?? 'dev-user';

async function main() {
  // 1. Create user in auth.users via Supabase Admin API
  const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey!,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ email, password: 'dev-password-123!', email_confirm: true }),
  });

  if (!authRes.ok) {
    const err = await authRes.text();
    throw new Error(`Failed to create auth user: ${authRes.status} ${err}`);
  }

  const authUser = await authRes.json();
  const userId: string = authUser.id;
  console.log(`Auth user created: ${userId}`);

  // 2. Insert into public.users
  const dbRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey!,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{ id: userId, email, username }]),
  });

  if (!dbRes.ok) {
    const err = await dbRes.text();
    throw new Error(`Failed to insert into public.users: ${dbRes.status} ${err}`);
  }

  console.log('\nDev user ready. Add this to server/src/.env:');
  console.log(`USER_UUID=${userId}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
