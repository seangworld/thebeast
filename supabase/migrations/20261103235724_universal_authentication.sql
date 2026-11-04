-- Additive opt-in foundation. Existing profiles and auth identities are untouched.
create schema if not exists beast_identity;
revoke all on schema beast_identity from public, anon, authenticated;
grant usage on schema beast_identity to service_role;

create table beast_identity.usernames (
  username text primary key check (username ~ '^[a-z][a-z0-9_]{2,31}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table beast_identity.usernames enable row level security;
-- No client policies or grants. The service gateway is the only reader/writer.
create table beast_identity.attempts (
  bucket text primary key,
  started_at timestamptz not null,
  attempts integer not null
);
alter table beast_identity.attempts enable row level security;

-- Called only by the auth.users INSERT trigger. Metadata is a registration
-- request, never an authorization claim, and cannot mutate an existing mapping.
create function beast_identity.register_username() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'beast_username' then
    insert into beast_identity.usernames(username, user_id)
    values (lower(btrim(new.raw_user_meta_data->>'beast_username')), new.id);
  end if;
  return new;
end;
$$;
revoke all on function beast_identity.register_username() from public, anon, authenticated;
create trigger beast_register_username after insert on auth.users
for each row execute function beast_identity.register_username();

-- Public RPC wrappers are explicitly service-only; private schema is not exposed.
create function public.beast_auth_identity(p_username text) returns uuid
language sql security definer set search_path = '' as $$
  select user_id from beast_identity.usernames where username = p_username;
$$;
create function public.beast_auth_claim(p_username text, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and email_confirmed_at is not null) then
    raise exception 'Verified account required';
  end if;
  insert into beast_identity.usernames(username, user_id) values(p_username, p_user_id);
end;
$$;
-- Atomic, shared across instances. Account bucket stops distributed guessing;
-- network bucket stops spraying. Opaque HMAC keys contain no credentials or IPs.
create function public.beast_auth_attempt(p_bucket text, p_limit integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if length(p_bucket) <> 64 or p_limit < 1 or p_limit > 100 then return false; end if;
  insert into beast_identity.attempts as a values(p_bucket, clock_timestamp(), 1)
  on conflict(bucket) do update set
    attempts = case when a.started_at < clock_timestamp() - interval '15 minutes' then 1 else a.attempts + 1 end,
    started_at = case when a.started_at < clock_timestamp() - interval '15 minutes' then clock_timestamp() else a.started_at end
  returning attempts into n;
  -- Bounded retention; no identifiers are retained beyond inactive windows.
  delete from beast_identity.attempts where started_at < clock_timestamp() - interval '1 day';
  return n <= p_limit;
end;
$$;
revoke all on function public.beast_auth_identity(text) from public, anon, authenticated;
revoke all on function public.beast_auth_claim(text, uuid) from public, anon, authenticated;
revoke all on function public.beast_auth_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.beast_auth_identity(text) to service_role;
grant execute on function public.beast_auth_claim(text, uuid) to service_role;
grant execute on function public.beast_auth_attempt(text, integer) to service_role;
