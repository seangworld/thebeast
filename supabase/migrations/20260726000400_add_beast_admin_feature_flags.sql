-- BA-106: owner-managed feature flags with module, role, and member audiences.
-- Runtime resolution is fail-closed and follows member > role > module
-- precedence. No existing feature is automatically enrolled by this migration.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role in ('user', 'beta', 'admin')
  );

create table if not exists public.beast_admin_feature_flags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  flag_key text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_feature_flags_key_check check (
    flag_key ~ '^[a-z][a-z0-9_.-]{2,79}$'
  ),
  constraint beast_admin_feature_flags_name_check check (
    char_length(btrim(name)) > 0
  )
);

create table if not exists public.beast_admin_feature_flag_assignments (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null
    references public.beast_admin_feature_flags(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  scope_type text not null,
  stage text not null,
  module_id text null,
  role_name text null,
  member_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_feature_flag_scope_check check (
    scope_type in ('module', 'role', 'member')
  ),
  constraint beast_admin_feature_flag_stage_check check (
    stage in (
      'hidden',
      'owner',
      'internal_testing',
      'beta',
      'released',
      'deprecated'
    )
  ),
  constraint beast_admin_feature_flag_module_check check (
    module_id is null or module_id in (
      'beastos',
      'money',
      'learning',
      'goals',
      'documents',
      'health',
      'home',
      'admin'
    )
  ),
  constraint beast_admin_feature_flag_role_check check (
    role_name is null or role_name in ('user', 'beta', 'admin')
  ),
  constraint beast_admin_feature_flag_target_check check (
    (
      scope_type = 'module'
      and module_id is not null
      and role_name is null
      and member_id is null
    )
    or (
      scope_type = 'role'
      and module_id is null
      and role_name is not null
      and member_id is null
    )
    or (
      scope_type = 'member'
      and module_id is null
      and role_name is null
      and member_id is not null
    )
  )
);

create unique index if not exists beast_admin_feature_flag_module_unique_idx
  on public.beast_admin_feature_flag_assignments (flag_id, module_id)
  where scope_type = 'module';

create unique index if not exists beast_admin_feature_flag_role_unique_idx
  on public.beast_admin_feature_flag_assignments (flag_id, role_name)
  where scope_type = 'role';

create unique index if not exists beast_admin_feature_flag_member_unique_idx
  on public.beast_admin_feature_flag_assignments (flag_id, member_id)
  where scope_type = 'member';

create index if not exists beast_admin_feature_flags_owner_updated_idx
  on public.beast_admin_feature_flags (owner_id, updated_at desc);

create index if not exists beast_admin_feature_flag_assignments_flag_idx
  on public.beast_admin_feature_flag_assignments (flag_id, scope_type);

create or replace function public.set_beast_admin_feature_flag_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_admin_feature_flags_updated_at
  on public.beast_admin_feature_flags;
create trigger set_beast_admin_feature_flags_updated_at
  before update on public.beast_admin_feature_flags
  for each row
  execute function public.set_beast_admin_feature_flag_updated_at();

drop trigger if exists set_beast_admin_feature_flag_assignments_updated_at
  on public.beast_admin_feature_flag_assignments;
create trigger set_beast_admin_feature_flag_assignments_updated_at
  before update on public.beast_admin_feature_flag_assignments
  for each row
  execute function public.set_beast_admin_feature_flag_updated_at();

alter table public.beast_admin_feature_flags enable row level security;
alter table public.beast_admin_feature_flag_assignments enable row level security;

drop policy if exists "Owners manage Beast feature flags"
  on public.beast_admin_feature_flags;
create policy "Owners manage Beast feature flags"
  on public.beast_admin_feature_flags
  for all
  using (public.is_profile_admin() and auth.uid() = owner_id)
  with check (public.is_profile_admin() and auth.uid() = owner_id);

drop policy if exists "Owners manage Beast feature flag assignments"
  on public.beast_admin_feature_flag_assignments;
create policy "Owners manage Beast feature flag assignments"
  on public.beast_admin_feature_flag_assignments
  for all
  using (public.is_profile_admin() and auth.uid() = owner_id)
  with check (public.is_profile_admin() and auth.uid() = owner_id);

create or replace function public.get_beast_admin_feature_flag_members()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', profile.id,
        'displayName', coalesce(
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.display_name), ''),
          nullif(btrim(profile.full_name), ''),
          nullif(btrim(profile.username), ''),
          nullif(split_part(auth_user.email, '@', 1), ''),
          'Member'
        ),
        'email', auth_user.email,
        'role', profile.role
      )
      order by
        coalesce(
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.display_name), ''),
          nullif(btrim(profile.full_name), ''),
          nullif(btrim(profile.username), ''),
          auth_user.email,
          profile.id::text
        ),
        profile.id
    ),
    '[]'::jsonb
  )
  into result
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id;

  return result;
end;
$$;

