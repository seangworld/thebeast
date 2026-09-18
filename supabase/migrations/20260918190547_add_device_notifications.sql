-- Device delivery is opt-in. Credentials and endpoints are server-only.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table public.beast_push_config (
  id boolean primary key default true check (id),
  public_key text,
  private_key text,
  scheduler_token text not null default (gen_random_uuid()::text || gen_random_uuid()::text),
  dispatch_url text,
  enabled boolean not null default false,
  last_run_at timestamptz
);
insert into public.beast_push_config(id) values(true);
alter table public.beast_push_config enable row level security;
revoke all on public.beast_push_config from public, anon, authenticated;
grant all on public.beast_push_config to service_role;

create table public.beast_push_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null unique,
  subscription jsonb not null,
  label text not null default 'My device' check (length(label) between 1 and 80),
  enabled boolean not null default true,
  due_today boolean not null default true,
  due_tomorrow boolean not null default true,
  messages_enabled boolean not null default true,
  message_cursor timestamptz not null default now(),
  quiet_start integer not null default 22 check (quiet_start between 0 and 23),
  quiet_end integer not null default 7 check (quiet_end between 0 and 23),
  last_checked_at timestamptz,
  show_details boolean not null default false,
  notify_hour integer not null default 9 check (notify_hour between 0 and 23),
  time_zone text not null default 'America/New_York',
  last_test_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index beast_push_devices_owner_idx on public.beast_push_devices(owner_id);
create index beast_push_devices_schedule_idx on public.beast_push_devices(last_checked_at nulls first) where enabled;
alter table public.beast_push_devices enable row level security;
revoke all on public.beast_push_devices from public, anon, authenticated;
grant all on public.beast_push_devices to service_role;

create table public.beast_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.beast_push_devices(id) on delete cascade,
  event_key text not null,
  state text not null check (state in ('sending','sent','failed')),
  attempts integer not null default 1,
  retry_after timestamptz not null default (now() + interval '10 minutes'),
  error_category text,
  created_at timestamptz not null default now(),
  unique(device_id,event_key)
);
create index beast_push_deliveries_cleanup_idx on public.beast_push_deliveries(created_at);
alter table public.beast_push_deliveries enable row level security;
revoke all on public.beast_push_deliveries from public, anon, authenticated;
grant all on public.beast_push_deliveries to service_role;

-- The deployed server verifies this private token. No request is made until activated.
select cron.schedule('beast-device-reminders', '*/5 * * * *', $job$
  select net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || scheduler_token),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) from public.beast_push_config where id and enabled and dispatch_url is not null;
$job$);
