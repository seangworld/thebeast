-- Owner-controlled reactivation audit, no customer-facing write grants.
create table if not exists public.beastfusion_license_transfers (
 id uuid primary key default gen_random_uuid(),
 license_id text not null,
 previous_installation_id uuid,
 requested_by uuid not null references auth.users(id),
 reason text not null check (char_length(reason) between 10 and 500),
 transferred_at timestamptz not null default now()
);
alter table public.beastfusion_license_transfers enable row level security;
revoke all on public.beastfusion_license_transfers from anon, authenticated;
grant select, insert on public.beastfusion_license_transfers to service_role;

create or replace function public.beastfusion_reset_installation(
 p_license_id text, p_admin_id uuid, p_reason text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_previous uuid;
begin
 if p_license_id is null or p_admin_id is null or
    char_length(coalesce(p_reason,'')) not between 10 and 500 then return false; end if;
 if not exists(select 1 from public.profiles
   where id=p_admin_id and role='admin') then return false; end if;
 select installation_id into v_previous
 from public.beastfusion_licenses
 where license_id=p_license_id and status='active' for update;
 if not found or v_previous is null then return false; end if;
 update public.beastfusion_licenses set installation_id=null where license_id=p_license_id;
 insert into public.beastfusion_license_transfers
   (license_id,previous_installation_id,requested_by,reason)
 values (p_license_id,v_previous,p_admin_id,p_reason);
 return true;
end;
$$;
revoke all on function public.beastfusion_reset_installation(text,uuid,text) from public,anon,authenticated;
grant execute on function public.beastfusion_reset_installation(text,uuid,text) to service_role;
