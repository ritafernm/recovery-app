-- Add missing created_at column to recovery_plan_logs
alter table public.recovery_plan_logs
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
