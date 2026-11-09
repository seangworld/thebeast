alter table public.beast_admin_member_email_campaigns
  drop constraint beast_admin_member_email_campaigns_category_check,
  add constraint beast_admin_member_email_campaigns_category_check
    check (category in ('account_setup', 'onboarding', 'verification'));

create function public.reserve_beast_admin_member_email_campaign(
  p_id uuid, p_actor uuid, p_fingerprint text, p_subject text, p_recipients jsonb, p_category text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  recipient_total integer := jsonb_array_length(p_recipients);
begin
  if p_category is null or p_category not in ('account_setup', 'onboarding', 'verification') or recipient_total is null or recipient_total not between 1 and 5 or not exists (
    select 1 from public.profiles where id = p_actor and role = 'admin'
  ) then return false; end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_recipients) as selected(id uuid, email text)
    left join auth.users member on member.id = selected.id
    left join public.profiles profile on profile.id = selected.id
    where member.id is null or profile.account_kind is distinct from 'member'
      or member.email is distinct from selected.email
      or member.deleted_at is not null
      or (p_category = 'account_setup' and member.email_confirmed_at is null)
      or (p_category <> 'account_setup' and (member.email_confirmed_at is not null or nullif(btrim(member.email_change), '') is not null))
      or member.banned_until > now()
      or coalesce(member.raw_app_meta_data->>'is_disabled', 'false') = 'true'
      or lower(coalesce(member.raw_app_meta_data->>'account_status', '')) = 'disabled'
      or (p_category = 'account_setup' and exists (
        select 1 from beast_identity.usernames username where username.user_id = selected.id
      ))
  ) then return false; end if;

  perform pg_advisory_xact_lock(hashtext('beast_admin_member_email_campaigns'));
  -- Reserve each message plus its owner summary before contacting the provider.
  if (
    select coalesce(sum(recipient_count + 1), 0)
    from public.beast_admin_member_email_campaigns where created_at > now() - interval '24 hours'
  ) + recipient_total + 1 > 20 or exists (
    select 1 from public.beast_admin_member_email_campaigns where created_at > now() - interval '1 minute'
  ) then return false; end if;

  if p_category = 'verification' and exists (
    select 1 from public.beast_admin_member_email_campaigns campaign
    cross join lateral jsonb_array_elements(campaign.recipients) previous
    join jsonb_array_elements(p_recipients) current_recipient
      on previous->>'id' = current_recipient->>'id'
    where campaign.category = 'verification'
      and campaign.created_at > now() - interval '24 hours'
  ) then return false; end if;

  insert into public.beast_admin_member_email_campaigns (
    id, actor_id, category, fingerprint, subject, recipients, recipient_count
  ) values (p_id, p_actor, p_category, p_fingerprint, p_subject, p_recipients, recipient_total)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.reserve_beast_admin_member_email_campaign(uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.reserve_beast_admin_member_email_campaign(uuid, uuid, text, text, jsonb, text) to service_role;

-- Keep the previous application release compatible for rollback.
create or replace function public.reserve_beast_admin_member_email_campaign(
  p_id uuid, p_actor uuid, p_fingerprint text, p_subject text, p_recipients jsonb
) returns boolean
language sql security definer set search_path = '' as $$
  select public.reserve_beast_admin_member_email_campaign(
    p_id, p_actor, p_fingerprint, p_subject, p_recipients, 'account_setup'
  );
$$;
