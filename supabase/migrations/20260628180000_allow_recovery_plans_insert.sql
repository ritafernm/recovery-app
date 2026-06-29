-- Allow inserts into recovery_plans to authenticated users only
create policy "Authenticated users can insert recovery plans" on public.recovery_plans
  for insert with check (auth.uid() is not null);
