import type { GuidanceDiscoveryProfile } from "./discoveryConversation";

export type ConversationProfileItem = {
  phase: "past" | "present" | "goal";
  category: string;
  label: string;
  value: string;
  sourceReference: string;
};

function joined(values: readonly string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join("; ");
}
export function guidanceConversationProfileItems(
  profile: GuidanceDiscoveryProfile
): ConversationProfileItem[] {
  const candidates: Array<ConversationProfileItem & { value: string }> = [
    { phase: "past", category: "school", label: "Schools attended", value: joined(profile.schools), sourceReference: "guidance:schools" },
    { phase: "past", category: "degree", label: "Degrees and diplomas", value: joined(profile.degrees), sourceReference: "guidance:degrees" },
    { phase: "past", category: "training", label: "Education history", value: joined(profile.educationHistory), sourceReference: "guidance:education-history" },
    { phase: "past", category: "military", label: "Military experience", value: profile.militaryExperience, sourceReference: "guidance:military-experience" },
    { phase: "past", category: "training", label: "Military education and training", value: joined(profile.militaryTraining), sourceReference: "guidance:military-training" },
    { phase: "past", category: "employment", label: "Experience", value: joined(profile.experience), sourceReference: "guidance:experience" },
    { phase: "present", category: "role", label: "Current situation", value: profile.currentSituation, sourceReference: "guidance:current-situation" },
    { phase: "present", category: "employment", label: "Current employment", value: profile.currentEmployment, sourceReference: "guidance:current-employment" },
    { phase: "present", category: "certification", label: "Current certifications", value: joined(profile.certifications), sourceReference: "guidance:certifications" },
    { phase: "present", category: "skill", label: "Current skills", value: joined(profile.skills), sourceReference: "guidance:skills" },
    { phase: "present", category: "strength", label: "Strengths", value: profile.strengths, sourceReference: "guidance:strengths" },
    { phase: "present", category: "interest", label: "Career interests", value: joined(profile.careerInterests), sourceReference: "guidance:career-interests" },
    { phase: "present", category: "schedule", label: "Available study or preparation time", value: profile.availableStudyTimeKnown ? `${profile.weeklyHours} hours per week` : "", sourceReference: "guidance:study-time" },
    { phase: "present", category: "budget", label: "Education budget", value: profile.educationBudget, sourceReference: "guidance:budget" },
    { phase: "present", category: "family", label: "Family considerations", value: profile.familyConsiderations, sourceReference: "guidance:family" },
    { phase: "present", category: "geography", label: "Location preference", value: profile.workLocationPreference, sourceReference: "guidance:location" },
    { phase: "present", category: "work_environment", label: "Preferred work", value: profile.preferredWork, sourceReference: "guidance:preferred-work" },
    { phase: "present", category: "work_environment", label: "Sector preference", value: profile.sectorPreference, sourceReference: "guidance:sector" },
    { phase: "present", category: "constraint", label: "Travel willingness", value: profile.travelWillingness, sourceReference: "guidance:travel" },
    { phase: "present", category: "constraint", label: "Practical constraints", value: profile.constraints, sourceReference: "guidance:constraints" },
    { phase: "goal", category: "career_goal", label: "Primary career goal", value: profile.goal, sourceReference: "guidance:goal" },
    { phase: "goal", category: "education_goal", label: "Education goals", value: joined(profile.educationalGoals), sourceReference: "guidance:education-goals" },
    { phase: "goal", category: "income", label: "Income goal", value: profile.incomeGoal, sourceReference: "guidance:income-goal" },
    { phase: "goal", category: "timeline", label: "Target timeline", value: profile.targetTimeline, sourceReference: "guidance:timeline" },
    { phase: "goal", category: "career_goal", label: "Long-term vision", value: profile.longTermGoals, sourceReference: "guidance:long-term" },
  ];
  return candidates
    .map((item) => ({ ...item, value: item.value.trim() }))
    .filter((item) => item.value.length > 0);
}
