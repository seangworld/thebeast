-- BA-107: owner-managed prompt assets with immutable version history.
-- Managed prompts remain separate from live code-owned prompts until a
-- consuming runtime explicitly adopts a released version.

create table if not exists public.beast_admin_prompt_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt_key text not null,
  name text not null,
  domain text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_prompt_assets_owner_key_unique
    unique (owner_id, prompt_key),
  constraint beast_admin_prompt_assets_key_check check (
    prompt_key ~ '^[a-z][a-z0-9_.-]{2,119}$'
  ),
  constraint beast_admin_prompt_assets_name_check check (
    char_length(btrim(name)) > 0
  ),
  constraint beast_admin_prompt_assets_domain_check check (
    domain in ('money', 'education', 'health', 'goals', 'fusion', 'shared')
  )
);

create table if not exists public.beast_admin_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null
    references public.beast_admin_prompt_assets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  system_prompt text not null,
  constraints jsonb not null default '[]'::jsonb,
  variables jsonb not null default '[]'::jsonb,
  change_summary text not null,
  status text not null default 'draft',
  release_date date null,
  author_id uuid null references auth.users(id) on delete set null,
  author_name text not null,
  supersedes_version_id uuid null
    references public.beast_admin_prompt_versions(id) on delete restrict,
  rollback_of_version_id uuid null
    references public.beast_admin_prompt_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_prompt_versions_prompt_version_unique
    unique (prompt_id, version),
  constraint beast_admin_prompt_versions_semver_check check (
    version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
  ),
  constraint beast_admin_prompt_versions_system_check check (
    char_length(btrim(system_prompt)) > 0
  ),
  constraint beast_admin_prompt_versions_changes_check check (
    char_length(btrim(change_summary)) > 0
  ),
  constraint beast_admin_prompt_versions_author_check check (
    char_length(btrim(author_name)) > 0
  ),
  constraint beast_admin_prompt_versions_status_check check (
    status in ('draft', 'in_review', 'approved', 'released', 'archived')
  ),
  constraint beast_admin_prompt_versions_constraints_check check (
    jsonb_typeof(constraints) = 'array'
  ),
  constraint beast_admin_prompt_versions_variables_check check (
    jsonb_typeof(variables) = 'array'
  ),
  constraint beast_admin_prompt_versions_release_date_check check (
    (status = 'released' and release_date is not null)
    or status <> 'released'
  )
);

create index if not exists beast_admin_prompt_assets_owner_updated_idx
  on public.beast_admin_prompt_assets (owner_id, updated_at desc);

create index if not exists beast_admin_prompt_versions_prompt_created_idx
  on public.beast_admin_prompt_versions (prompt_id, created_at desc);

create unique index if not exists beast_admin_prompt_versions_one_release_idx
  on public.beast_admin_prompt_versions (prompt_id)
  where status = 'released';

create or replace function public.set_beast_admin_prompt_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_admin_prompt_assets_updated_at
  on public.beast_admin_prompt_assets;
create trigger set_beast_admin_prompt_assets_updated_at
  before update on public.beast_admin_prompt_assets
  for each row execute function public.set_beast_admin_prompt_updated_at();

drop trigger if exists set_beast_admin_prompt_versions_updated_at
  on public.beast_admin_prompt_versions;
create trigger set_beast_admin_prompt_versions_updated_at
  before update on public.beast_admin_prompt_versions
  for each row execute function public.set_beast_admin_prompt_updated_at();

create or replace function public.protect_beast_admin_prompt_version_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.prompt_id is distinct from old.prompt_id
    or new.owner_id is distinct from old.owner_id
    or new.version is distinct from old.version
    or new.system_prompt is distinct from old.system_prompt
    or new.constraints is distinct from old.constraints
    or new.variables is distinct from old.variables
    or new.change_summary is distinct from old.change_summary
    or new.author_id is distinct from old.author_id
    or new.author_name is distinct from old.author_name
    or new.supersedes_version_id is distinct from old.supersedes_version_id
    or new.rollback_of_version_id is distinct from old.rollback_of_version_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Prompt version content is immutable; create a new version'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_beast_admin_prompt_version_content
  on public.beast_admin_prompt_versions;
create trigger protect_beast_admin_prompt_version_content
  before update on public.beast_admin_prompt_versions
  for each row
  execute function public.protect_beast_admin_prompt_version_content();

