import type { GuidanceDiscoveryProfile } from "./discoveryConversation";
import { buildGuidanceCounselorUnderstanding } from "./guidanceUnderstanding";

export type GuidanceCareerGoalProposal = {
  title: string;
  category: "Career";
  status: "Proposed";
  summary: string;
  current_step: string;
  source_module: "learning";
};

function normalizeGoalTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildGuidanceCareerGoalProposal(
  profile: GuidanceDiscoveryProfile
): GuidanceCareerGoalProposal | undefined {
  const career = buildGuidanceCounselorUnderstanding(profile).items.find(
    (item) => item.area === "career-goals"
  );
  const title = profile.goal.trim().replace(/[.!?]+$/, "");
  if (
    career?.state !== "known" ||
    career.confidence !== "high" ||
    title.length < 3 ||
    title.length > 160 ||
    /\b(?:not sure|unsure|do not know|don't know)\b/i.test(title)
  ) {
    return undefined;
  }

  return {
    title,
    category: "Career",
    status: "Proposed",
    summary:
      "Proposed from a verified career goal stated in a Guidance Counselor conversation. Review it in Beast Goals before treating it as active.",
    current_step: "Review this proposed career goal in Beast Goals.",
    source_module: "learning",
  };
}

export function hasMatchingGuidanceCareerGoal(
  proposal: GuidanceCareerGoalProposal,
  goals: readonly { title?: string | null; status?: string | null }[]
) {
  const target = normalizeGoalTitle(proposal.title);
  return goals.some(
    (goal) =>
      goal.status !== "Archived" &&
      normalizeGoalTitle(String(goal.title || "")) === target
  );
}
