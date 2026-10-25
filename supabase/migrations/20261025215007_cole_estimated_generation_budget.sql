-- Owner accepted an operating budget with possible provider billing overrun.
-- Backward compatible: maximum_micros/p_maximum are legacy names for ESTIMATES.
comment on column public.agency_cole_ai_reservations.maximum_micros is 'Conservative estimated reservation in micro-USD, not a provider billing maximum.';
alter table public.agency_cole_ai_reservations add column usage_counts jsonb;
alter table public.agency_cole_ai_reservations add column estimate_basis jsonb;
alter table public.agency_cole_daily_jobs add column provider_status integer;
alter table public.agency_cole_daily_jobs add column provider_error_code text;
create function public.agency_cole_claim_day(p_owner uuid,p_day date,p_theme text,p_caption text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare c public.agency_cole_daily_controls; j public.agency_cole_daily_jobs; jid uuid;
begin
 select * into c from public.agency_cole_daily_controls where owner_id=p_owner for update;
 if not found or not c.enabled or c.paused or c.hold_reason in ('usage_unverified','reservation_exceeded') then raise exception 'paused'; end if;
 if p_day<>(now() at time zone 'America/New_York')::date then raise exception 'day_changed'; end if;
 insert into public.agency_cole_daily_jobs(owner_id,local_day,control_epoch,theme,caption) values(p_owner,p_day,c.epoch,p_theme,p_caption) on conflict(owner_id,local_day) do nothing returning id into jid;
 if jid is not null then return jid; end if;
 select * into j from public.agency_cole_daily_jobs where owner_id=p_owner and local_day=p_day for update;
 -- Only resume the old no-dispatch pricing hold. This is not a generation retry.
 if j.state='blocked' and j.reason='request_cost_bound_unverified' and j.post_id is null
 and not exists(select 1 from public.agency_cole_ai_reservations where job_id=j.id) then
  update public.agency_cole_daily_jobs set state='preparing',reason=null,control_epoch=c.epoch,theme=p_theme,caption=p_caption,updated_at=now() where id=j.id;
  return j.id;
 end if;
 return null;
end $$;
create or replace function public.agency_cole_reserve(p_owner uuid,p_job uuid,p_maximum bigint,p_model text,p_pricing text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.agency_cole_daily_controls; j public.agency_cole_daily_jobs; total bigint; rid uuid; m text;
begin
 select * into c from public.agency_cole_daily_controls where owner_id=p_owner for update;
 if not found or not c.enabled or c.paused or c.hold_reason in ('usage_unverified','reservation_exceeded') then raise exception 'paused'; end if;
 select * into j from public.agency_cole_daily_jobs where id=p_job and owner_id=p_owner for update;
 if not found or j.state<>'preparing' or j.control_epoch<>c.epoch then raise exception 'job_changed'; end if;
 if p_maximum is distinct from 250000 or p_model<>'gpt-image-2.5-flare-2026-09-08' or p_pricing<>'2026-10-25' then raise exception 'invalid_estimate'; end if;
 if now() at time zone 'UTC'>=timestamp '2026-11-25' then raise exception 'pricing_review_required'; end if;
 if exists(select 1 from public.agency_cole_ai_reservations where owner_id=p_owner and state in ('dispatched','uncertain')) then raise exception 'spending_unresolved'; end if;
 m:=to_char(now() at time zone 'America/New_York','YYYY-MM');
 select coalesce(sum(case when state='settled' then settled_micros when state in ('reserved','dispatched','uncertain') then maximum_micros else 0 end),0) into total from public.agency_cole_ai_reservations where owner_id=p_owner and month=m;
 if total+p_maximum>c.monthly_limit_micros then raise exception 'budget_exhausted'; end if;
 insert into public.agency_cole_ai_reservations(owner_id,job_id,month,maximum_micros,model,pricing_version,estimate_basis)
 values(p_owner,p_job,m,p_maximum,p_model,p_pricing,'{"policy":"estimated_reservation_v1","prompt_tokens_assumed":2000,"reference_tokens_assumed":10000,"output_tokens_estimated":196,"text_rate_micros":5,"image_input_rate_micros":8,"image_output_rate_micros":30,"headroom_micros":154120,"billing_overrun_possible":true}') returning id into rid;
 return rid;
end $$;
create or replace function public.agency_cole_dispatch(p_owner uuid,p_reservation uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.agency_cole_daily_controls; n integer;
begin
 select * into c from public.agency_cole_daily_controls where owner_id=p_owner for update;
 if not found or not c.enabled or c.paused or c.hold_reason in ('usage_unverified','reservation_exceeded') then return false; end if;
 if exists(select 1 from public.agency_cole_ai_reservations where owner_id=p_owner and id<>p_reservation and state in ('dispatched','uncertain')) then return false; end if;
 update public.agency_cole_ai_reservations r set state='dispatched',dispatched_at=now() from public.agency_cole_daily_jobs j where r.id=p_reservation and r.owner_id=p_owner and r.state='reserved' and r.month=to_char(now() at time zone 'America/New_York','YYYY-MM') and j.id=r.job_id and j.owner_id=p_owner and j.state='preparing' and j.local_day=(now() at time zone 'America/New_York')::date and j.control_epoch=c.epoch;
 get diagnostics n=row_count; return n=1;
end $$;
create function public.agency_cole_settle_estimate(p_owner uuid,p_reservation uuid,p_usage jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.agency_cole_ai_reservations; cost bigint; reason text; k text; valid boolean;
begin
 perform 1 from public.agency_cole_daily_controls where owner_id=p_owner for update;
 select * into r from public.agency_cole_ai_reservations where id=p_reservation and owner_id=p_owner for update;
 if not found or r.state not in ('dispatched','settled','uncertain') then raise exception 'reservation_changed'; end if;
 if r.state<>'dispatched' then return jsonb_build_object('state',r.state,'cost_micros',r.settled_micros,'pause_reason',case when r.state='uncertain' then 'usage_unverified' when r.settled_micros>r.maximum_micros then 'reservation_exceeded' else null end); end if;
 valid:=p_usage is not null and jsonb_typeof(p_usage)='object' and r.model='gpt-image-2.5-flare-2026-09-08' and r.pricing_version='2026-10-25';
 foreach k in array array['textInputTokens','imageInputTokens','imageOutputTokens'] loop
  if coalesce(jsonb_typeof(p_usage->k),'null')<>'number' or coalesce(p_usage->>k,'') !~ '^[0-9]+$' then valid:=false;
  elsif (p_usage->>k)::numeric>1000000000 then valid:=false; end if;
 end loop;
 if valid then
  cost:=(p_usage->>'textInputTokens')::bigint*5+(p_usage->>'imageInputTokens')::bigint*8+(p_usage->>'imageOutputTokens')::bigint*30;
  update public.agency_cole_ai_reservations set state='settled',settled_micros=cost,usage_counts=jsonb_build_object('textInputTokens',p_usage->'textInputTokens','imageInputTokens',p_usage->'imageInputTokens','imageOutputTokens',p_usage->'imageOutputTokens'),settled_at=now() where id=r.id;
  if cost>r.maximum_micros then reason:='reservation_exceeded'; end if;
 else
  reason:='usage_unverified';
  update public.agency_cole_ai_reservations set state='uncertain' where id=r.id;
 end if;
 -- Automatic spending pause keeps the epoch: received media can still be
 -- retained privately. Explicit owner pause changes epoch and stops that save.
 if reason is not null then update public.agency_cole_daily_controls set paused=true,hold_reason=reason,updated_at=now() where owner_id=p_owner; end if;
 return jsonb_build_object('state',case when valid then 'settled' else 'uncertain' end,'cost_micros',cost,'pause_reason',reason);
end $$;
revoke all on function public.agency_cole_claim_day(uuid,date,text,text),public.agency_cole_settle_estimate(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.agency_cole_claim_day(uuid,date,text,text),public.agency_cole_settle_estimate(uuid,uuid,jsonb) to service_role;
-- Clear only the obsolete guarantee hold; never clear usage/owner pauses.
update public.agency_cole_daily_controls set hold_reason=null where hold_reason='request_cost_bound_unverified';
