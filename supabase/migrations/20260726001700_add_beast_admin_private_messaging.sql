-- BA-129: private administrative messaging between one Beast member and
-- explicitly authorized Beast administrators.
--
-- This is account/support communication, not AI chat. Message bodies are
-- excluded from notifications, account-audit payloads, analytics, professional
-- memory, and cross-module context. Direct mutation is denied; owner/member
-- workflows use the bounded RPCs below.

create table if not exists public.beast_admin_message_threads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique
    references auth.users(id) on delete restrict,
  assigned_admin_id uuid not null
    references auth.users(id) on delete restrict,
  category text not null default 'support',
  status text not null default 'open',
  linked_object_type text null,
  linked_object_id uuid null,
  member_archived_at timestamptz null,
  admin_archived_at timestamptz null,
  resolved_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz null,
  constraint beast_admin_message_threads_category_check check (
    category in ('account', 'support', 'problem', 'feedback', 'access', 'other')
  ),
  constraint beast_admin_message_threads_status_check check (
    status in ('open', 'resolved')
  ),
  constraint beast_admin_message_threads_link_type_check check (
    linked_object_type is null
    or linked_object_type in ('feedback', 'account_action', 'roadmap')
  ),
  constraint beast_admin_message_threads_link_pair_check check (
    (linked_object_type is null and linked_object_id is null)
    or (linked_object_type is not null and linked_object_id is not null)
  )
);

create table if not exists public.beast_admin_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null
    references public.beast_admin_message_threads(id) on delete restrict,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  sender_role text not null,
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  constraint beast_admin_messages_sender_role_check check (
    sender_role in ('admin', 'member')
  ),
  constraint beast_admin_messages_body_check check (
    char_length(btrim(body)) between 1 and 5000
    and body !~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]'
    and body !~* '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|form)([[:space:]>])'
    and body !~* 'javascript[[:space:]]*:'
  ),
  constraint beast_admin_messages_sender_recipient_check check (
    sender_user_id <> recipient_user_id
  )
);

create table if not exists public.beast_admin_message_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  thread_id uuid not null
    references public.beast_admin_message_threads(id) on delete restrict,
  message_id uuid not null unique
    references public.beast_admin_messages(id) on delete restrict,
  title text not null default 'New private message',
  summary text not null default
    'A private Beast Administration message is ready.',
  action_url text not null,
  state text not null default 'Unread',
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  constraint beast_admin_message_notifications_state_check check (
    state in ('Unread', 'Read')
  ),
  constraint beast_admin_message_notifications_action_check check (
    action_url in ('/dashboard/messages', '/dashboard/admin/messages')
  )
);

create index if not exists beast_admin_message_threads_last_message_idx
  on public.beast_admin_message_threads (last_message_at desc, id);
create index if not exists beast_admin_messages_thread_created_idx
  on public.beast_admin_messages (thread_id, created_at, id);
create index if not exists beast_admin_messages_recipient_unread_idx
  on public.beast_admin_messages (recipient_user_id, created_at desc)
  where read_at is null;
create index if not exists beast_admin_message_notifications_user_state_idx
  on public.beast_admin_message_notifications
    (user_id, state, created_at desc);

alter table public.beast_admin_message_threads enable row level security;
alter table public.beast_admin_messages enable row level security;
alter table public.beast_admin_message_notifications enable row level security;

drop policy if exists "Members read own private admin thread"
  on public.beast_admin_message_threads;
create policy "Members read own private admin thread"
  on public.beast_admin_message_threads
  for select
  using (
    auth.uid() = member_id
    or public.is_profile_admin()
  );

drop policy if exists "Members read own private admin messages"
  on public.beast_admin_messages;
create policy "Members read own private admin messages"
  on public.beast_admin_messages
  for select
  using (
    exists (
      select 1
      from public.beast_admin_message_threads thread
      where thread.id = beast_admin_messages.thread_id
        and (
          thread.member_id = auth.uid()
          or public.is_profile_admin()
        )
    )
  );

