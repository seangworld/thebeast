-- BA-112: owner-only, read-only inspection of persisted professional
-- understanding. The function returns durable memory, structured education
-- profile state, and explicit unresolved follow-ups. It never returns raw
-- conversation messages or hidden model reasoning.

create or replace function public.get_beast_admin_knowledge_inspector(
  selected_member_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  member_record jsonb;
  education_profile_record jsonb;
  memory_records jsonb;
  follow_up_records jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', profile.id,
    'displayName', coalesce(
      nullif(btrim(profile.preferred_name), ''),
      nullif(btrim(profile.display_name), ''),
      nullif(btrim(profile.full_name), ''),
      nullif(btrim(profile.username), ''),
      'Member'
    ),
    'email', auth_user.email,
    'role', profile.role
  )
  into member_record
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  where profile.id = selected_member_id;

  if member_record is null then
    raise exception 'Member knowledge is not available'
      using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'goal', education.goal,
    'currentSituation', education.current_situation,
    'strengths', education.strengths,
    'growthAreas', education.growth_areas,
    'constraints', education.constraints,
    'weeklyHours', education.weekly_hours,
    'availableStudyTimeKnown', education.available_study_time_known,
    'selectedProviders', education.selected_providers,
    'careerInterests', education.career_interests,
    'educationalGoals', education.educational_goals,
    'learningPreferences', education.learning_preferences,
    'certifications', education.certifications,
    'collegeInterest', education.college_interest,
    'tradeInterest', education.trade_interest,
    'currentEmployment', education.current_employment,
    'militaryExperience', education.military_experience,
    'otherEducationalContext', education.other_educational_context,
    'updatedAt', education.updated_at
  )
  into education_profile_record
  from public.education_profiles education
  where education.owner_id = selected_member_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', memory.id,
        'professionalId', memory.agent_id,
        'scope', memory.scope,
        'key', memory.memory_key,
        'value', memory.value,
        'purpose', memory.purpose,
        'evidence', memory.evidence,
        'sourceConversationId', memory.source_conversation_id,
        'sourceMessageId', memory.source_message_id,
        'expiresAt', memory.expires_at,
        'createdAt', memory.created_at,
        'updatedAt', memory.updated_at
      )
      order by memory.updated_at desc, memory.id
    ),
    '[]'::jsonb
  )
  into memory_records
  from public.agent_memories memory
  where memory.owner_id = selected_member_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', conversation.id || '-follow-up-' || follow_up.position::text,
        'professionalId', conversation.agent_id,
        'question', follow_up.question,
        'conversationTitle', conversation.title,
        'updatedAt', conversation.updated_at
      )
      order by conversation.updated_at desc, conversation.id, follow_up.position
    ),
    '[]'::jsonb
  )
  into follow_up_records
  from public.agent_conversations conversation
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(conversation.summary -> 'unresolvedFollowUps') = 'array'
        then conversation.summary -> 'unresolvedFollowUps'
      else '[]'::jsonb
    end
  ) with ordinality as follow_up(question, position)
  where conversation.owner_id = selected_member_id
    and nullif(btrim(follow_up.question), '') is not null;

  return jsonb_build_object(
    'member', member_record,
    'educationProfile', education_profile_record,
    'memories', memory_records,
    'conversationFollowUps', follow_up_records
  );
end;
$$;

revoke all on function public.get_beast_admin_knowledge_inspector(uuid)
  from public;
grant execute on function public.get_beast_admin_knowledge_inspector(uuid)
  to authenticated;

notify pgrst, 'reload schema';
