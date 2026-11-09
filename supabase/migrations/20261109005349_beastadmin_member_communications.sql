create table public.beast_admin_member_email_campaigns (
  id uuid primary key,
  actor_id uuid not null,
  category text not null check (category = 'account_setup'),
  fingerprint text not null unique,
  subject text not null,
  recipients jsonb not null,
  recipient_count integer not null check (recipient_count between 1 and 5),
  outcomes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.beast_admin_member_email_campaigns enable row level security;
revoke all on public.beast_admin_member_email_campaigns from public, anon, authenticated, service_role;
grant select, update (outcomes) on public.beast_admin_member_email_campaigns to service_role;
create index beast_admin_member_email_campaigns_created_at_idx on public.beast_admin_member_email_campaigns (created_at);

create function public.reserve_beast_admin_member_email_campaign(
  p_id uuid, p_actor uuid, p_fingerprint text, p_subject text, p_recipients jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  recipient_total integer := jsonb_array_length(p_recipients);
begin
  if recipient_total is null or recipient_total not between 1 and 5 or not exists (
    select 1 from public.profiles where id = p_actor and role = 'admin'
  ) then return false; end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_recipients) as selected(id uuid, email text)
    left join auth.users member on member.id = selected.id
    left join public.profiles profile on profile.id = selected.id
    where member.id is null or profile.account_kind is distinct from 'member'
      or member.email is distinct from selected.email
      or member.email_confirmed_at is null or member.deleted_at is not null
      or member.banned_until > now()
      or coalesce(member.raw_app_meta_data->>'is_disabled', 'false') = 'true'
      or lower(coalesce(member.raw_app_meta_data->>'account_status', '')) = 'disabled'
      or exists (select 1 from beast_identity.usernames username where username.user_id = selected.id)
  ) then return false; end if;

  perform pg_advisory_xact_lock(hashtext('beast_admin_member_email_campaigns'));
  -- Reserve each message plus its owner summary before contacting the provider.
  if (
    select coalesce(sum(recipient_count + 1), 0)
    from public.beast_admin_member_email_campaigns where created_at > now() - interval '24 hours'
  ) + recipient_total + 1 > 20 or exists (
    select 1 from public.beast_admin_member_email_campaigns where created_at > now() - interval '1 minute'
  ) then return false; end if;

  insert into public.beast_admin_member_email_campaigns (
    id, actor_id, category, fingerprint, subject, recipients, recipient_count
  ) values (p_id, p_actor, 'account_setup', p_fingerprint, p_subject, p_recipients, recipient_total)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.reserve_beast_admin_member_email_campaign(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_beast_admin_member_email_campaign(uuid, uuid, text, text, jsonb) to service_role;
