-- BA-108: owner-only release history across the Beast ecosystem.
-- Records are evidence-backed and intentionally separate from public,
-- hand-authored release notes and the generated version manifest.

create table if not exists public.beast_admin_release_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  version text not null,
  release_date date not null,
  title text not null,
  summary text not null default '',
  modules_included text[] not null,
  bug_fixes text[] not null default '{}'::text[],
  features text[] not null default '{}'::text[],
  database_migrations text[] not null default '{}'::text[],
  validation_status text not null default 'not_started',
  validation_checks text[] not null default '{}'::text[],
  validation_notes text not null default '',
  validated_at timestamptz null,
  deployment_status text not null default 'not_deployed',
  deployment_reference text not null default '',
  deployment_notes text not null default '',
  deployed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_release_records_owner_version_unique
    unique (owner_id, product, version),
  constraint beast_admin_release_records_product_check check (
    product in (
      'platform',
      'beastos',
      'money',
      'education',
      'health',
      'goals',
      'documents',
      'home',
      'security',
      'fusion',
      'admin',
      'seangworld'
    )
  ),
  constraint beast_admin_release_records_version_check check (
    char_length(btrim(version)) > 0
  ),
  constraint beast_admin_release_records_title_check check (
    char_length(btrim(title)) > 0
  ),
  constraint beast_admin_release_records_modules_check check (
    cardinality(modules_included) > 0
    and modules_included <@ array[
      'platform',
      'beastos',
      'money',
      'education',
      'health',
      'goals',
      'documents',
      'home',
      'security',
      'fusion',
      'admin',
      'seangworld'
    ]::text[]
  ),
  constraint beast_admin_release_records_validation_check check (
    validation_status in (
      'not_started',
      'in_progress',
      'passed',
      'passed_with_limits',
      'failed'
    )
  ),
  constraint beast_admin_release_records_validated_at_check check (
    (
      validation_status in ('passed', 'passed_with_limits', 'failed')
      and validated_at is not null
    )
    or (
      validation_status in ('not_started', 'in_progress')
      and validated_at is null
    )
  ),
  constraint beast_admin_release_records_deployment_check check (
    deployment_status in (
      'not_deployed',
      'scheduled',
      'deploying',
      'deployed',
      'failed',
      'rolled_back'
    )
  ),
  constraint beast_admin_release_records_deployed_at_check check (
    deployment_status <> 'deployed'
    or (
      deployed_at is not null
      and char_length(btrim(deployment_reference)) > 0
    )
  ),
  constraint beast_admin_release_records_deploy_after_validation_check check (
    deployment_status <> 'deployed'
    or validation_status in ('passed', 'passed_with_limits')
  )
);

create index if not exists beast_admin_release_records_owner_date_idx
  on public.beast_admin_release_records (
    owner_id,
    release_date desc,
    created_at desc
  );

create index if not exists beast_admin_release_records_product_idx
  on public.beast_admin_release_records (owner_id, product, release_date desc);

create or replace function public.set_beast_admin_release_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_admin_release_records_updated_at
  on public.beast_admin_release_records;
create trigger set_beast_admin_release_records_updated_at
  before update on public.beast_admin_release_records
  for each row
  execute function public.set_beast_admin_release_updated_at();

alter table public.beast_admin_release_records enable row level security;

drop policy if exists "Owners manage release records"
  on public.beast_admin_release_records;
create policy "Owners manage release records"
  on public.beast_admin_release_records
  for all
  using (public.is_profile_admin() and auth.uid() = owner_id)
  with check (public.is_profile_admin() and auth.uid() = owner_id);

create or replace function public.get_beast_admin_release_records()
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
        'id', release.id,
        'product', release.product,
        'version', release.version,
        'releaseDate', release.release_date,
        'title', release.title,
        'summary', release.summary,
        'modulesIncluded', release.modules_included,
        'bugFixes', release.bug_fixes,
        'features', release.features,
        'databaseMigrations', release.database_migrations,
        'validationStatus', release.validation_status,
        'validationChecks', release.validation_checks,
        'validationNotes', release.validation_notes,
        'validatedAt', release.validated_at,
        'deploymentStatus', release.deployment_status,
        'deploymentReference', release.deployment_reference,
        'deploymentNotes', release.deployment_notes,
        'deployedAt', release.deployed_at,
        'createdAt', release.created_at,
        'updatedAt', release.updated_at
      )
      order by release.release_date desc, release.created_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.beast_admin_release_records release
  where release.owner_id = auth.uid();

  return result;
end;
$$;

