import { advisorGoalColumns, advisorGoalFilters } from "../platform/goalConnections";
import type { SupabaseClient } from "@supabase/supabase-js";

export const guidanceCounselorEducationProfileColumns =
  "goal_kind, goal, current_situation, background, strengths, growth_areas, constraints, weekly_hours, discovery_answers, selected_providers, updated_at";

export const guidanceCounselorCareerProfileItemColumns =
  "id, phase, category, label, value, verification_status, confidence, occurred_on, source_type, source_reference, updated_at";

// Keep profile context bounded and add up to 20 relevant member goals for advice.
export function guidanceCounselorContextQueries(client: Pick<SupabaseClient, "from">, ownerId: string) {
  return [
    client.from("education_profiles").select(guidanceCounselorEducationProfileColumns).eq("owner_id", ownerId).limit(1),
    client.from("education_career_profile_items").select(guidanceCounselorCareerProfileItemColumns)
      .eq("owner_id", ownerId).is("archived_at", null)
      .in("verification_status", ["verified", "member_reported"])
      .order("updated_at", { ascending: false }).limit(19),
    client.from("beast_goals").select(advisorGoalColumns).eq("owner_id", ownerId).or(advisorGoalFilters.learning)
      .is("deleted_at", null).neq("status", "Archived").order("updated_at", { ascending: false }).limit(20),
  ];
}
