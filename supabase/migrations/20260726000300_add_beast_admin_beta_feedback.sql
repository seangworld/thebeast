-- BA-105: owner-managed beta feedback lifecycle, roadmap linkage, and
-- durable member notification when submitted feedback is released.

alter table public.learning_feedback
  add column if not exists roadmap_item_id uuid null,
  add column if not exists owner_response text not null default '',
  add column if not exists acknowledged_at timestamptz null,
  add column if not exists planned_at timestamptz null,
  add column if not exists started_at timestamptz null,
  add column if not exists released_at timestamptz null,
  add column if not exists declined_at timestamptz null,
  add column if not exists member_notified_at timestamptz null,
  add column if not exists updated_at timestamptz not null default now();

update public.learning_feedback
set status = case
  when status = 'Reviewing' then 'Acknowledged'
  when status in ('Completed', 'Resolved') then 'Released'
  when status in (
    'New',
    'Acknowledged',
    'Planned',
    'In Progress',
    'Released',
    'Declined'
  ) then status
  else 'New'
end;

alter table public.learning_feedback
  drop constraint if exists learning_feedback_status_check;

alter table public.learning_feedback
  add constraint learning_feedback_status_check check (
    status in (
      'New',
      'Acknowledged',
      'Planned',
      'In Progress',
      'Released',
      'Declined'
    )
  );

alter table public.learning_feedback
  drop constraint if exists learning_feedback_roadmap_item_fk;

alter table public.learning_feedback
  add constraint learning_feedback_roadmap_item_fk
  foreign key (roadmap_item_id)
  references public.beast_admin_roadmap_items(id)
  on delete set null;

create index if not exists learning_feedback_status_updated_idx
  on public.learning_feedback (status, updated_at desc);

create index if not exists learning_feedback_roadmap_item_idx
  on public.learning_feedback (roadmap_item_id)
  where roadmap_item_id is not null;

create or replace function public.set_learning_feedback_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_learning_feedback_updated_at
  on public.learning_feedback;
create trigger set_learning_feedback_updated_at
  before update on public.learning_feedback
  for each row
  execute function public.set_learning_feedback_updated_at();

create table if not exists public.beast_member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'admin_feedback',
  source_record_id uuid not null
    references public.learning_feedback(id) on delete cascade,
  title text not null,
  summary text not null,
  action_url text not null default '/dashboard/releases',
  state text not null default 'Unread',
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint beast_member_notifications_source_check check (
    source = 'admin_feedback'
  ),
  constraint beast_member_notifications_state_check check (
    state in ('Unread', 'Read', 'Dismissed')
  ),
  constraint beast_member_notifications_source_record_unique unique (
    source_record_id
  )
);

create index if not exists beast_member_notifications_user_created_idx
  on public.beast_member_notifications (user_id, created_at desc);

alter table public.beast_member_notifications enable row level security;

drop policy if exists "Members read own Beast notifications"
  on public.beast_member_notifications;
create policy "Members read own Beast notifications"
  on public.beast_member_notifications
  for select
  using (auth.uid() = user_id);

revoke update on public.beast_member_notifications from authenticated;
grant select on public.beast_member_notifications to authenticated;

create or replace function public.mark_beast_member_notification_read(
  selected_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.beast_member_notifications notification
  set
    state = 'Read',
    read_at = coalesce(notification.read_at, now())
  where notification.id = selected_notification_id
    and notification.user_id = auth.uid()
    and notification.state = 'Unread';

  return found;
end;
$$;

create or replace function public.get_beast_admin_beta_feedback()
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
        'id', feedback.id,
        'userId', feedback.user_id,
        'memberName', coalesce(
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.display_name), ''),
          nullif(btrim(profile.full_name), ''),
          nullif(btrim(profile.username), ''),
          nullif(split_part(auth_user.email, '@', 1), ''),
          'Member'
        ),
        'memberEmail', auth_user.email,
        'category', feedback.category,
        'message', feedback.message,
        'context', coalesce(feedback.context, ''),
        'status', feedback.status,
        'roadmapItem', case
          when roadmap.id is null then null
          else jsonb_build_object(
            'id', roadmap.id,
            'title', roadmap.title,
            'productId', roadmap.product_id,
            'status', roadmap.status
          )
        end,
        'ownerResponse', feedback.owner_response,
        'submittedAt', feedback.created_at,
        'updatedAt', feedback.updated_at,
        'releasedAt', feedback.released_at,
        'memberNotifiedAt', feedback.member_notified_at
      )
      order by feedback.updated_at desc, feedback.created_at desc, feedback.id
    ),
    '[]'::jsonb
  )
  into result
  from public.learning_feedback feedback
  left join public.profiles profile on profile.id = feedback.user_id
  left join auth.users auth_user on auth_user.id = feedback.user_id
  left join public.beast_admin_roadmap_items roadmap
    on roadmap.id = feedback.roadmap_item_id;

  return result;