drop policy if exists "Recipients read own private admin notifications"
  on public.beast_admin_message_notifications;
create policy "Recipients read own private admin notifications"
  on public.beast_admin_message_notifications
  for select
  using (auth.uid() = user_id);

create or replace function public.validate_beast_admin_message_route()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_thread public.beast_admin_message_threads%rowtype;
begin
  select *
  into selected_thread
  from public.beast_admin_message_threads
  where id = new.thread_id;

  if not found then
    raise exception 'Private administrative thread is unavailable'
      using errcode = 'P0002';
  end if;

  if new.sender_role = 'member' then
    if new.sender_user_id <> selected_thread.member_id
      or new.recipient_user_id <> selected_thread.assigned_admin_id
    then
      raise exception 'Member messages may only be sent to Beast Administration'
        using errcode = '42501';
    end if;
  else
    if new.recipient_user_id <> selected_thread.member_id
      or not exists (
        select 1
        from public.profiles profile
        where profile.id = new.sender_user_id
          and profile.role = 'admin'
      )
    then
      raise exception 'Administrative messages require authorized routing'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_beast_admin_message_route
  on public.beast_admin_messages;
create trigger validate_beast_admin_message_route
  before insert on public.beast_admin_messages
  for each row
  execute function public.validate_beast_admin_message_route();

create or replace function public.protect_beast_admin_message_history()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Private administrative message history cannot be deleted'
      using errcode = '55000';
  end if;

  if new.id is distinct from old.id
    or new.thread_id is distinct from old.thread_id
    or new.sender_user_id is distinct from old.sender_user_id
    or new.sender_role is distinct from old.sender_role
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at
    or old.read_at is not null
    or new.read_at is null
  then
    raise exception
      'Private administrative messages are immutable except for first read'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_beast_admin_message_history
  on public.beast_admin_messages;
create trigger protect_beast_admin_message_history
  before update or delete on public.beast_admin_messages
  for each row
  execute function public.protect_beast_admin_message_history();

create or replace function public.build_beast_admin_message_thread(
  selected_thread_id uuid,
  include_messages boolean,
  admin_view boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', thread.id,
    'memberId', thread.member_id,
    'memberName', coalesce(
      nullif(btrim(profile.display_name), ''),
      nullif(btrim(profile.preferred_name), ''),
      nullif(btrim(profile.full_name), ''),
      nullif(btrim(profile.username), ''),
      'Not provided'
    ),
    'memberEmail', case when admin_view then auth_user.email else null end,
    'assignedAdminId', thread.assigned_admin_id,
    'category', thread.category,
    'status', thread.status,
    'memberArchived', thread.member_archived_at is not null,
    'adminArchived', thread.admin_archived_at is not null,
    'linkedObjectType', thread.linked_object_type,
    'linkedObjectId', thread.linked_object_id,
    'createdAt', thread.created_at,
    'updatedAt', thread.updated_at,
    'lastMessageAt', thread.last_message_at,
    'resolvedAt', thread.resolved_at,
    'unreadCount', (
      select count(*)::integer
      from public.beast_admin_messages unread_message
      where unread_message.thread_id = thread.id
        and unread_message.read_at is null
        and unread_message.sender_role =
          case when admin_view then 'member' else 'admin' end
    ),
    'messageCount', (
      select count(*)::integer
      from public.beast_admin_messages counted_message
      where counted_message.thread_id = thread.id
    ),
    'messages', case
      when include_messages then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', message.id,
              'senderUserId', message.sender_user_id,
              'senderRole', message.sender_role,
              'recipientUserId', message.recipient_user_id,
              'body', message.body,
              'createdAt', message.created_at,
              'readAt', message.read_at,
              'edited', false
            )
            order by message.created_at, message.id
          )
          from public.beast_admin_messages message
          where message.thread_id = thread.id
        ),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end
  )
  into result
  from public.beast_admin_message_threads thread
  left join public.profiles profile on profile.id = thread.member_id
  left join auth.users auth_user on auth_user.id = thread.member_id
  where thread.id = selected_thread_id;

  return result;
