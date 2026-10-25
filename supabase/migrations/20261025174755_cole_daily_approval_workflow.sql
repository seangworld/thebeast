-- Cole-only, service-mediated workflow. No credentials or image bytes in SQL.
create table public.agency_cole_daily_controls (
 owner_id uuid primary key references auth.users(id),
 presenter_profile_id uuid not null,
 mode text not null default 'approval_required' check(mode='approval_required'),
 username text not null default 'cole.after.hours' check(username='cole.after.hours'),
 enabled boolean not null default false, paused boolean not null default true,
 epoch bigint not null default 0,
 monthly_limit_micros bigint not null default 10000000 check(monthly_limit_micros=10000000),
 timezone text not null default 'America/New_York' check(timezone='America/New_York'),
 hold_reason text, updated_at timestamptz not null default now(),
 foreign key(presenter_profile_id,owner_id) references public.beast_marketing_presenter_profiles(id,owner_id)
);
create table public.agency_cole_daily_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.agency_cole_daily_controls(owner_id),
 local_day date not null, state text not null default 'preparing' check(state in ('preparing','blocked','ready','scheduled','publishing','processing','published','rejected','unknown')),
 control_epoch bigint not null, reason text, theme text not null, caption text not null,
 post_id uuid unique references public.beast_marketing_agency_posts(id),
 media_path text, media_hash text, media_bytes bigint,
 scheduled_for timestamptz, publish_day date, approved_revision integer,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,local_day), unique(owner_id,publish_day),
 check(state not in ('ready','scheduled','publishing','processing','published') or (post_id is not null and media_path is not null and media_hash ~ '^[a-f0-9]{64}$' and media_bytes>0)),
 check(state not in ('scheduled','publishing','processing','published') or (scheduled_for is not null and publish_day is not null and approved_revision>0))
);
create table public.agency_cole_ai_reservations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.agency_cole_daily_controls(owner_id),
 job_id uuid not null unique references public.agency_cole_daily_jobs(id),
 month text not null check(month ~ '^\d{4}-\d{2}$'),
 maximum_micros bigint not null check(maximum_micros>0 and maximum_micros<=10000000),
 settled_micros bigint check(settled_micros>=0),
 state text not null default 'reserved' check(state in ('reserved','dispatched','settled','uncertain','released')),
 model text not null, pricing_version text not null,
 created_at timestamptz not null default now(), dispatched_at timestamptz, settled_at timestamptz,
 check((state='settled')=(settled_micros is not null))
);
create index agency_cole_daily_due on public.agency_cole_daily_jobs(scheduled_for) where state='scheduled';
create index agency_cole_ai_month on public.agency_cole_ai_reservations(owner_id,month);
-- One control-row lock serializes reservations, cancellation and authorization.
create function public.agency_cole_reserve(p_owner uuid,p_job uuid,p_maximum bigint,p_model text,p_pricing text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.agency_cole_daily_controls; j public.agency_cole_daily_jobs; total bigint; rid uuid; m text;
begin
 select * into c from public.agency_cole_daily_controls where owner_id=p_owner for update;
 if not found or not c.enabled or c.paused then raise exception 'paused'; end if;
 select * into j from public.agency_cole_daily_jobs where id=p_job and owner_id=p_owner for update;
 if not found or j.state<>'preparing' or j.control_epoch<>c.epoch then raise exception 'job_changed'; end if;
 if p_maximum is null or p_maximum<=0 or p_maximum>c.monthly_limit_micros then raise exception 'invalid_bound'; end if;
 if exists(select 1 from public.agency_cole_ai_reservations where owner_id=p_owner and state in ('dispatched','uncertain')) then raise exception 'spending_unresolved'; end if;
 m:=to_char(now() at time zone 'America/New_York','YYYY-MM');
 select coalesce(sum(case when state='settled' then settled_micros when state in ('reserved','dispatched','uncertain') then maximum_micros else 0 end),0) into total from public.agency_cole_ai_reservations where owner_id=p_owner and month=m;
 if total+p_maximum>c.monthly_limit_micros then raise exception 'budget_exhausted'; end if;
 insert into public.agency_cole_ai_reservations(owner_id,job_id,month,maximum_micros,model,pricing_version) values(p_owner,p_job,m,p_maximum,p_model,p_pricing) returning id into rid;
 return rid;
end $$;
create function public.agency_cole_dispatch(p_owner uuid,p_reservation uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.agency_cole_daily_controls; n integer;
begin
 select * into c from public.agency_cole_daily_controls where owner_id=p_owner for update;
 if not found or not c.enabled or c.paused then return false; end if;
 update public.agency_cole_ai_reservations r set state='dispatched',dispatched_at=now() from public.agency_cole_daily_jobs j where r.id=p_reservation and r.owner_id=p_owner and r.state='reserved' and r.month=to_char(now() at time zone 'America/New_York','YYYY-MM') and j.id=r.job_id and j.owner_id=p_owner and j.state='preparing' and j.control_epoch=c.epoch;
 get diagnostics n=row_count; return n=1;
end $$;
create function public.agency_cole_settle(p_owner uuid,p_reservation uuid,p_cost bigint) returns void language plpgsql security invoker set search_path='' as $$
declare r public.agency_cole_ai_reservations;
begin
 perform 1 from public.agency_cole_daily_controls where owner_id=p_owner for update;
 select * into r from public.agency_cole_ai_reservations where id=p_reservation and owner_id=p_owner for update;
 if not found or r.state<>'dispatched' then raise exception 'reservation_changed'; end if;
 if p_cost is null or p_cost<0 or p_cost>r.maximum_micros then
  update public.agency_cole_ai_reservations set state='uncertain' where id=r.id;
  update public.agency_cole_daily_controls set hold_reason='usage_unverified',paused=true,epoch=epoch+1 where owner_id=p_owner;
 else update public.agency_cole_ai_reservations set state='settled',settled_micros=p_cost,settled_at=now() where id=r.id; end if;
end $$;
alter table public.agency_cole_daily_controls enable row level security;
alter table public.agency_cole_daily_jobs enable row level security;
alter table public.agency_cole_ai_reservations enable row level security;
revoke all on public.agency_cole_daily_controls,public.agency_cole_daily_jobs,public.agency_cole_ai_reservations from public,anon,authenticated;
grant select,insert,update on public.agency_cole_daily_controls,public.agency_cole_daily_jobs,public.agency_cole_ai_reservations to service_role;
revoke all on function public.agency_cole_reserve(uuid,uuid,bigint,text,text),public.agency_cole_dispatch(uuid,uuid),public.agency_cole_settle(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.agency_cole_reserve(uuid,uuid,bigint,text,text),public.agency_cole_dispatch(uuid,uuid),public.agency_cole_settle(uuid,uuid,bigint) to service_role;
-- Update only the already-bound Cole profile with the exact approved PR302
-- reference. Do not grant brand/post approval, enable the profile or touch Leila.
update public.beast_marketing_presenter_profiles p
set visual_identity=jsonb_set(p.visual_identity,'{direction}',to_jsonb('Cole Mercer: mature, athletic, 6 ft 1 in proportions, dark tousled hair, trimmed beard, NO tattoos. Preserve the exact approved private ink-free coastal face. Daily original photo drafts only; every public post needs exact owner approval.'::text)),
 disclosure_rules=ARRAY['Fictional AI character: preserve required platform AI transparency and provider provenance metadata. Review disclosure for each exact post; no repeated caption sentence required by Agency.']::text[],
 updated_at=now()
where p.name='Cole Mercer' and p.presenter_type='future_character'
 and p.visual_identity->'canonicalAppearance'->>'sha256'='c84a2646f592c74d92430e33753b10b87a3c9cc6dec1eb8e3539383842a4e3bb'
 and exists(select 1 from public.beast_marketing_agency_bindings b where b.owner_id=p.owner_id and b.presenter_profile_id=p.id and b.expected_username='cole.after.hours' and b.channel='instagram');
