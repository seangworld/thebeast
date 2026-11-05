-- Private durable delivery receipts; no account, username or profile backfill.
create table beast_identity.account_mail_outbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('username_assigned','username_recovery','owner_registration')),
 dedupe_key text not null unique,
 registration_email text, registration_at timestamptz, verified_at_creation boolean,
 return_path text not null default '/dashboard/settings/profile#account-username',
 state text not null default 'pending' check(state in ('pending','inflight','sent','uncertain')),
 delivery_token uuid, leased_at timestamptz, sent_at timestamptz,
 created_at timestamptz not null default now()
);
alter table beast_identity.account_mail_outbox enable row level security;
revoke all on beast_identity.account_mail_outbox from public,anon,authenticated;
create index account_mail_pending on beast_identity.account_mail_outbox(created_at,id) where state='pending';
create index account_mail_user on beast_identity.account_mail_outbox(user_id,kind,created_at);

create function beast_identity.queue_username_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key)
 values(new.user_id,'username_assigned','assignment:'||new.user_id::text) on conflict(dedupe_key) do nothing;
 return new;
exception when others then
 raise log 'BEAST_USERNAME_MAIL_QUEUE_FAILED code=%',sqlstate;
 return new;
end $$;
revoke all on function beast_identity.queue_username_confirmation() from public,anon,authenticated;
create trigger queue_username_confirmation after insert on beast_identity.usernames
for each row execute function beast_identity.queue_username_confirmation();

-- Record the registration event at canonical Auth INSERT, before verification/login.
-- Ignore editable app metadata: no origin is reported without trusted provenance.
create function beast_identity.queue_owner_registration() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key,registration_email,registration_at,verified_at_creation)
 values(new.id,'owner_registration','registration:'||new.id::text,new.email,new.created_at,new.email_confirmed_at is not null)
 on conflict(dedupe_key) do nothing;
 return new;
exception when others then
 raise log 'BEAST_OWNER_REGISTRATION_QUEUE_FAILED code=%',sqlstate;
 return new;
end $$;
revoke all on function beast_identity.queue_owner_registration() from public,anon,authenticated;
create trigger queue_owner_registration after insert on auth.users
for each row execute function beast_identity.queue_owner_registration();

-- Existing pg_net/Vault provide asynchronous wake-up after transaction commit.
-- No credential is embedded, created or copied by this migration. Without the
-- separately approved private Vault binding the wake-up remains disabled.
-- This is the dedicated BEAST_ACCOUNT_MAIL_DISPATCH_SECRET, never CRON_SECRET.
create function beast_identity.dispatch_account_mail() returns bigint
language plpgsql security definer set search_path='' as $$
declare dispatch_key text; request_id bigint; stamp text; nonce text; signature text; begin
 if not exists(select 1 from beast_identity.account_mail_outbox where state='pending') then return null; end if;
 if (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 minute')>=5
 or (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 hour')>=20
 or (select count(*) from beast_identity.account_mail_outbox where leased_at>now()-interval '1 day')>=20 then return null; end if;
 select decrypted_secret into dispatch_key from vault.decrypted_secrets
 where name='beast_account_mail_dispatch_secret' limit 1;
 if dispatch_key is null or length(dispatch_key)<64 then return null; end if;
 stamp:=floor(extract(epoch from clock_timestamp()))::bigint::text;
 nonce:=gen_random_uuid()::text;
 signature:=encode(extensions.hmac(stamp||'.'||nonce,dispatch_key,'sha256'),'hex');
 select net.http_post(
  url:='https://thebeast.seangworld.com/api/cron/account-mail',
  body:='{}'::jsonb,
  headers:=jsonb_build_object('Content-Type','application/json','x-beast-mail-time',stamp,'x-beast-mail-nonce',nonce,'x-beast-mail-signature',signature),
  timeout_milliseconds:=2000
 ) into request_id;
 return request_id;
exception when others then
 raise log 'BEAST_ACCOUNT_MAIL_WAKE_FAILED code=%',sqlstate;
 return null;
end $$;
revoke all on function beast_identity.dispatch_account_mail() from public,anon,authenticated;
create function beast_identity.wake_account_mail() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 perform beast_identity.dispatch_account_mail();
 return new;
exception when others then return new;
end $$;
revoke all on function beast_identity.wake_account_mail() from public,anon,authenticated;
create trigger wake_account_mail after insert on beast_identity.account_mail_outbox
for each row execute function beast_identity.wake_account_mail();

-- Service gateway only. Unknown/unverified/disabled recipients produce the same null result.
create function public.beast_account_mail_queue_recovery(p_email text,p_next text default '/dashboard/settings/profile#account-username') returns uuid
language plpgsql security definer set search_path='' as $$ declare selected_user uuid; safe_next text; begin
 select u.id into selected_user from auth.users u where lower(u.email)=lower(btrim(p_email))
 and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'is_disabled','false')<>'true'
 and lower(coalesce(u.raw_app_meta_data->>'account_status',''))<>'disabled';
 if selected_user is null then return null; end if;
 safe_next:=case when p_next ~ '^/(dashboard(/|$)|account-setup([?#]|$))' and position(chr(92) in p_next)=0 and p_next !~ '[[:cntrl:]]' then p_next else '/dashboard/settings/profile#account-username' end;
 insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key,return_path)
 values(selected_user,'username_recovery','recovery:'||selected_user::text||':'||floor(extract(epoch from now())/900)::bigint::text||':'||md5(safe_next),safe_next)
 on conflict(dedupe_key) do nothing;
 return selected_user;
end $$;

create function public.beast_account_mail_claim(p_user_id uuid default null,p_kind text default null,p_owner_email text default null)
returns table(mail_id uuid,delivery_token uuid,recipient text,username text,kind text,return_path text,registration_email text,registration_at timestamptz,verified_at_creation boolean)
language plpgsql security definer set search_path='' as $$ declare owner_recipient text; begin
 -- Recipient is server configuration, AND must be a current verified canonical admin.
 select u.email into owner_recipient from auth.users u join public.profiles p on p.id=u.id
 where lower(u.email)=lower(btrim(p_owner_email)) and p.role='admin'
 and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'is_disabled','false')<>'true'
 and lower(coalesce(u.raw_app_meta_data->>'account_status',''))<>'disabled' limit 1;
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
 and ((q.kind='owner_registration' and owner_recipient is not null) or
 (q.kind<>'owner_registration' and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now())
 and coalesce(u.raw_app_meta_data->>'is_disabled','false')<>'true'
 and lower(coalesce(u.raw_app_meta_data->>'account_status',''))<>'disabled'))
 order by q.created_at,q.id for update of q skip locked limit 1
 ), claimed as (
 update beast_identity.account_mail_outbox q set state='inflight',delivery_token=gen_random_uuid(),leased_at=now()
 from candidate c where q.id=c.id returning q.*
 ) select q.id,q.delivery_token,case when q.kind='owner_registration' then owner_recipient else u.email end,
 case when q.kind='owner_registration' then null else n.username end,q.kind,q.return_path,
 q.registration_email,q.registration_at,q.verified_at_creation from claimed q
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
revoke all on function public.beast_account_mail_claim(uuid,text,text) from public,anon,authenticated;
revoke all on function public.beast_account_mail_finish(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.beast_account_mail_queue_recovery(text,text) to service_role;
grant execute on function public.beast_account_mail_claim(uuid,text,text) to service_role;
grant execute on function public.beast_account_mail_finish(uuid,uuid,boolean) to service_role;
