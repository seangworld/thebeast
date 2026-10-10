-- A support-revoked installation identity must never reclaim a transferred license.
-- Lock the license row before evaluating the transfer history to serialize claims with resets.
create or replace function public.beastfusion_bind_installation(
 p_license_id text, p_customer_id uuid, p_installation_id uuid
) returns text language plpgsql security invoker set search_path = '' as $$
declare v_current uuid;
begin
 if p_license_id is null or p_customer_id is null or p_installation_id is null
   then return 'invalid'; end if;
 select installation_id into v_current from public.beastfusion_licenses
  where license_id=p_license_id and user_id=p_customer_id and status='active'
  for update;
 if not found then return 'invalid'; end if;
 if exists(select 1 from public.beastfusion_license_transfers
   where license_id=p_license_id and previous_installation_id=p_installation_id)
   then return 'already_bound'; end if;
 if v_current is not null and v_current<>p_installation_id
   then return 'already_bound'; end if;
 update public.beastfusion_licenses set installation_id=p_installation_id
  where license_id=p_license_id and user_id=p_customer_id;
 return 'activated';
end;
$$;
revoke all on function public.beastfusion_bind_installation(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.beastfusion_bind_installation(text,uuid,uuid) to service_role;
