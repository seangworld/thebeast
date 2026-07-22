create table if not exists public.agent_conversations (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null,
  title text not null default 'New conversation',
  pinned boolean not null default false,
  archived boolean not null default false,
  tags text[] not null default '{}',
  summary jsonb not null default '{"overview":"No conversation summary yet.","decisions":[],"unresolvedFollowUps":[]}'::jsonb,
  related_insight_ids text[] not null default '{}',
  related_action_ids text[] not null default '{}',
  message_count integer not null default 0 check (message_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_conversation_messages (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null references public.agent_conversations(id) on delete cascade,
  sender jsonb not null,
  recipient jsonb not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_memories (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null,
  scope text not null,
  memory_key text not null,
  value jsonb not null,
  purpose text not null,
  evidence jsonb not null default '[]'::jsonb,
  source_conversation_id text references public.agent_conversations(id) on delete set null,
  source_message_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_conversations_owner_agent_updated_idx
  on public.agent_conversations (owner_id, agent_id, updated_at desc);
create index if not exists agent_conversation_messages_conversation_created_idx
  on public.agent_conversation_messages (conversation_id, created_at);
create index if not exists agent_memories_owner_agent_updated_idx
  on public.agent_memories (owner_id, agent_id, updated_at desc);

alter table public.agent_conversations enable row level security;
alter table public.agent_conversation_messages enable row level security;
alter table public.agent_memories enable row level security;

create policy "Owners manage their agent conversations"
on public.agent_conversations for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners manage their agent conversation messages"
on public.agent_conversation_messages for all
using (
  auth.uid() = owner_id
  and exists (
    select 1 from public.agent_conversations conversation
    where conversation.id = conversation_id and conversation.owner_id = auth.uid()
  )
)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.agent_conversations conversation
    where conversation.id = conversation_id and conversation.owner_id = auth.uid()
  )
);

create policy "Owners manage their agent memories"
on public.agent_memories for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