end;
$$;

create or replace function public.get_beast_member_admin_thread()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  selected_thread_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select thread.id
  into selected_thread_id
  from public.beast_admin_message_threads thread
  where thread.member_id = auth.uid();

  if selected_thread_id is null then
    return null;
  end if;

  return public.build_beast_admin_message_thread(
    selected_thread_id,
    true,
    false
  );
end;
$$;

create or replace function public.get_beast_admin_message_threads()
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

  select jsonb_build_object(
    'threads',
    coalesce(
      jsonb_agg(
        public.build_beast_admin_message_thread(thread.id, false, true)
        order by
          coalesce(thread.last_message_at, thread.created_at) desc,
          thread.id
      ),
      '[]'::jsonb
    ),
    'threadCount',
    count(thread.id)::integer
  )
  into result
  from public.beast_admin_message_threads thread;

  return result;
end;
$$;

create or replace function public.get_beast_admin_message_thread(
  selected_thread_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  return public.build_beast_admin_message_thread(
    selected_thread_id,
    true,
    true
  );
end;
$$;

create or replace function public.send_beast_admin_message(
  selected_member_id uuid,
  selected_body text,
  selected_category text default 'support',
  selected_link_type text default null,
  selected_link_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_profile_admin();
  target_member_id uuid;
  selected_admin_id uuid;
  selected_thread_id uuid;
  recipient_id uuid;
  inserted_message_id uuid;
  normalized_body text := btrim(coalesce(selected_body, ''));
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if char_length(normalized_body) not between 1 and 5000
    or normalized_body ~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]'
    or normalized_body ~*
      '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|form)([[:space:]>])'
    or normalized_body ~* 'javascript[[:space:]]*:'
  then
    raise exception 'Message must be safe plain text between 1 and 5000 characters'
      using errcode = '22023';
  end if;

  if selected_category not in (
    'account', 'support', 'problem', 'feedback', 'access', 'other'
  ) then
    raise exception 'Unsupported administrative message category'
      using errcode = '22023';
  end if;

  if (
      selected_link_type is null and selected_link_id is not null
    ) or (
      selected_link_type is not null and selected_link_id is null
    )
  then
    raise exception 'Administrative links require both type and ID'
      using errcode = '22023';
  end if;

  if not actor_is_admin
    and (selected_link_type is not null or selected_link_id is not null)
  then
    raise exception 'Only Beast Administration can link administrative work'
      using errcode = '42501';
  end if;

  if actor_is_admin then
    target_member_id := selected_member_id;
    selected_admin_id := actor_id;
  else
    target_member_id := actor_id;
    select profile.id
    into selected_admin_id
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    where profile.role = 'admin'
      and auth_user.deleted_at is null
    order by profile.created_at, profile.id
    limit 1;
  end if;

  if target_member_id is null
    or not exists (
      select 1
      from public.profiles target_profile
      join auth.users target_auth on target_auth.id = target_profile.id
      where target_profile.id = target_member_id
        and target_profile.account_kind = 'member'
        and target_auth.deleted_at is null
    )
  then
    raise exception 'The selected Beast member account is unavailable'
      using errcode = 'P0002';
  end if;

  if not actor_is_admin
    and exists (
      select 1
      from auth.users actor_auth
      where actor_auth.id = actor_id
        and actor_auth.banned_until is not null
        and actor_auth.banned_until > now()
    )
  then
    raise exception 'Suspended accounts cannot send private messages'
      using errcode = '42501';
  end if;

  if selected_admin_id is null then
    raise exception 'Beast Administration is not available'
      using errcode = 'P0002';
  end if;

  if (
    select count(*)
    from public.beast_admin_messages recent_message
    where recent_message.sender_user_id = actor_id
      and recent_message.created_at >= now() - interval '1 minute'
  ) >= 10 then
    raise exception 'Message rate limit reached. Wait a moment and try again.'
      using errcode = 'P0001';
  end if;

  if selected_link_type = 'feedback'
    and not exists (
      select 1
      from public.learning_feedback feedback
      where feedback.id = selected_link_id
        and feedback.user_id = target_member_id
    )
  then
    raise exception 'The selected feedback record is unavailable'
      using errcode = 'P0002';
  elsif selected_link_type = 'account_action'
    and not exists (
      select 1
      from public.beast_admin_member_account_audit_events audit_event
      where audit_event.id = selected_link_id
        and audit_event.member_id = target_member_id
    )
  then
    raise exception 'The selected account action is unavailable'
      using errcode = 'P0002';
  elsif selected_link_type = 'roadmap'
    and not exists (
      select 1
      from public.beast_admin_roadmap_items roadmap
      where roadmap.id = selected_link_id
        and roadmap.user_id = actor_id
    )
  then
    raise exception 'The selected roadmap work is unavailable'
      using errcode = 'P0002';
  elsif selected_link_type is not null
    and selected_link_type not in ('feedback', 'account_action', 'roadmap')
  then
    raise exception 'Unsupported administrative link type'
      using errcode = '22023';
  end if;

  insert into public.beast_admin_message_threads (
    member_id,
    assigned_admin_id,
    category,
    linked_object_type,
    linked_object_id,
    created_by
  )
  values (
    target_member_id,
    selected_admin_id,
    selected_category,
    selected_link_type,
    selected_link_id,
    actor_id
  )
  on conflict (member_id) do update
  set
    category = excluded.category,
    linked_object_type = case
      when actor_is_admin and selected_link_type is not null
        then selected_link_type
      else beast_admin_message_threads.linked_object_type
    end,
    linked_object_id = case
      when actor_is_admin and selected_link_id is not null
        then selected_link_id
      else beast_admin_message_threads.linked_object_id
    end,
    updated_at = timezone('utc', now())
  returning id, assigned_admin_id
  into selected_thread_id, selected_admin_id;

  recipient_id := case
    when actor_is_admin then target_member_id
    else selected_admin_id
  end;

  insert into public.beast_admin_messages (
    thread_id,
    sender_user_id,
    sender_role,
    recipient_user_id,
    body
  )
  values (
    selected_thread_id,
    actor_id,
    case when actor_is_admin then 'admin' else 'member' end,
    recipient_id,
    normalized_body
  )
  returning id into inserted_message_id;

  update public.beast_admin_message_threads
  set
    status = case when actor_is_admin then status else 'open' end,
    resolved_at = case when actor_is_admin then resolved_at else null end,
    member_archived_at = case
      when actor_is_admin then null
      else member_archived_at
    end,
    admin_archived_at = case
      when actor_is_admin then admin_archived_at
      else null
    end,
    last_message_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = selected_thread_id;

  insert into public.beast_admin_message_notifications (
    user_id,
    thread_id,
    message_id,
    title,
    summary,
    action_url
  )
  values (
    recipient_id,
    selected_thread_id,
    inserted_message_id,
    case
      when actor_is_admin then 'Message from Beast Administration'
      else 'Member support message'
    end,
    case
      when actor_is_admin
        then 'Beast Administration sent you a private account or support message.'
      else 'A Beast member sent a private account or support message.'
    end,
    case
      when actor_is_admin then '/dashboard/messages'
      else '/dashboard/admin/messages'
    end
  );

  if actor_is_admin and selected_category = 'account' then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome,
      reason
    )
    values (
      actor_id,
      target_member_id,
      'admin_account_message_sent',
      jsonb_build_object(
        'source', 'beast_admin_messaging',
        'threadId', selected_thread_id,
        'messageId', inserted_message_id
      ),
      '{}'::jsonb,
      jsonb_build_object(
        'threadId', selected_thread_id,
        'messageId', inserted_message_id,
        'category', selected_category
      ),
      'succeeded',
      'Private account message sent; body excluded from audit.'
    );
  end if;

  return public.build_beast_admin_message_thread(
    selected_thread_id,
    true,
    actor_is_admin
  );
