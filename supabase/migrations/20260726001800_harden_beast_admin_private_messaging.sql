-- BA-129 forward-only hardening after the private messaging foundation was
-- manually applied. Preserve message history while preventing future threads
-- from targeting an administrator, system account, demo account, or an
-- unassigned non-admin recipient.

create or replace function public.validate_beast_admin_message_thread_parties()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles member_profile
    join auth.users member_auth on member_auth.id = member_profile.id
    where member_profile.id = new.member_id
      and member_profile.role <> 'admin'
      and member_profile.account_kind = 'member'
      and member_auth.deleted_at is null
  ) then
    raise exception
      'Private administrative threads require an individual Beast member'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles admin_profile
    join auth.users admin_auth on admin_auth.id = admin_profile.id
    where admin_profile.id = new.assigned_admin_id
      and admin_profile.role = 'admin'
      and admin_auth.deleted_at is null
  ) then
    raise exception
      'Private administrative threads require an authorized administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_beast_admin_message_thread_parties
  on public.beast_admin_message_threads;
create trigger validate_beast_admin_message_thread_parties
  before insert or update of member_id, assigned_admin_id
  on public.beast_admin_message_threads
  for each row
  execute function public.validate_beast_admin_message_thread_parties();

revoke all on function
  public.validate_beast_admin_message_thread_parties()
  from public;
