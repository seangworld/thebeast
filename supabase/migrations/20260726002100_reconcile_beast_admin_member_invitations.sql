-- BA-134 / BA-INV-101: forward-only member invitation reconciliation.
--
-- This file intentionally excludes the historical audit-action constraint
-- replacement. It creates missing invitation structures without deleting,
-- resetting, or rewriting existing household, member, invitation, or audit data.

-- BA-108: owner-controlled Beast member invitations.
--
-- Supabase Auth remains authoritative for identity and invitation delivery.
-- BeastOS persists only the owner-selected profile, access, household, beta,
-- lifecycle, and audit context associated with that single Auth user ID.

create table if not exists public.beast_households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint beast_households_name_check check (
    char_length(btrim(name)) between 1 and 100
  )
);

create index if not exists beast_households_owner_idx
  on public.beast_households (owner_id, name);

create table if not exists public.beast_household_memberships (
  household_id uuid not null
    references public.beast_households(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  household_role text not null default 'Member',
  relationship text null,
  status text not null default 'invited',
  invited_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, member_id),
  constraint beast_household_memberships_role_check check (
    household_role in ('Owner', 'Admin', 'Member', 'Child')
  ),
  constraint beast_household_memberships_relationship_check check (
    relationship is null
    or relationship in ('Husband', 'Wife', 'Son', 'Daughter')
  ),
  constraint beast_household_memberships_status_check check (
    status in ('invited', 'active', 'revoked')
  )
);

create unique index if not exists beast_household_memberships_member_idx
  on public.beast_household_memberships (member_id);

create table if not exists public.beast_admin_member_invitations (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete restrict,
  member_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null,
  household_id uuid null
    references public.beast_households(id) on delete restrict,
  relationship text null,
  module_ids text[] not null default '{}'::text[],
  beta_flag_ids uuid[] not null default '{}'::uuid[],
  invitation_message text null,
  status text not null default 'sent',
  sent_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  resend_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint beast_admin_member_invitations_email_check check (
    char_length(btrim(email)) between 3 and 320
  ),
  constraint beast_admin_member_invitations_display_name_check check (
    char_length(btrim(display_name)) between 1 and 100
  ),
  constraint beast_admin_member_invitations_role_check check (
    role in ('user', 'beta', 'admin')
  ),
  constraint beast_admin_member_invitations_relationship_check check (
    relationship is null
    or relationship in ('Husband', 'Wife', 'Son', 'Daughter')
  ),
  constraint beast_admin_member_invitations_household_check check (
    household_id is not null or relationship is null
  ),
  constraint beast_admin_member_invitations_module_check check (
    module_ids <@ array['money', 'learning']::text[]
  ),
  constraint beast_admin_member_invitations_status_check check (
    status in ('sent', 'resent', 'accepted', 'revoked')
  ),
  constraint beast_admin_member_invitations_message_check check (
    invitation_message is null
    or char_length(invitation_message) <= 1000
  ),
  constraint beast_admin_member_invitations_expiry_check check (
    expires_at > sent_at
  ),
  constraint beast_admin_member_invitations_resend_count_check check (
    resend_count >= 0
  )
);

create unique index if not exists beast_admin_member_invitations_email_idx
  on public.beast_admin_member_invitations (lower(email));

create index if not exists beast_admin_member_invitations_owner_status_idx
  on public.beast_admin_member_invitations
    (invited_by, status, sent_at desc);

do $reconcile$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beast_households_updated_at'
      and tgrelid = 'public.beast_households'::regclass
      and not tgisinternal
  ) then
    create trigger set_beast_households_updated_at
      before update on public.beast_households
      for each row
      execute function public.set_beast_admin_feature_flag_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beast_household_memberships_updated_at'
      and tgrelid = 'public.beast_household_memberships'::regclass
      and not tgisinternal
  ) then
    create trigger set_beast_household_memberships_updated_at
      before update on public.beast_household_memberships
      for each row
      execute function public.set_beast_admin_feature_flag_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beast_admin_member_invitations_updated_at'
      and tgrelid = 'public.beast_admin_member_invitations'::regclass
      and not tgisinternal
  ) then
    create trigger set_beast_admin_member_invitations_updated_at
      before update on public.beast_admin_member_invitations
      for each row
      execute function public.set_beast_admin_feature_flag_updated_at();
  end if;