end;
$$;

create or replace function public.update_beast_admin_feedback(
  selected_feedback_id uuid,
  next_status text,
  selected_roadmap_item_id uuid default null,
  response text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  feedback_user_id uuid;
  roadmap_title text;
  notification_created boolean := false;
  normalized_response text := btrim(coalesce(response, ''));
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if next_status is null or next_status not in (
    'New',
    'Acknowledged',
    'Planned',
    'In Progress',
    'Released',
    'Declined'
  ) then
    raise exception 'Unsupported feedback lifecycle status'
      using errcode = '22023';
  end if;

  select feedback.user_id
  into feedback_user_id
  from public.learning_feedback feedback
  where feedback.id = selected_feedback_id
  for update;

  if not found then
    raise exception 'Feedback is no longer available'
      using errcode = 'P0002';
  end if;

  if selected_roadmap_item_id is not null then
    select roadmap.title
    into roadmap_title
    from public.beast_admin_roadmap_items roadmap
    where roadmap.id = selected_roadmap_item_id
      and roadmap.user_id = auth.uid();

    if roadmap_title is null then
      raise exception 'Roadmap item is not available to this owner'
        using errcode = '42501';
    end if;
  end if;

  if next_status in ('Planned', 'In Progress', 'Released')
    and selected_roadmap_item_id is null then
    raise exception 'A roadmap item is required for this feedback status'
      using errcode = '23514';
  end if;

  update public.learning_feedback
  set
    status = next_status,
    roadmap_item_id = selected_roadmap_item_id,
    owner_response = normalized_response,
    acknowledged_at = case
      when next_status = 'Acknowledged' then coalesce(acknowledged_at, now())
      else acknowledged_at
    end,
    planned_at = case
      when next_status = 'Planned' then coalesce(planned_at, now())
      else planned_at
    end,
    started_at = case
      when next_status = 'In Progress' then coalesce(started_at, now())
      else started_at
    end,
    released_at = case
      when next_status = 'Released' then coalesce(released_at, now())
      else released_at
    end,
    declined_at = case
      when next_status = 'Declined' then coalesce(declined_at, now())
      else declined_at
    end
  where id = selected_feedback_id;

  if next_status = 'Released' and feedback_user_id is not null then
    insert into public.beast_member_notifications (
      user_id,
      source,
      source_record_id,
      title,
      summary,
      action_url,
      state
    )
    values (
      feedback_user_id,
      'admin_feedback',
      selected_feedback_id,
      'Your feedback was implemented',
      case
        when normalized_response <> '' then normalized_response
        else 'The feedback you shared is now part of “'
          || roadmap_title
          || '.” Thank you for helping improve Beast.'
      end,
      '/dashboard/releases',
      'Unread'
    )
    on conflict (source_record_id) do update
    set
      title = excluded.title,
      summary = excluded.summary,
      action_url = excluded.action_url;

    update public.learning_feedback
    set member_notified_at = coalesce(member_notified_at, now())
    where id = selected_feedback_id;

    notification_created := true;
  end if;

  return jsonb_build_object(
    'feedbackId', selected_feedback_id,
    'status', next_status,
    'notificationCreated', notification_created
  );
end;
$$;

revoke all on function public.get_beast_admin_beta_feedback() from public;
revoke all on function public.update_beast_admin_feedback(
  uuid,
  text,
  uuid,
  text
) from public;
revoke all on function public.mark_beast_member_notification_read(uuid)
  from public;

grant execute on function public.get_beast_admin_beta_feedback()
  to authenticated;
grant execute on function public.update_beast_admin_feedback(
  uuid,
  text,
  uuid,
  text
) to authenticated;
grant execute on function public.mark_beast_member_notification_read(uuid)
  to authenticated;
