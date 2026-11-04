-- Database acceptance only. Synthetic users never commit; no email is sent.
-- Run on the explicitly selected project AFTER the registry migration.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create temporary table auth_acceptance_baseline as
select 'users' as name, md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) as digest from auth.users t
union all select 'profiles',md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) from public.profiles t;
do $$
declare legacy uuid:=gen_random_uuid(); tagged uuid:=gen_random_uuid(); collision uuid:=gen_random_uuid();
  label text:='qa_'||substr(replace(gen_random_uuid()::text,'-',''),1,25);
  original_triggers text;
begin
  if not (select bool_and(relrowsecurity) from pg_class where oid in ('beast_identity.usernames'::regclass,'beast_identity.attempts'::regclass)) then raise exception 'Registry RLS disabled'; end if;
  insert into auth.users(id,raw_user_meta_data,email_confirmed_at) values(legacy,'{}',now());
  if not exists(select 1 from public.profiles where id=legacy and role='user' and not onboarding_complete) then raise exception 'Untagged profile behavior changed'; end if;
  if exists(select 1 from beast_identity.usernames where user_id=legacy) then raise exception 'Unexpected untagged username'; end if;
  insert into auth.users(id,raw_user_meta_data) values(tagged,jsonb_build_object('beast_username',upper(label)));
  if not exists(select 1 from public.profiles where id=tagged) or public.beast_auth_identity(label) is distinct from tagged then raise exception 'Tagged signup failed'; end if;
  begin
    insert into auth.users(id,raw_user_meta_data) values(collision,jsonb_build_object('beast_username',label));
    raise exception 'Duplicate username accepted';
  exception when unique_violation then null;
  end;
  if exists(select 1 from auth.users where id=collision) or exists(select 1 from public.profiles where id=collision) then raise exception 'Collision did not roll back'; end if;
  update auth.users set raw_user_meta_data=jsonb_build_object('beast_username',label||'x') where id=tagged;
  if public.beast_auth_identity(label) is distinct from tagged then raise exception 'Metadata remapped identity'; end if;
  perform public.beast_auth_claim(label||'a',legacy);
  if public.beast_auth_identity(label||'a') is distinct from legacy then raise exception 'Existing verified account claim failed'; end if;
  begin
    perform public.beast_auth_claim(label||'b',tagged);
    raise exception 'Unverified claim accepted';
  exception when raise_exception then
    if sqlerrm <> 'Verified account required' then raise; end if;
  end;
  if not public.beast_auth_attempt(repeat('a',64),1) or public.beast_auth_attempt(repeat('a',64),1) then raise exception 'Limiter failed'; end if;
  -- Rehearse the rollback of ONLY the new trigger, inside this transaction.
  select string_agg(pg_get_triggerdef(oid),',' order by tgname) into original_triggers from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal and tgname<>'beast_register_username';
  execute 'drop trigger beast_register_username on auth.users';
  if original_triggers is distinct from (select string_agg(pg_get_triggerdef(oid),',' order by tgname) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal) then raise exception 'Rollback changed existing triggers'; end if;
  insert into auth.users(id,raw_user_meta_data) values(collision,jsonb_build_object('beast_username',label));
  if not exists(select 1 from public.profiles where id=collision) or exists(select 1 from beast_identity.usernames where user_id=collision) then raise exception 'Rollback disrupted legacy signup'; end if;
end;
$$;
set local role anon;
do $$
declare statement text;
begin
  foreach statement in array array[
    'select * from beast_identity.usernames',
    'select * from beast_identity.attempts',
    'select public.beast_auth_identity(''qa_unknown'')',
    'select public.beast_auth_claim(''qa_unknown'',gen_random_uuid())',
    'select public.beast_auth_attempt(repeat(''b'',64),10)'
  ] loop
    begin execute statement; raise exception 'Anonymous access unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
declare statement text;
begin
  foreach statement in array array[
    'select * from beast_identity.usernames',
    'select * from beast_identity.attempts',
    'select public.beast_auth_identity(''qa_unknown'')',
    'select public.beast_auth_claim(''qa_unknown'',gen_random_uuid())',
    'select public.beast_auth_attempt(repeat(''b'',64),10)'
  ] loop
    begin execute statement; raise exception 'Authenticated registry access unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  end loop;
  if exists(select 1 from public.profiles) then raise exception 'Unrelated profiles exposed'; end if;
  if to_regclass('public.beastguide_library') is not null then
    if exists(select 1 from public.beastguide_library) or exists(select 1 from public.beastguide_episode_progress) then raise exception 'Unrelated BeastGuide records exposed'; end if;
  end if;
end;
$$;
reset role;
rollback;
select 'PASS: tagged/untagged signup, uniqueness, claims, rate limit, RLS denial, unrelated-owner isolation and trigger rollback; all fixture writes rolled back' as result;