end;
$reconcile$;

alter table public.beast_households enable row level security;
alter table public.beast_household_memberships enable row level security;
alter table public.beast_admin_member_invitations enable row level security;

do $reconcile$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_households'
      and policyname = 'Household members read their household'
  ) then
    create policy "Household members read their household"
      on public.beast_households
      for select
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_households'
      and policyname = 'Household owners manage their household'
  ) then
    create policy "Household owners manage their household"
      on public.beast_households
      for all
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_household_memberships'
      and policyname = 'Household members read household memberships'
  ) then
    create policy "Household members read household memberships"
      on public.beast_household_memberships
      for select
      using (member_id = auth.uid() or invited_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_household_memberships'
      and policyname = 'Household owners manage household memberships'
  ) then
    create policy "Household owners manage household memberships"
      on public.beast_household_memberships
      for all
      using (invited_by = auth.uid())
      with check (invited_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_admin_member_invitations'
      and policyname = 'Owners read their member invitations'
  ) then
    create policy "Owners read their member invitations"
      on public.beast_admin_member_invitations
      for select
      using (
        public.is_profile_admin()
        and invited_by = auth.uid()
      );
  end if;
end;
$reconcile$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.get_beast_admin_auth_user_id_by_email(text)'
  ) is null then
    execute $definition$
create function public.get_beast_admin_auth_user_id_by_email(
  selected_email text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $body$
  select auth_user.id
  from auth.users auth_user
  where lower(auth_user.email) = lower(btrim(selected_email))
    and auth_user.deleted_at is null
  limit 1;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.create_beast_admin_member_invitation(uuid,uuid,text,text,text,uuid,text,text[],uuid[],text,timestamptz,timestamptz)'
  ) is null then
    execute $definition$
