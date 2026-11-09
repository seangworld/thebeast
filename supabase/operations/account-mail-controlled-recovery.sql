-- Temporary, separately approved controlled test. Installation never claims mail.
create function public.beast_account_mail_claim_controlled_recovery()
returns table(mail_id uuid, delivery_token uuid, recipient text, username text,
 kind text, return_path text, registration_email text, registration_at timestamptz,
 verified_at_creation boolean)
language plpgsql security definer set search_path='' as $$
declare
 target_id uuid;
 target_user uuid;
begin
 -- Match the existing claim lock order. Block queue writes while proving
 -- that the existing user-and-kind claim can only select the approved row.
 perform pg_advisory_xact_lock(hashtext('beast_account_mail_dispatch'));
 lock table beast_identity.account_mail_outbox in share row exclusive mode;
 if (select count(*) from beast_identity.account_mail_outbox
     where encode(sha256(convert_to(id::text,'UTF8')),'hex')='c584d60845b84f5497532c055d948bc78cf967618b7a6ca0c479dc3d37ca3ef2') <> 1 then return; end if;
 select q.id,q.user_id into target_id,target_user
 from beast_identity.account_mail_outbox q
 where encode(sha256(convert_to(q.id::text,'UTF8')),'hex')='c584d60845b84f5497532c055d948bc78cf967618b7a6ca0c479dc3d37ca3ef2'
   and q.state='pending' and q.kind='username_recovery'
   and q.leased_at is null and q.delivery_token is null and q.sent_at is null;
 if target_id is null then return; end if;
 if (select count(*) from beast_identity.account_mail_outbox q
     where q.user_id=target_user and q.kind='username_recovery' and q.state='pending') <> 1
    or exists(select 1 from beast_identity.account_mail_outbox q
              where q.state='inflight' and q.leased_at<now()-interval '5 minutes')
 then return; end if;
 return query select * from public.beast_account_mail_claim(target_user,'username_recovery',null);
end $$;
revoke all on function public.beast_account_mail_claim_controlled_recovery() from public,anon,authenticated;
grant execute on function public.beast_account_mail_claim_controlled_recovery() to service_role;
