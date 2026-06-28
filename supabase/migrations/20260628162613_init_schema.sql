-- 1. Create Users Table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  password text unique not null,
  api_token text, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Recovery Plans Table
create table public.recovery_plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  plan_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Logs Table
create table public.recovery_plan_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  plan_id uuid references public.recovery_plans(id),
  user_status text,
  completed_at timestamp with time zone default timezone('utc'::text, now())
);