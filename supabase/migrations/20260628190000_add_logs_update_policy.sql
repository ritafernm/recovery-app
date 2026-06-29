-- Allow authenticated users to update their own logs
create policy "Authenticated users can update own logs" on public.recovery_plan_logs
  for update using (auth.uid() = user_id);
