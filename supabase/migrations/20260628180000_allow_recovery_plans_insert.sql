-- Allow inserts into recovery_plans.
create policy "Anyone can insert recovery plans" on public.recovery_plans
  for insert with check (true);