create or replace function public.validate_beast_admin_prompt_version_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_prompt_id uuid;
begin
  if new.supersedes_version_id is not null then
    select prompt_id into linked_prompt_id
    from public.beast_admin_prompt_versions
    where id = new.supersedes_version_id;
    if linked_prompt_id is distinct from new.prompt_id then
      raise exception 'Superseded version must belong to the same prompt'
        using errcode = '22023';
    end if;
  end if;

  if new.rollback_of_version_id is not null then
    select prompt_id into linked_prompt_id
    from public.beast_admin_prompt_versions
    where id = new.rollback_of_version_id;
    if linked_prompt_id is distinct from new.prompt_id then
      raise exception 'Rollback source must belong to the same prompt'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_beast_admin_prompt_version_links
  on public.beast_admin_prompt_versions;
create trigger validate_beast_admin_prompt_version_links
  before insert on public.beast_admin_prompt_versions
  for each row
  execute function public.validate_beast_admin_prompt_version_links();

alter table public.beast_admin_prompt_assets enable row level security;
alter table public.beast_admin_prompt_versions enable row level security;

drop policy if exists "Owners manage prompt assets"
  on public.beast_admin_prompt_assets;
create policy "Owners manage prompt assets"
  on public.beast_admin_prompt_assets
  for all
  using (public.is_profile_admin() and auth.uid() = owner_id)
  with check (public.is_profile_admin() and auth.uid() = owner_id);

drop policy if exists "Owners manage prompt versions"
  on public.beast_admin_prompt_versions;
create policy "Owners manage prompt versions"
  on public.beast_admin_prompt_versions
  for all
  using (public.is_profile_admin() and auth.uid() = owner_id)
  with check (public.is_profile_admin() and auth.uid() = owner_id);

create or replace function public.get_beast_admin_prompt_library()
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
        'id', asset.id,
        'key', asset.prompt_key,
        'name', asset.name,
        'domain', asset.domain,
        'description', asset.description,
        'versions', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', version.id,
                'version', version.version,
                'systemPrompt', version.system_prompt,
                'constraints', version.constraints,
                'variables', version.variables,
                'changeSummary', version.change_summary,
                'status', version.status,
                'releaseDate', version.release_date,
                'authorId', version.author_id,
                'authorName', version.author_name,
                'supersedesVersionId', version.supersedes_version_id,
                'rollbackOfVersionId', version.rollback_of_version_id,
                'createdAt', version.created_at,
                'updatedAt', version.updated_at
              )
              order by version.created_at desc, version.version desc
            )
            from public.beast_admin_prompt_versions version
            where version.prompt_id = asset.id
          ),
          '[]'::jsonb
        ),
        'createdAt', asset.created_at,
        'updatedAt', asset.updated_at
      )
      order by asset.updated_at desc, asset.name
    ),
    '[]'::jsonb
  )
  into result
  from public.beast_admin_prompt_assets asset
  where asset.owner_id = auth.uid();

  return result;
end;
$$;

