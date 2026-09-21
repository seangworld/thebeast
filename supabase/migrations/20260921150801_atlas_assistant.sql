begin;
create table public.atlas_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('memory','task')), body text not null check(length(body) between 1 and 4000),
 completed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index atlas_records_owner on public.atlas_records(owner_id,created_at desc);
create table public.atlas_turns (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 question text not null check(length(question) between 1 and 4000), answer text, evidence jsonb,
 status text not null default 'queued' check(status in ('queued','processing','completed','failed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index atlas_turns_queue on public.atlas_turns(created_at) where status='queued';
create index atlas_turns_owner on public.atlas_turns(owner_id,created_at desc);
create table public.atlas_devices (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique, label text not null check(length(label) between 1 and 80),
 created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz
);
create index atlas_devices_owner on public.atlas_devices(owner_id);
create table public.atlas_usage (
 owner_id uuid not null references auth.users(id) on delete cascade, day date not null default current_date,
 category text not null check(category in ('turn','speech','transcribe')), calls integer not null default 0,
 primary key(owner_id,day,category)
);
alter table public.atlas_records enable row level security;
alter table public.atlas_turns enable row level security;
alter table public.atlas_devices enable row level security;
alter table public.atlas_usage enable row level security;
revoke all on public.atlas_records,public.atlas_turns,public.atlas_devices,public.atlas_usage from public,anon,authenticated;
grant all on public.atlas_records,public.atlas_turns,public.atlas_devices,public.atlas_usage to service_role;
create function public.atlas_reserve_call(p_owner uuid,p_category text) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer; cap integer;
begin
 if not exists(select 1 from public.profiles where id=p_owner and role='admin') then return false; end if;
 cap := case p_category when 'turn' then 100 when 'speech' then 100 when 'transcribe' then 100 else 0 end;
 if cap=0 then return false; end if;
 insert into public.atlas_usage(owner_id,day,category,calls) values(p_owner,current_date,p_category,1)
 on conflict(owner_id,day,category) do update set calls=atlas_usage.calls+1 where atlas_usage.calls<cap returning calls into n;
 return n is not null;
end; $$;
revoke all on function public.atlas_reserve_call(uuid,text) from public,anon,authenticated;
grant execute on function public.atlas_reserve_call(uuid,text) to service_role;
commit;