create or replace function public.get_beast_admin_feature_flags()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', flag.id,
        'key', flag.flag_key,
        'name', flag.name,
        'description', flag.description,
        'assignments', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', assignment.id,
                'scopeType', assignment.scope_type,
                'stage', assignment.stage,
                'moduleId', assignment.module_id,
                'roleName', assignment.role_name,
                'memberId', assignment.member_id,
                'memberName', case
                  when assignment.member_id is null then null
                  else coalesce(
                    nullif(btrim(profile.preferred_name), ''),
                    nullif(btrim(profile.display_name), ''),
                    nullif(btrim(profile.full_name), ''),
                    nullif(btrim(profile.username), ''),
                    nullif(split_part(auth_user.email, '@', 1), ''),
                    'Member'
                  )
                end,
                'memberEmail', auth_user.email,
                'createdAt', assignment.created_at,
                'updatedAt', assignment.updated_at
              )
              order by
                case assignment.scope_type
                  when 'member' then 1
                  when 'role' then 2
                  else 3
                end,
                coalesce(
                  assignment.member_id::text,
                  assignment.role_name,
                  assignment.module_id
                )
            )
            from public.beast_admin_feature_flag_assignments assignment
            left join public.profiles profile
              on profile.id = assignment.member_id
            left join auth.users auth_user
              on auth_user.id = assignment.member_id
            where assignment.flag_id = flag.id
              and assignment.owner_id = auth.uid()
          ),
          '[]'::jsonb
        ),
        'createdAt', flag.created_at,
        'updatedAt', flag.updated_at
      )
      order by flag.updated_at desc, flag.flag_key
    ),
    '[]'::jsonb
  )
  into result
  from public.beast_admin_feature_flags flag
  where flag.owner_id = auth.uid();

  return result;
end;
$$;