create function public.create_beast_admin_member_invitation(
  selected_actor_id uuid,
  selected_member_id uuid,
  selected_email text,
  selected_display_name text,
  selected_role text,
  selected_household_id uuid,
  selected_relationship text,
  selected_module_ids text[],
  selected_beta_flag_ids uuid[],
  selected_invitation_message text,
  selected_sent_at timestamptz,
  selected_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $body$
declare
  invitation_id uuid;
  audit_event_id uuid;
  valid_flag_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only BeastAdmin invitation action required'
      using errcode = '42501';
  end if;

  if selected_actor_id is null
    or not exists (
      select 1
      from public.profiles actor_profile
      where actor_profile.id = selected_actor_id
        and actor_profile.role = 'admin'
    ) then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    where auth_user.id = selected_member_id
      and lower(auth_user.email) = lower(btrim(selected_email))
      and auth_user.deleted_at is null
  ) then
    raise exception 'The invited Auth identity could not be verified'
      using errcode = 'P0002';
  end if;

  if selected_role not in ('user', 'beta', 'admin')
    or char_length(btrim(selected_display_name)) not between 1 and 100
    or selected_expires_at <= selected_sent_at
    or (
      selected_invitation_message is not null
      and char_length(selected_invitation_message) > 1000
    ) then
    raise exception 'Invitation profile fields are invalid'
      using errcode = '22023';
  end if;

  if coalesce(cardinality(selected_module_ids), 0) <>
      coalesce(
        (
          select count(distinct module_id)
          from unnest(selected_module_ids) module_id
        ),
        0
      )
    or not coalesce(selected_module_ids, '{}'::text[])
      <@ array['money', 'learning']::text[] then
    raise exception 'Invitation module access is invalid'
      using errcode = '22023';
  end if;

  select count(*)
  into valid_flag_count
  from public.beast_admin_feature_flags flag
  where flag.owner_id = selected_actor_id
    and flag.id = any(coalesce(selected_beta_flag_ids, '{}'::uuid[]));

  if valid_flag_count <> coalesce(cardinality(selected_beta_flag_ids), 0)
    or valid_flag_count <> coalesce(
      (
        select count(distinct flag_id)
        from unnest(selected_beta_flag_ids) flag_id
      ),
      0
    ) then
    raise exception 'Invitation beta assignments are invalid'
      using errcode = '22023';
  end if;

  if selected_household_id is not null and not exists (
    select 1
    from public.beast_households household
    where household.id = selected_household_id
      and household.owner_id = selected_actor_id
  ) then
    raise exception 'Invitation household assignment is not available'
      using errcode = '22023';
  end if;

  if selected_household_id is null and selected_relationship is not null then
    raise exception 'A relationship requires a household assignment'
      using errcode = '22023';
  end if;

  update public.profiles
  set
    display_name = btrim(selected_display_name),
    role = selected_role,
    account_kind = 'member'
  where id = selected_member_id;

  if not found then
    raise exception 'The invited member profile was not created'
      using errcode = 'P0002';
  end if;

  insert into public.beast_admin_member_module_access (
    member_id,
    module_id,
    enabled,
    updated_by
  )
  select
    selected_member_id,
    module_id,
    module_id = any(coalesce(selected_module_ids, '{}'::text[])),
    selected_actor_id
  from unnest(array['money', 'learning']::text[]) module_id
  on conflict (member_id, module_id)
  do update set
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = timezone('utc', now());

  insert into public.beast_admin_feature_flag_assignments (
    flag_id,
    owner_id,
    scope_type,
    stage,
    member_id
  )
  select
    flag.id,
    selected_actor_id,
    'member',
    'beta',
    selected_member_id
  from public.beast_admin_feature_flags flag
  where flag.owner_id = selected_actor_id
    and flag.id = any(coalesce(selected_beta_flag_ids, '{}'::uuid[]))
  on conflict (flag_id, member_id)
    where scope_type = 'member'
  do update set
    owner_id = excluded.owner_id,
    stage = excluded.stage,
    module_id = null,
    role_name = null,
    updated_at = timezone('utc', now());

  if selected_household_id is not null then
    insert into public.beast_household_memberships (
      household_id,
      member_id,
      household_role,
      relationship,
      status,
      invited_by
    )
    values (
      selected_household_id,
      selected_member_id,
      'Member',
      selected_relationship,
      'invited',
      selected_actor_id
    )
    on conflict (household_id, member_id)
    do update set
      relationship = excluded.relationship,
      status = 'invited',
      invited_by = excluded.invited_by,
      joined_at = null,
      updated_at = timezone('utc', now());
  end if;

  insert into public.beast_admin_member_invitations (
    invited_by,
    member_id,
    email,
    display_name,
    role,
    household_id,
    relationship,
    module_ids,
    beta_flag_ids,
    invitation_message,
    status,
    sent_at,
    expires_at
  )
  values (
    selected_actor_id,
    selected_member_id,
    lower(btrim(selected_email)),
    btrim(selected_display_name),
    selected_role,
    selected_household_id,
    selected_relationship,
    coalesce(selected_module_ids, '{}'::text[]),
    coalesce(selected_beta_flag_ids, '{}'::uuid[]),
    nullif(btrim(selected_invitation_message), ''),
    'sent',
    selected_sent_at,
    selected_expires_at
  )
  returning id into invitation_id;

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    action,
    changes
  )
  values (
    selected_actor_id,
    selected_member_id,
    'invitation_sent',
    jsonb_build_object(
      'invitationId', invitation_id,
      'email', lower(btrim(selected_email)),
      'role', selected_role,
      'householdId', selected_household_id,
      'relationship', selected_relationship,
      'moduleAccess', coalesce(to_jsonb(selected_module_ids), '[]'::jsonb),
      'betaFlagIds', coalesce(to_jsonb(selected_beta_flag_ids), '[]'::jsonb),
      'expiresAt', selected_expires_at,
      'previousValue', jsonb_build_object(
        'invitationStatus', null
      ),
      'newValue', jsonb_build_object(
        'invitationStatus', 'sent',
        'email', lower(btrim(selected_email)),
        'role', selected_role,
        'householdId', selected_household_id,
        'relationship', selected_relationship,
        'moduleAccess',
          coalesce(to_jsonb(selected_module_ids), '[]'::jsonb),
        'betaFlagIds',
          coalesce(to_jsonb(selected_beta_flag_ids), '[]'::jsonb),
        'expiresAt', selected_expires_at
      )
    )
  )
  returning id into audit_event_id;

  return jsonb_build_object(
    'invitationId', invitation_id,
    'auditEventId', audit_event_id
  );
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.record_beast_admin_invitation_action(uuid,uuid,text,timestamptz,timestamptz)'
  ) is null then
    execute $definition$
