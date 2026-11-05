-- Private durable delivery receipts; no account, username or profile backfill.
create table beast_identity.account_mail_outbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('username_assigned','username_recovery')),
 dedupe_key text not null unique,
 return_path text not null default '/dashboard/settings/profile#account-username',
 state text not null default 'pending' check(state in ('pending','inflight','sent','uncertain')),
 delivery_token uuid, leased_at timestamptz, sent_at timestamptz,
 created_at timestamptz not null default now()
);
alter table beast_identity.account_mail_outbox enable row level security;
revoke all on beast_identity.account_mail_outbox from public,anon,authenticated;
create index account_mail_pending on beast_identity.account_mail_outbox(created_at) where state='pending';
create function beast_identity.queue_username_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key)
 values(new.user_id,'username_assigned','assignment:'||new.user_id::text) on conflict(dedupe_key) do nothing;
 return new;
end $$;
revoke all on function beast_identity.queue_username_confirmation() from public,anon,authenticated;
create trigger queue_username_confirmation after insert on beast_identity.usernames
for each row execute function beast_identity.queue_username_confirmation();

-- Service gateway only. Unknown/unverified/disabled recipients produce the same null result.
create function public.beast_account_mail_queue_recovery(p_email text,p_next text default '/dashboard/settings/profile#account-username') returns uuid
language plpgsql security definer set search_path='' as $$ declare selected_user uuid; safe_next text; begin
 select u.id into selected_user from auth.users u where lower(u.email)=lower(btrim(p_email))
 and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'is_disabled','false')<>'true'
 and lower(coalesce(u.raw_app_meta_data->>'account_status',''))<>'disabled';
 if selected_user is null then return null; end if;
 safe_next:=case when p_next ~ '^/(dashboard(/|$)|account-setup([?#]|$))' and position(chr(92) in p_next)=0 and p_next !~ '[[:cntrl:]]' then p_next else '/dashboard/settings/profile#account-username' end;
 insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key,return_path)
 values(selected_user,'username_recovery','recovery:'||selected_user::text||':'||floor(extract(epoch from now())/900)::bigint::text||':'||md5(safe_next),safe_next)
 on conflict(dedupe_key) do nothing;
 return selected_user;
end $$;

create function public.beast_account_mail_claim(p_user_id uuid default null,p_kind text default null)
returns table(mail_id uuid,delivery_token uuid,recipient text,username text,kind text,return_path text)
language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(hashtext('beast_account_mail_dispatch'));
 -- An interrupted SMTP exchange is ambiguous: never automatically resend it.
 update beast_identity.account_mail_outbox set state='uncertain'
 where state='inflight' and leased_at<now()-interval '5 minutes';
 if (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 minute')>=5
 or (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 hour')>=20
 or (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 day')>=20 then return; end if;
 return query with candidate as (
 select q.id from beast_identity.account_mail_outbox q join auth.users u on u.id=q.user_id
 where q.state='pending' and (p_user_id is null or q.user_id=p_user_id) and (p_kind is null or q.kind=p_kind)
 and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'is_disabled','false')<>'true'
 and lower(coalesce(u.raw_app_meta_data->>'account_status',''))<>'disabled'
 order by q.created_at,q.id for update of q skip locked limit 1
 ), claimed as (
 update beast_identity.account_mail_outbox q set state='inflight',delivery_token=gen_random_uuid(),leased_at=now()
 from candidate c where q.id=c.id returning q.*
 ) select q.id,q.delivery_token,u.email,n.username,q.kind,q.return_path from claimed q
 join auth.users u on u.id=q.user_id left join beast_identity.usernames n on n.user_id=q.user_id;
end $$;
create function public.beast_account_mail_finish(p_id uuid,p_token uuid,p_sent boolean) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 update beast_identity.account_mail_outbox set state=case when p_sent then 'sent' else 'uncertain' end,
 sent_at=case when p_sent then now() else null end
 where id=p_id and delivery_token=p_token and state='inflight';
 return found;
end $$;
revoke all on function public.beast_account_mail_queue_recovery(text,text) from public,anon,authenticated;
revoke all on function public.beast_account_mail_claim(uuid,text) from public,anon,authenticated;
revoke all on function public.beast_account_mail_finish(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.beast_account_mail_queue_recovery(text,text) to service_role;
grant execute on function public.beast_account_mail_claim(uuid,text) to service_role;
grant execute on function public.beast_account_mail_finish(uuid,uuid,boolean) to service_role;