create or replace function public.save_beast_admin_prompt_asset(
  selected_prompt_id uuid,
  selected_prompt_key text,
  selected_name text,
  selected_domain text,
  selected_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;
  if selected_prompt_key is null
    or selected_prompt_key !~ '^[a-z][a-z0-9_.-]{2,119}$' then
    raise exception 'Prompt key is invalid' using errcode = '22023';
  end if;
  if selected_name is null or char_length(btrim(selected_name)) = 0 then
    raise exception 'Prompt name is required' using errcode = '22023';
  end if;
  if selected_domain is null
    or selected_domain not in (
      'money', 'education', 'health', 'goals', 'fusion', 'shared'
    ) then
    raise exception 'Prompt domain is invalid' using errcode = '22023';
  end if;

  if selected_prompt_id is null then
    insert into public.beast_admin_prompt_assets (
      owner_id, prompt_key, name, domain, description
    )
    values (
      auth.uid(),
      selected_prompt_key,
      btrim(selected_name),
      selected_domain,
      coalesce(btrim(selected_description), '')
    )
    returning id into saved_id;
  else
    update public.beast_admin_prompt_assets
    set
      prompt_key = selected_prompt_key,
      name = btrim(selected_name),
      domain = selected_domain,
      description = coalesce(btrim(selected_description), '')
    where id = selected_prompt_id
      and owner_id = auth.uid()
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Prompt asset was not found'
        using errcode = '42501';
    end if;
  end if;

  return saved_id;
end;
$$;

create or replace function public.create_beast_admin_prompt_version(
  selected_prompt_id uuid,
  selected_version text,
  selected_system_prompt text,
  selected_constraints jsonb,
  selected_variables jsonb,
  selected_change_summary text,
  selected_supersedes_version_id uuid default null,
  selected_rollback_of_version_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  resolved_author_name text;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.beast_admin_prompt_assets
    where id = selected_prompt_id and owner_id = auth.uid()
  ) then
    raise exception 'Prompt asset was not found' using errcode = '42501';
  end if;
  if selected_version is null
    or selected_version !~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$' then
    raise exception 'Semantic prompt version is required'
      using errcode = '22023';
  end if;
  if selected_system_prompt is null
    or char_length(btrim(selected_system_prompt)) = 0 then
    raise exception 'System prompt is required' using errcode = '22023';
  end if;
  if selected_change_summary is null
    or char_length(btrim(selected_change_summary)) = 0 then
    raise exception 'Change summary is required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(selected_constraints, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(selected_variables, '[]'::jsonb)) <> 'array' then
    raise exception 'Constraints and variables must be arrays'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(selected_constraints, '[]'::jsonb)) item
    where jsonb_typeof(item) <> 'string'
      or char_length(btrim(item #>> '{}')) = 0
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(selected_variables, '[]'::jsonb)) item
    where jsonb_typeof(item) <> 'string'
      or char_length(btrim(item #>> '{}')) = 0
  ) then
    raise exception 'Constraints and variables must contain non-empty text'
      using errcode = '22023';
  end if;

  select coalesce(
    nullif(btrim(profile.preferred_name), ''),
    nullif(btrim(profile.display_name), ''),
    nullif(btrim(profile.full_name), ''),
    nullif(btrim(profile.username), ''),
    nullif(split_part(auth_user.email, '@', 1), ''),
    'Beast owner'
  )
  into resolved_author_name
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where auth_user.id = auth.uid();

  insert into public.beast_admin_prompt_versions (
    prompt_id,
    owner_id,
    version,
    system_prompt,
    constraints,
    variables,
    change_summary,
    status,
    author_id,
    author_name,
    supersedes_version_id,
    rollback_of_version_id
  )
  values (
    selected_prompt_id,
    auth.uid(),
    selected_version,
    btrim(selected_system_prompt),
    coalesce(selected_constraints, '[]'::jsonb),
    coalesce(selected_variables, '[]'::jsonb),
    btrim(selected_change_summary),
    'draft',
    auth.uid(),
    coalesce(resolved_author_name, 'Beast owner'),
    selected_supersedes_version_id,
    selected_rollback_of_version_id
  )
  returning id into saved_id;

  update public.beast_admin_prompt_assets
  set updated_at = now()
  where id = selected_prompt_id and owner_id = auth.uid();

  return saved_id;
end;
$$;

create or replace function public.transition_beast_admin_prompt_version(
  selected_version_id uuid,
  selected_status text,
  selected_release_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version public.beast_admin_prompt_versions%rowtype;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select *
  into current_version
  from public.beast_admin_prompt_versions
  where id = selected_version_id and owner_id = auth.uid();

  if current_version.id is null then
    raise exception 'Prompt version was not found' using errcode = '42501';
  end if;
  if selected_status = current_version.status then
    return;
  end if;
  if not (
    (current_version.status = 'draft'
      and selected_status in ('in_review', 'archived'))
    or (current_version.status = 'in_review'
      and selected_status in ('draft', 'approved', 'archived'))
    or (current_version.status = 'approved'
      and selected_status in ('in_review', 'released', 'archived'))
    or (current_version.status = 'released'
      and selected_status = 'archived')
  ) then
    raise exception 'Invalid prompt status transition % -> %',
      current_version.status, selected_status
      using errcode = '22023';
  end if;
  if selected_status = 'released' and selected_release_date is null then
    raise exception 'Released prompts require a release date'
      using errcode = '22023';
  end if;

  if selected_status = 'released' then
    update public.beast_admin_prompt_versions
    set status = 'archived'
    where prompt_id = current_version.prompt_id
      and owner_id = auth.uid()
      and status = 'released'
      and id <> current_version.id;
  end if;

  update public.beast_admin_prompt_versions
  set
    status = selected_status,
    release_date = case
      when selected_status = 'released' then selected_release_date
      when selected_status = 'archived' then release_date
      else null
    end
  where id = current_version.id and owner_id = auth.uid();

  update public.beast_admin_prompt_assets
  set updated_at = now()
  where id = current_version.prompt_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.get_beast_admin_prompt_library() from public;
revoke all on function public.save_beast_admin_prompt_asset(
  uuid, text, text, text, text
) from public;
revoke all on function public.create_beast_admin_prompt_version(
  uuid, text, text, jsonb, jsonb, text, uuid, uuid
) from public;
revoke all on function public.transition_beast_admin_prompt_version(
  uuid, text, date
) from public;

grant execute on function public.get_beast_admin_prompt_library()
  to authenticated;
grant execute on function public.save_beast_admin_prompt_asset(
  uuid, text, text, text, text
) to authenticated;
grant execute on function public.create_beast_admin_prompt_version(
  uuid, text, text, jsonb, jsonb, text, uuid, uuid
) to authenticated;
grant execute on function public.transition_beast_admin_prompt_version(
  uuid, text, date
) to authenticated;