end;
$$;

create or replace function public.mark_beast_admin_message_thread_read(
  selected_thread_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_profile_admin();
  updated_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.beast_admin_message_threads thread
    where thread.id = selected_thread_id
      and (
        (actor_is_admin)
        or thread.member_id = actor_id
      )
  ) then
    raise exception 'Private administrative thread is unavailable'
      using errcode = '42501';
  end if;

  with read_messages as (
    update public.beast_admin_messages message
    set read_at = timezone('utc', now())
    where message.thread_id = selected_thread_id
      and message.read_at is null
      and message.sender_role =
        case when actor_is_admin then 'member' else 'admin' end
    returning message.id
  )
  select count(*)::integer into updated_count from read_messages;

  update public.beast_admin_message_notifications notification
  set
    state = 'Read',
    read_at = coalesce(notification.read_at, timezone('utc', now()))
  where notification.message_id in (
    select message.id
    from public.beast_admin_messages message
    where message.thread_id = selected_thread_id
      and message.read_at is not null
      and message.sender_role =
        case when actor_is_admin then 'member' else 'admin' end
  )
    and notification.state = 'Unread';

  return updated_count;
end;
$$;

create or replace function public.update_beast_admin_message_thread(
  selected_thread_id uuid,
  selected_action text,
  selected_link_type text default null,
  selected_link_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_profile_admin();
  target_member_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select thread.member_id
  into target_member_id
  from public.beast_admin_message_threads thread
  where thread.id = selected_thread_id
    and (
      actor_is_admin
      or thread.member_id = actor_id
    )
  for update;

  if target_member_id is null then
    raise exception 'Private administrative thread is unavailable'
      using errcode = '42501';
  end if;

  if selected_action = 'member_archive' and not actor_is_admin then
    update public.beast_admin_message_threads
    set
      member_archived_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif selected_action = 'member_reopen' and not actor_is_admin then
    update public.beast_admin_message_threads
    set
      member_archived_at = null,
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'resolve' then
    update public.beast_admin_message_threads
    set
      status = 'resolved',
      resolved_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'reopen' then
    update public.beast_admin_message_threads
    set
      status = 'open',
      resolved_at = null,
      admin_archived_at = null,
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'admin_archive' then
    update public.beast_admin_message_threads
    set
      admin_archived_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'admin_unarchive' then
    update public.beast_admin_message_threads
    set
      admin_archived_at = null,
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'link' then
    if selected_link_type = 'feedback'
      and not exists (
        select 1 from public.learning_feedback feedback
        where feedback.id = selected_link_id
          and feedback.user_id = target_member_id
      )
    then
      raise exception 'The selected feedback record is unavailable'
        using errcode = 'P0002';
    elsif selected_link_type = 'account_action'
      and not exists (
        select 1
        from public.beast_admin_member_account_audit_events audit_event
        where audit_event.id = selected_link_id
          and audit_event.member_id = target_member_id
      )
    then
      raise exception 'The selected account action is unavailable'
        using errcode = 'P0002';
    elsif selected_link_type = 'roadmap'
      and not exists (
        select 1
        from public.beast_admin_roadmap_items roadmap
        where roadmap.id = selected_link_id
          and roadmap.user_id = actor_id
      )
    then
      raise exception 'The selected roadmap work is unavailable'
        using errcode = 'P0002';
    elsif selected_link_type not in (
      'feedback', 'account_action', 'roadmap'
    ) or selected_link_id is null then
      raise exception 'Administrative link type and ID are required'
        using errcode = '22023';
    end if;

    update public.beast_admin_message_threads
    set
      linked_object_type = selected_link_type,
      linked_object_id = selected_link_id,
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  elsif actor_is_admin and selected_action = 'unlink' then
    update public.beast_admin_message_threads
    set
      linked_object_type = null,
      linked_object_id = null,
      updated_at = timezone('utc', now())
    where id = selected_thread_id;
  else
    raise exception 'Unsupported private message thread action'
      using errcode = '42501';
  end if;

  return public.build_beast_admin_message_thread(
    selected_thread_id,
    true,
    actor_is_admin
  );
end;
$$;

create or replace function public.get_beast_admin_message_unread_count()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_profile_admin();
  result integer;
begin
  if actor_id is null then
    return 0;
  end if;

  select count(*)::integer
  into result
  from public.beast_admin_messages message
  join public.beast_admin_message_threads thread
    on thread.id = message.thread_id
  where message.read_at is null
    and (
      (
        actor_is_admin
        and message.sender_role = 'member'
      )
      or (
        not actor_is_admin
        and thread.member_id = actor_id
        and message.sender_role = 'admin'
      )
    );

  return coalesce(result, 0);
end;
$$;

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_action_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_action_check check (
    action in (
      'account_updated',
      'email_verification_resent',
      'invitation_sent',
      'invitation_resent',
      'invitation_revoked',
      'invitation_accepted',
      'email_changed',
      'role_changed',
      'account_suspended',
      'account_restored',
      'module_access_changed',
      'beta_assignment_changed',
      'password_reset_triggered',
      'beastos_sessions_revoked',
      'fresh_sign_in_required',
      'suspicious_activity_flagged',
      'suspicious_activity_cleared',
      'account_deletion_requested',
      'account_deletion_canceled',
      'admin_account_message_sent'
    )
  );

revoke all on table public.beast_admin_message_threads from anon;
revoke all on table public.beast_admin_message_threads from authenticated;
grant select on table public.beast_admin_message_threads to authenticated;

revoke all on table public.beast_admin_messages from anon;
revoke all on table public.beast_admin_messages from authenticated;
grant select on table public.beast_admin_messages to authenticated;

revoke all on table public.beast_admin_message_notifications from anon;
revoke all on table public.beast_admin_message_notifications
  from authenticated;
grant select on table public.beast_admin_message_notifications
  to authenticated;

revoke all on function public.validate_beast_admin_message_route()
  from public;
revoke all on function public.protect_beast_admin_message_history()
  from public;
revoke all on function public.build_beast_admin_message_thread(
  uuid,
  boolean,
  boolean
) from public;
revoke all on function public.get_beast_member_admin_thread()
  from public;
revoke all on function public.get_beast_admin_message_threads()
  from public;
revoke all on function public.get_beast_admin_message_thread(uuid)
  from public;
revoke all on function public.send_beast_admin_message(
  uuid,
  text,
  text,
  text,
  uuid
) from public;
revoke all on function public.mark_beast_admin_message_thread_read(uuid)
  from public;
revoke all on function public.update_beast_admin_message_thread(
  uuid,
  text,
  text,
  uuid
) from public;
revoke all on function public.get_beast_admin_message_unread_count()
  from public;

grant execute on function public.get_beast_member_admin_thread()
  to authenticated;
grant execute on function public.get_beast_admin_message_threads()
  to authenticated;
grant execute on function public.get_beast_admin_message_thread(uuid)
  to authenticated;
grant execute on function public.send_beast_admin_message(
  uuid,
  text,
  text,
  text,
  uuid
) to authenticated;
grant execute on function public.mark_beast_admin_message_thread_read(uuid)
  to authenticated;
grant execute on function public.update_beast_admin_message_thread(
  uuid,
  text,
  text,
  uuid
) to authenticated;
grant execute on function public.get_beast_admin_message_unread_count()
  to authenticated;