create or replace function public.save_beast_admin_release_record(
  selected_release_id uuid,
  selected_product text,
  selected_version text,
  selected_release_date date,
  selected_title text,
  selected_summary text,
  selected_modules_included text[],
  selected_bug_fixes text[],
  selected_features text[],
  selected_database_migrations text[],
  selected_validation_status text,
  selected_validation_checks text[],
  selected_validation_notes text,
  selected_validated_at timestamptz,
  selected_deployment_status text,
  selected_deployment_reference text,
  selected_deployment_notes text,
  selected_deployed_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  valid_products constant text[] := array[
    'platform',
    'beastos',
    'money',
    'education',
    'health',
    'goals',
    'documents',
    'home',
    'security',
    'fusion',
    'admin',
    'seangworld'
  ]::text[];
  normalized_validated_at timestamptz;
  normalized_deployed_at timestamptz;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;
  if selected_product is null
    or not selected_product = any(valid_products) then
    raise exception 'Release product is invalid' using errcode = '22023';
  end if;
  if selected_version is null or char_length(btrim(selected_version)) = 0 then
    raise exception 'Release version is required' using errcode = '22023';
  end if;
  if selected_release_date is null then
    raise exception 'Release date is required' using errcode = '22023';
  end if;
  if selected_title is null or char_length(btrim(selected_title)) = 0 then
    raise exception 'Release title is required' using errcode = '22023';
  end if;
  if coalesce(cardinality(selected_modules_included), 0) = 0
    or not selected_modules_included <@ valid_products then
    raise exception 'At least one valid included module is required'
      using errcode = '22023';
  end if;
  if selected_validation_status is null
    or selected_validation_status not in (
      'not_started',
      'in_progress',
      'passed',
      'passed_with_limits',
      'failed'
    ) then
    raise exception 'Validation status is invalid' using errcode = '22023';
  end if;
  if selected_deployment_status is null
    or selected_deployment_status not in (
      'not_deployed',
      'scheduled',
      'deploying',
      'deployed',
      'failed',
      'rolled_back'
    ) then
    raise exception 'Deployment status is invalid' using errcode = '22023';
  end if;
  if selected_deployment_status = 'deployed'
    and selected_validation_status not in ('passed', 'passed_with_limits') then
    raise exception 'Production deployment requires passing validation'
      using errcode = '22023';
  end if;
  if selected_deployment_status = 'deployed'
    and (
      selected_deployment_reference is null
      or char_length(btrim(selected_deployment_reference)) = 0
    ) then
    raise exception 'Deployed releases require a production reference'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(
      coalesce(selected_modules_included, '{}'::text[])
      || coalesce(selected_bug_fixes, '{}'::text[])
      || coalesce(selected_features, '{}'::text[])
      || coalesce(selected_database_migrations, '{}'::text[])
      || coalesce(selected_validation_checks, '{}'::text[])
    ) item
    where char_length(btrim(item)) = 0
  ) then
    raise exception 'Release list items must contain text'
      using errcode = '22023';
  end if;

  normalized_validated_at := case
    when selected_validation_status in (
      'passed', 'passed_with_limits', 'failed'
    ) then coalesce(selected_validated_at, now())
    else null
  end;
  normalized_deployed_at := case
    when selected_deployment_status = 'deployed'
      then coalesce(selected_deployed_at, now())
    else selected_deployed_at
  end;

  if selected_release_id is null then
    insert into public.beast_admin_release_records (
      owner_id,
      product,
      version,
      release_date,
      title,
      summary,
      modules_included,
      bug_fixes,
      features,
      database_migrations,
      validation_status,
      validation_checks,
      validation_notes,
      validated_at,
      deployment_status,
      deployment_reference,
      deployment_notes,
      deployed_at
    )
    values (
      auth.uid(),
      selected_product,
      btrim(selected_version),
      selected_release_date,
      btrim(selected_title),
      coalesce(btrim(selected_summary), ''),
      selected_modules_included,
      coalesce(selected_bug_fixes, '{}'::text[]),
      coalesce(selected_features, '{}'::text[]),
      coalesce(selected_database_migrations, '{}'::text[]),
      selected_validation_status,
      coalesce(selected_validation_checks, '{}'::text[]),
      coalesce(btrim(selected_validation_notes), ''),
      normalized_validated_at,
      selected_deployment_status,
      coalesce(btrim(selected_deployment_reference), ''),
      coalesce(btrim(selected_deployment_notes), ''),
      normalized_deployed_at
    )
    returning id into saved_id;
  else
    update public.beast_admin_release_records
    set
      product = selected_product,
      version = btrim(selected_version),
      release_date = selected_release_date,
      title = btrim(selected_title),
      summary = coalesce(btrim(selected_summary), ''),
      modules_included = selected_modules_included,
      bug_fixes = coalesce(selected_bug_fixes, '{}'::text[]),
      features = coalesce(selected_features, '{}'::text[]),
      database_migrations =
        coalesce(selected_database_migrations, '{}'::text[]),
      validation_status = selected_validation_status,
      validation_checks =
        coalesce(selected_validation_checks, '{}'::text[]),
      validation_notes = coalesce(btrim(selected_validation_notes), ''),
      validated_at = normalized_validated_at,
      deployment_status = selected_deployment_status,
      deployment_reference =
        coalesce(btrim(selected_deployment_reference), ''),
      deployment_notes = coalesce(btrim(selected_deployment_notes), ''),
      deployed_at = normalized_deployed_at
    where id = selected_release_id and owner_id = auth.uid()
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Release record was not found'
        using errcode = '42501';
    end if;
  end if;

  return saved_id;
end;
$$;

revoke all on function public.get_beast_admin_release_records()
  from public;
revoke all on function public.save_beast_admin_release_record(
  uuid,
  text,
  text,
  date,
  text,
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  text[],
  text,
  timestamptz,
  text,
  text,
  text,
  timestamptz
) from public;

grant execute on function public.get_beast_admin_release_records()
  to authenticated;
grant execute on function public.save_beast_admin_release_record(
  uuid,
  text,
  text,
  date,
  text,
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  text[],
  text,
  timestamptz,
  text,
  text,
  text,
  timestamptz
) to authenticated;