create function public.record_beast_admin_invitation_action(
  selected_actor_id uuid,
  selected_invitation_id uuid,
  selected_action text,
  selected_sent_at timestamptz default null,
  selected_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $body$
declare
  invitation public.beast_admin_member_invitations%rowtype;
  audit_event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only BeastAdmin invitation action required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles actor_profile
    where actor_profile.id = selected_actor_id
      and actor_profile.role = 'admin'
  ) then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select *
  into invitation
  from public.beast_admin_member_invitations
  where id = selected_invitation_id
    and invited_by = selected_actor_id
  for update;

  if not found then
    raise exception 'Invitation is not available'
      using errcode = 'P0002';
  end if;

  if invitation.status in ('accepted', 'revoked') then
    raise exception 'Completed invitations cannot be changed'
      using errcode = '23514';
  end if;

  if selected_action = 'resend' then
    if selected_sent_at is null
      or selected_expires_at is null
      or selected_expires_at <= selected_sent_at then
      raise exception 'Invitation resend timing is invalid'
        using errcode = '22023';
    end if;

    update public.beast_admin_member_invitations
    set
      status = 'resent',
      sent_at = selected_sent_at,
      expires_at = selected_expires_at,
      resend_count = resend_count + 1
    where id = invitation.id;
  elsif selected_action = 'revoke' then
    update public.beast_admin_member_invitations
    set
      status = 'revoked',
      revoked_at = timezone('utc', now())
    where id = invitation.id;

    update public.beast_household_memberships
    set status = 'revoked'
    where member_id = invitation.member_id
      and status = 'invited';
  else
    raise exception 'Invitation action is invalid'
      using errcode = '22023';
  end if;

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    action,
    changes
  )
  values (
    selected_actor_id,
    invitation.member_id,
    case selected_action
      when 'resend' then 'invitation_resent'
      else 'invitation_revoked'
    end,
    jsonb_build_object(
      'invitationId', invitation.id,
      'email', invitation.email,
      'sentAt', selected_sent_at,
      'expiresAt', selected_expires_at,
      'previousValue', jsonb_build_object(
        'invitationStatus', invitation.status,
        'sentAt', invitation.sent_at,
        'expiresAt', invitation.expires_at
      ),
      'newValue', case selected_action
        when 'resend' then jsonb_build_object(
          'invitationStatus', 'resent',
          'sentAt', selected_sent_at,
          'expiresAt', selected_expires_at
        )
        else jsonb_build_object(
          'invitationStatus', 'revoked'
        )
      end
    )
  )
  returning id into audit_event_id;

  return jsonb_build_object(
    'memberId', invitation.member_id,
    'auditEventId', audit_event_id
  );
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.accept_beast_admin_member_invitation(uuid)'
  ) is null then
    execute $definition$
