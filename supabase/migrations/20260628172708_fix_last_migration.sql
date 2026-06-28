-- Fix the last migration by granting the necessary permissions 
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.recovery_plans to authenticated;
grant select, insert, update, delete on public.recovery_plan_logs to authenticated;

grant select, insert, update, delete on public.recovery_plans to service_role;
grant select, insert, update, delete on public.recovery_plan_logs to service_role;
grant select, insert, update, delete on public.users to service_role;