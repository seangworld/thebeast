create table if not exists public.beast_document_access_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  scope text not null,
  permission text not null default 'View',
  status text not null default 'Active',
  grantee_user_id uuid references auth.users(id) on delete cascade,
  household_id text,
  family_member_id text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint beast_document_access_grants_document_owner_fk
    foreign key (document_id, owner_id)
    references public.beast_documents (id, owner_id)
    on delete cascade,
  constraint beast_document_access_grants_scope_check check (
    scope in ('Member', 'Household')
  ),
  constraint beast_document_access_grants_permission_check check (
    permission in ('None', 'View', 'Manage')
  ),
  constraint beast_document_access_grants_status_check check (
    status in ('Active', 'Revoked')
  ),
  constraint beast_document_access_grants_target_check check (
    (scope = 'Member' and grantee_user_id is not null and household_id is null)
    or
    (scope = 'Household' and household_id is not null and grantee_user_id is null)
  ),
  constraint beast_document_access_grants_revoked_at_check check (
    (status = 'Revoked' and revoked_at is not null)
    or
    (status = 'Active' and revoked_at is null)
  )
);

create index if not exists beast_document_access_grants_owner_document_idx
on public.beast_document_access_grants (owner_id, document_id, status);

create index if not exists beast_document_access_grants_grantee_idx
on public.beast_document_access_grants (grantee_user_id, status, permission)
where grantee_user_id is not null;

create index if not exists beast_document_access_grants_household_idx
on public.beast_document_access_grants (owner_id, household_id, status, permission)
where household_id is not null;

create unique index if not exists beast_document_access_grants_member_unique_idx
on public.beast_document_access_grants (owner_id, document_id, grantee_user_id)
where scope = 'Member' and status = 'Active';

create unique index if not exists beast_document_access_grants_household_unique_idx
on public.beast_document_access_grants (owner_id, document_id, household_id)
where scope = 'Household' and status = 'Active';

alter table public.beast_document_access_grants enable row level security;

drop policy if exists "Users manage own BeastOS document access grants"
on public.beast_document_access_grants;

create policy "Users manage own BeastOS document access grants"
on public.beast_document_access_grants for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Shared users read their BeastOS document access grants"
on public.beast_document_access_grants;

create policy "Shared users read their BeastOS document access grants"
on public.beast_document_access_grants for select
using (
  status = 'Active'
  and permission in ('View', 'Manage')
  and grantee_user_id = auth.uid()
);

drop policy if exists "Shared users read shared BeastOS document metadata"
on public.beast_documents;

create policy "Shared users read shared BeastOS document metadata"
on public.beast_documents for select
using (
  exists (
    select 1
    from public.beast_document_access_grants grants
    where grants.document_id = beast_documents.id
      and grants.status = 'Active'
      and grants.permission in ('View', 'Manage')
      and grants.grantee_user_id = auth.uid()
  )
);
