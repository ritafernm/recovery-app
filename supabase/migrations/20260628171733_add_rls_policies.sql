-- 1. Enable RLS
alter table public.users enable row level security;
alter table public.recovery_plans enable row level security;
alter table public.recovery_plan_logs enable row level security;

-- 2. Policy Definition

-- Users: Users can only see their own profile
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

-- Recovery Plans: Users can view all, but only insert/update their own (if needed)
create policy "Users can view recovery plans" on public.recovery_plans
  for select using (true);

-- Logs: Users can only see their own logs
create policy "Users can view own logs" on public.recovery_plan_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own logs" on public.recovery_plan_logs
  for insert with check (auth.uid() = user_id);

-- 3. Grant Privileges
grant usage on schema public to authenticated;
grant all on public.users to authenticated;
grant all on public.recovery_plans to authenticated;
grant all on public.recovery_plan_logs to authenticated;