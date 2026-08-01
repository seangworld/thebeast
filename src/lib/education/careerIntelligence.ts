export const educationCareerProfilePhases = ["past", "present", "goal"] as const;
export type EducationCareerProfilePhase = (typeof educationCareerProfilePhases)[number];

export const qualificationStates = [
  "required",
  "preferred",
  "helpful",
  "unknown",
  "possessed",
] as const;
export type QualificationState = (typeof qualificationStates)[number];

export type EducationCareerProfileItem = {
  id: string;
  phase: EducationCareerProfilePhase;
  category: string;
  label: string;
  value: string;
  sourceType: "member" | "conversation" | "form" | "document" | "goal" | "outcome" | "research";
  sourceReference?: string;
  verificationStatus: "verified" | "member_reported" | "proposed" | "rejected";
  confidence: number;
  occurredOn?: string;
  updatedAt: string;
};

export type GoalRequirement = {
  id: string;
  label: string;
  description: string;
  state: Exclude<QualificationState, "possessed">;
  category:
    | "education"
    | "certification"
    | "license"
    | "skill"
    | "experience"
    | "application"
    | "time"
    | "cost"
    | "geography"
    | "dependency";
  jurisdiction?: string;
  evidence?: string;
  sourceRetrievedAt?: string;
};

export type GapAnalysisItem = GoalRequirement & {
  result: QualificationState;
  matchedProfileItemIds: readonly string[];
  explanation: string;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function termSet(value: string) {
  return new Set(
    normalized(value)
      .split(/[^a-z0-9+#.]+/)
      .filter((term) => term.length > 2)
  );
}

function isLikelyMatch(requirement: GoalRequirement, item: EducationCareerProfileItem) {
  const requiredTerms = termSet(`${requirement.label} ${requirement.description}`);
  const itemTerms = termSet(`${item.label} ${item.value}`);
  if (!requiredTerms.size || !itemTerms.size) return false;
  const overlap = Array.from(requiredTerms).filter((term) => itemTerms.has(term));
  return overlap.length >= Math.min(2, requiredTerms.size);
}

export function buildGoalGapAnalysis({
  requirements,
  profileItems,
}: {
  requirements: readonly GoalRequirement[];
  profileItems: readonly EducationCareerProfileItem[];
}): GapAnalysisItem[] {
  return requirements.map((requirement) => {
    const matches = profileItems.filter(
      (item) =>
        item.verificationStatus !== "rejected" && isLikelyMatch(requirement, item)
    );
    if (matches.length) {
      return {
        ...requirement,
        result: "possessed",
        matchedProfileItemIds: matches.map(({ id }) => id),
        explanation:
          "The member profile contains related evidence. Confirm that it satisfies the current employer, school, credential, or licensing authority requirement.",
      };
    }
    return {
      ...requirement,
      result: requirement.state,
      matchedProfileItemIds: [],
      explanation:
        requirement.state === "unknown"
          ? "The requirement varies or has not been verified with a current authoritative source."
          : `No matching ${requirement.category} evidence is currently recorded in the member profile.`,
    };
  });
}

export type PathComparisonFactor =
  | "memberFit"
  | "requiredEducation"
  | "requiredCredentials"
  | "experience"
  | "time"
  | "cost"
  | "schedule"
  | "geography"
  | "remoteAvailability"
  | "incomePotential"
  | "advancement"
  | "risk";

export type CareerPathComparison = {
  id: string;
  title: string;
  factors: Partial<Record<PathComparisonFactor, string>>;
  fitScore?: number;
  confidence?: number;
  sourceName?: string;
  sourceUrl?: string;
  sourceEffectiveOn?: string;
  sourceRetrievedAt?: string;
  jurisdiction?: string;
  limitations?: string;
};

export type RankedCareerPath = CareerPathComparison & {
  rank: number;
  freshness: "current" | "aging" | "stale" | "unknown";
  recommendation: "strongest" | "viable-alternative" | "needs-research";
  explanation: string;
};

export function researchFreshness(
  retrievedAt?: string,
  now = new Date(),
  staleAfterDays = 90
): RankedCareerPath["freshness"] {
  if (!retrievedAt) return "unknown";
  const retrieved = new Date(retrievedAt);
  if (Number.isNaN(retrieved.getTime()) || retrieved > now) return "unknown";
  const days = Math.floor((now.getTime() - retrieved.getTime()) / 86_400_000);
  if (days > staleAfterDays) return "stale";
  return days > Math.floor(staleAfterDays / 2) ? "aging" : "current";
}

export function compareCareerPaths(
  paths: readonly CareerPathComparison[],
  now = new Date()
): RankedCareerPath[] {
  return paths
    .map((path) => {
      const freshness = researchFreshness(path.sourceRetrievedAt, now);
      const score = Math.max(0, Math.min(100, path.fitScore ?? 0));
      const confidence = Math.max(0, Math.min(1, path.confidence ?? 0));
      const evidencePenalty = freshness === "stale" ? 30 : freshness === "unknown" ? 20 : 0;
      return { path, score: score * confidence - evidencePenalty, freshness };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.path.title.localeCompare(right.path.title)
    )
    .map(({ path, freshness }, index) => {
      const needsResearch =
        freshness === "stale" || freshness === "unknown" || !path.sourceUrl;
      return {
        ...path,
        rank: index + 1,
        freshness,
        recommendation: needsResearch
          ? "needs-research"
          : index === 0
            ? "strongest"
            : "viable-alternative",
        explanation: needsResearch
          ? "This path needs current authoritative evidence before it can support a material roadmap decision."
          : index === 0
            ? "This is the strongest currently evidenced fit, not a guaranteed outcome."
            : "This remains a viable alternative with different tradeoffs.",
      };
    });
}

export type ResearchSource = {
  title: string;
  url: string;
  publisher: string;
  publicationOrEffectiveDate?: string;
  retrievedAt: string;
  jurisdiction?: string;
  limitations: string;
  primary: boolean;
};

export type EducationResearchResult = {
  answer: string;
  sources: readonly ResearchSource[];
  stale: boolean;
  limitations: readonly string[];
};

export function validateEducationResearchResult(
  result: EducationResearchResult,
  now = new Date()
) {
  const errors: string[] = [];
  if (!result.answer.trim()) errors.push("Research answer is empty.");
  if (!result.sources.length) errors.push("At least one attributable source is required.");
  if (result.sources.some((source) => !source.url || !source.publisher || !source.retrievedAt)) {
    errors.push("Every source requires a URL, publisher, and retrieval date.");
  }
  if (!result.sources.some((source) => source.primary)) {
    errors.push("At least one primary or authoritative source is required.");
  }
  if (result.sources.some((source) => researchFreshness(source.retrievedAt, now) === "unknown")) {
    errors.push("Source retrieval dates must be valid and cannot be in the future.");
  }
  return { valid: errors.length === 0, errors };
}

const privateResearchPatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b(?:access|refresh|bearer|api)[-_ ]?token\b/i,
];

export function validateExternalEducationResearchQuery(query: string) {
  const clean = query.trim();
  if (clean.length < 3) return { allowed: false, reason: "Add a specific research question." };
  if (clean.length > 800) return { allowed: false, reason: "Limit research to the minimum necessary context." };
  if (privateResearchPatterns.some((pattern) => pattern.test(clean))) {
    return {
      allowed: false,
      reason: "Remove personal identifiers or secrets before external research.",
    };
  }
  return { allowed: true, reason: "Only the submitted question may be sent to the research provider." };
}

export type RoadmapLifecycleStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export function canTransitionEducationRoadmap(
  current: RoadmapLifecycleStatus,
  next: RoadmapLifecycleStatus
) {
  const transitions: Record<RoadmapLifecycleStatus, readonly RoadmapLifecycleStatus[]> = {
    draft: ["active", "archived"],
    active: ["paused", "completed", "archived"],
    paused: ["active", "archived"],
    completed: ["active", "archived"],
    archived: ["draft"],
  };
  return current === next || transitions[current].includes(next);
}

export function materialRoadmapChangeRequiresApproval(change: {
  destination?: string;
  preferredPathId?: string | null;
  removeStepIds?: readonly string[];
  costIncrease?: boolean;
  timelineExtension?: boolean;
}) {
  return Boolean(
    change.destination?.trim() ||
      change.preferredPathId !== undefined ||
      change.removeStepIds?.length ||
      change.costIncrease ||
      change.timelineExtension
  );
}