create or replace function public.save_beast_admin_feature_flag(
  selected_flag_id uuid,
  selected_flag_key text,
  selected_name text,
  selected_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_flag_id uuid;
  normalized_key text := lower(btrim(coalesce(selected_flag_key, '')));
  normalized_name text := btrim(coalesce(selected_name, ''));
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if normalized_key !~ '^[a-z][a-z0-9_.-]{2,79}$' then
    raise exception 'Feature flag key is invalid'
      using errcode = '22023';
  end if;

  if normalized_name = '' then
    raise exception 'Feature flag name is required'
      using errcode = '22023';
  end if;

  if selected_flag_id is null then
    insert into public.beast_admin_feature_flags (
      owner_id,
      flag_key,
      name,
      description
    )
    values (
      auth.uid(),
      normalized_key,
      normalized_name,
      btrim(coalesce(selected_description, ''))
    )
    returning id into saved_flag_id;
  else
    update public.beast_admin_feature_flags flag
    set
      flag_key = normalized_key,
      name = normalized_name,
      description = btrim(coalesce(selected_description, ''))
    where flag.id = selected_flag_id
      and flag.owner_id = auth.uid()
    returning flag.id into saved_flag_id;

    if saved_flag_id is null then
      raise exception 'Feature flag is not available to this owner'
        using errcode = '42501';
    end if;
  end if;

  return saved_flag_id;
end;
$$;

create or replace function public.save_beast_admin_feature_flag_assignment(
  selected_assignment_id uuid,
  selected_flag_id uuid,
  selected_scope_type text,
  selected_stage text,
  selected_module_id text default null,
  selected_role_name text default null,
  selected_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_assignment_id uuid;
  target_count integer :=
    (selected_module_id is not null)::integer
    + (selected_role_name is not null)::integer
    + (selected_member_id is not null)::integer;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if selected_scope_type not in ('module', 'role', 'member') then
    raise exception 'Feature flag scope is invalid'
      using errcode = '22023';
  end if;

  if selected_stage not in (
    'hidden',
    'owner',
    'internal_testing',
    'beta',
    'released',
    'deprecated'
  ) then
    raise exception 'Feature flag stage is invalid'
      using errcode = '22023';
  end if;

  if target_count <> 1
    or (selected_scope_type = 'module' and selected_module_id is null)
    or (selected_scope_type = 'role' and selected_role_name is null)
    or (selected_scope_type = 'member' and selected_member_id is null) then
    raise exception 'Feature flag assignment must have one matching target'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.beast_admin_feature_flags flag
    where flag.id = selected_flag_id
      and flag.owner_id = auth.uid()
  ) then
    raise exception 'Feature flag is not available to this owner'
      using errcode = '42501';
  end if;

  if selected_assignment_id is null then
    select assignment.id
    into saved_assignment_id
    from public.beast_admin_feature_flag_assignments assignment
    where assignment.flag_id = selected_flag_id
      and assignment.owner_id = auth.uid()
      and assignment.scope_type = selected_scope_type
      and (
        (
          selected_scope_type = 'module'
          and assignment.module_id = selected_module_id
        )
        or (
          selected_scope_type = 'role'
          and assignment.role_name = selected_role_name
        )
        or (
          selected_scope_type = 'member'
          and assignment.member_id = selected_member_id
        )
      );
  else
    saved_assignment_id := selected_assignment_id;
  end if;

  if saved_assignment_id is null then
    insert into public.beast_admin_feature_flag_assignments (
      flag_id,
      owner_id,
      scope_type,
      stage,
      module_id,
      role_name,
      member_id
    )
    values (
      selected_flag_id,
      auth.uid(),
      selected_scope_type,
      selected_stage,
      selected_module_id,
      selected_role_name,
      selected_member_id
    )
    returning id into saved_assignment_id;
  else
    update public.beast_admin_feature_flag_assignments assignment
    set
      scope_type = selected_scope_type,
      stage = selected_stage,
      module_id = selected_module_id,
      role_name = selected_role_name,
      member_id = selected_member_id
    where assignment.id = saved_assignment_id
      and assignment.flag_id = selected_flag_id
      and assignment.owner_id = auth.uid()
    returning assignment.id into saved_assignment_id;

    if saved_assignment_id is null then
      raise exception 'Feature flag assignment is not available to this owner'
        using errcode = '42501';
    end if;
  end if;

  return saved_assignment_id;
end;
$$;

create or replace function public.remove_beast_admin_feature_flag_assignment(
  selected_assignment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  delete from public.beast_admin_feature_flag_assignments assignment
  where assignment.id = selected_assignment_id
    and assignment.owner_id = auth.uid();

  return found;
end;
$$;

create or replace function public.get_beast_feature_flag_resolution(
  selected_flag_key text,
  selected_module_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  member_role text := 'user';
  resolved_stage text := 'hidden';
  resolved_scope text := 'default';
  resolved_source_id text;
  is_visible boolean := false;
begin
  select profile.role
  into member_role
  from public.profiles profile
  where profile.id = auth.uid();

  member_role := coalesce(member_role, 'user');

  select
    assignment.stage,
    assignment.scope_type,
    coalesce(
      assignment.member_id::text,
      assignment.role_name,
      assignment.module_id
    )
  into resolved_stage, resolved_scope, resolved_source_id
  from public.beast_admin_feature_flags flag
  join public.beast_admin_feature_flag_assignments assignment
    on assignment.flag_id = flag.id
  where flag.flag_key = lower(btrim(coalesce(selected_flag_key, '')))
    and (
      (
        assignment.scope_type = 'member'
        and assignment.member_id = auth.uid()
      )
      or (
        assignment.scope_type = 'role'
        and assignment.role_name = member_role
      )
      or (
        assignment.scope_type = 'module'
        and assignment.module_id = selected_module_id
      )
    )
  order by case assignment.scope_type
    when 'member' then 1
    when 'role' then 2
    else 3
  end
  limit 1;

  if not found then
    resolved_stage := 'hidden';
    resolved_scope := 'default';
    resolved_source_id := null;
  end if;

  is_visible := case resolved_stage
    when 'hidden' then false
    when 'owner' then member_role = 'admin'
    when 'internal_testing' then
      resolved_scope in ('member', 'role') or member_role = 'admin'
    when 'beta' then
      resolved_scope in ('member', 'role')
      or member_role in ('beta', 'admin')
    when 'released' then true
    when 'deprecated' then true
    else false
  end;

  return jsonb_build_object(
    'flagKey', lower(btrim(coalesce(selected_flag_key, ''))),
    'stage', resolved_stage,
    'visible', is_visible,
    'deprecated', resolved_stage = 'deprecated',
    'sourceScope', resolved_scope,
    'sourceId', resolved_source_id,
    'reason', case
      when resolved_scope = 'default'
        then 'No assignment matched, so visibility fails closed.'
      else resolved_scope || ' assignment resolved to ' || resolved_stage || '.'
    end
  );
end;
$$;

revoke all on function public.get_beast_admin_feature_flag_members()
  from public;
revoke all on function public.get_beast_admin_feature_flags() from public;
revoke all on function public.save_beast_admin_feature_flag(
  uuid,
  text,
  text,
  text
) from public;
revoke all on function public.save_beast_admin_feature_flag_assignment(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid
) from public;
revoke all on function public.remove_beast_admin_feature_flag_assignment(uuid)
  from public;
revoke all on function public.get_beast_feature_flag_resolution(text, text)
  from public;

grant execute on function public.get_beast_admin_feature_flag_members()
  to authenticated;
grant execute on function public.get_beast_admin_feature_flags()
  to authenticated;
grant execute on function public.save_beast_admin_feature_flag(
  uuid,
  text,
  text,
  text
) to authenticated;
grant execute on function public.save_beast_admin_feature_flag_assignment(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid
) to authenticated;
grant execute on function public.remove_beast_admin_feature_flag_assignment(uuid)
  to authenticated;
grant execute on function public.get_beast_feature_flag_resolution(text, text)
  to authenticated;
