-- Bind each active BeastFusion license to one installation identity.
-- Service-role-only atomic first claim, with idempotent repeat activation.
alter table public.beastfusion_licenses add column if not exists installation_id uuid;

create or replace function public.beastfusion_bind_installation(
  p_license_id text, p_customer_id uuid, p_installation_id uuid
) returns text language plpgsql security invoker set search_path = '' as $$
declare v_bound uuid;
begin
  if p_license_id is null or p_customer_id is null or p_installation_id is null then
    return 'invalid';
  end if;
  update public.beastfusion_licenses
     set installation_id = p_installation_id
   where license_id = p_license_id and user_id = p_customer_id
     and status = 'active'
     and (installation_id is null or installation_id = p_installation_id)
  returning installation_id into v_bound;
  if v_bound is not null then return 'activated'; end if;
  if exists(select 1 from public.beastfusion_licenses
    where license_id=p_license_id and user_id=p_customer_id and status='active')
    then return 'already_bound';
  end if;
  return 'invalid';
end;
$$;
revoke all on function public.beastfusion_bind_installation(text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.beastfusion_bind_installation(text,uuid,uuid) to service_role;