create function public.accept_beast_admin_member_invitation(
  selected_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $body$
declare
  invitation public.beast_admin_member_invitations%rowtype;
  audit_event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only invitation acceptance required'
      using errcode = '42501';
  end if;

  select *
  into invitation
  from public.beast_admin_member_invitations
  where member_id = selected_member_id
  for update;

  if not found then
    raise exception 'Invitation is not available'
      using errcode = 'P0002';
  end if;

  if invitation.status = 'revoked' then
    raise exception 'This invitation was revoked'
      using errcode = '23514';
  end if;

  if invitation.status <> 'accepted' then
    update public.beast_admin_member_invitations
    set
      status = 'accepted',
      accepted_at = timezone('utc', now())
    where id = invitation.id;

    update public.beast_household_memberships
    set
      status = 'active',
      joined_at = coalesce(joined_at, timezone('utc', now()))
    where member_id = selected_member_id
      and status = 'invited';

    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes
    )
    values (
      selected_member_id,
      selected_member_id,
      'invitation_accepted',
      jsonb_build_object(
        'invitationId', invitation.id,
        'email', invitation.email,
        'previousValue', jsonb_build_object(
          'invitationStatus', invitation.status
        ),
        'newValue', jsonb_build_object(
          'invitationStatus', 'accepted'
        )
      )
    )
    returning id into audit_event_id;
  end if;

  return jsonb_build_object(
    'accepted', true,
    'invitationId', invitation.id,
    'auditEventId', audit_event_id
  );
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.get_beast_admin_member_invitations()'
  ) is null then
    execute $definition$
create function public.get_beast_admin_member_invitations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'invitations',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', invitation.id,
            'memberId', invitation.member_id,
            'email', invitation.email,
            'displayName', invitation.display_name,
            'role', invitation.role,
            'state', case
              when invitation.status in ('accepted', 'revoked')
                then invitation.status
              when invitation.expires_at <= timezone('utc', now())
                then 'expired'
              else invitation.status
            end,
            'householdId', invitation.household_id,
            'householdName', household.name,
            'relationship', invitation.relationship,
            'moduleAccess', to_jsonb(invitation.module_ids),
            'betaFlagIds', to_jsonb(invitation.beta_flag_ids),
            'invitationMessage', invitation.invitation_message,
            'sentAt', invitation.sent_at,
            'expiresAt', invitation.expires_at,
            'acceptedAt', invitation.accepted_at,
            'revokedAt', invitation.revoked_at,
            'resendCount', invitation.resend_count
          )
          order by invitation.sent_at desc, invitation.id
        )
        from public.beast_admin_member_invitations invitation
        left join public.beast_households household
          on household.id = invitation.household_id
        where invitation.invited_by = auth.uid()
      ),
      '[]'::jsonb
    ),
    'households',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', household.id,
            'name', household.name
          )
          order by household.name, household.id
        )
        from public.beast_households household
        where household.owner_id = auth.uid()
      ),
      '[]'::jsonb
    )
  );
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

revoke all on function public.get_beast_admin_auth_user_id_by_email(text)
  from public;
revoke all on function public.create_beast_admin_member_invitation(
  uuid, uuid, text, text, text, uuid, text, text[], uuid[], text,
  timestamptz, timestamptz
) from public;
revoke all on function public.record_beast_admin_invitation_action(
  uuid, uuid, text, timestamptz, timestamptz
) from public;
revoke all on function public.accept_beast_admin_member_invitation(uuid)
  from public;
revoke all on function public.get_beast_admin_member_invitations()
  from public;

grant execute on function public.get_beast_admin_auth_user_id_by_email(text)
  to service_role;
grant execute on function public.create_beast_admin_member_invitation(
  uuid, uuid, text, text, text, uuid, text, text[], uuid[], text,
  timestamptz, timestamptz
) to service_role;
grant execute on function public.record_beast_admin_invitation_action(
  uuid, uuid, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.accept_beast_admin_member_invitation(uuid)
  to service_role;
grant execute on function public.get_beast_admin_member_invitations()
  to authenticated;

notify pgrst, 'reload schema';
