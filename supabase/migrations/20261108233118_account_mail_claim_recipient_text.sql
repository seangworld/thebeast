-- Focused recipient eligibility correction; no rows/roles/grants/schedules changed.
-- Keep the deployed migration immutable. Replace only its existing claim function.
create or replace function public.beast_account_mail_claim(p_user_id uuid default null,p_kind text default null,p_owner_email text default null)
returns table(mail_id uuid,delivery_token uuid,recipient text,username text,kind text,return_path text,registration_email text,registration_at timestamptz,verified_at_creation boolean)
language plpgsql security definer set search_path='' as $$ declare owner_recipient text; begin
 -- Service-only caller supplies the private owner-approved server configuration.
 -- Receiving a notice grants no administrative permissions.
 select u.email into owner_recipient from auth.users u
 where lower(u.email)=lower(btrim(p_owner_email))
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
 ) select q.id,q.delivery_token,case when q.kind='owner_registration' then owner_recipient else u.email end::text,
 case when q.kind='owner_registration' then null else n.username end,q.kind,q.return_path,
 q.registration_email,q.registration_at,q.verified_at_creation from claimed q
 join auth.users u on u.id=q.user_id left join beast_identity.usernames n on n.user_id=q.user_id;
end $$;
