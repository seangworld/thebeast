-- Apply only after the Director migration in the disposable synthetic database.
-- Simulate evidence retained from before this member's health module was disabled.
insert into public.beast_director_assignments(owner_id, goal_id, capability, result)
values ('00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'health.preparation-review', '{"sentinel":"DISABLED_MODULE_PRIVATE_SYNTHETIC"}');
