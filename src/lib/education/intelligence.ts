import type { AgentEventBus, AgentMemoryRecord, AgentMemoryStore } from "../platform/agents";
import type {
  EducationGoalKind,
  EducationGuidancePlan,
  EducationGuidanceSnapshot,
  EducationProfile,
  EducationProfileSignal,
  EducationRecommendation,
  EducationRoadmapMilestone,
} from "./types";

export type EducationOpportunity = {
  id: string;
  title: string;
  reason: string;
  source: EducationProfileSignal["source"];
  deadline?: string;
  verification: string;
};

export type CertificationStep = {
  id: string;
  title: string;
  prerequisiteIds: readonly string[];
  relevance: string;
  status: "not-started" | "ready" | "complete";
};

export type CareerPathCandidate = {
  id: string;
  title: string;
  requiredSkills: readonly string[];
  typicalOutcomes: readonly string[];
  evidenceSources: readonly string[];
};

export type CareerPathReasoning = {
  careerId: string;
  title: string;
  alignedStrengths: readonly string[];
  skillGaps: readonly string[];
  reasonsToExplore: readonly string[];
  uncertainties: readonly string[];
  evidenceSources: readonly string[];
};

export type EducationGuidancePlaybook = {
  id: string;
  version: string;
  recommend?: (input: {
    profile: EducationProfile;
    plan: EducationGuidancePlan;
    signals: readonly EducationProfileSignal[];
  }) => readonly EducationRecommendation[];
};

const meaningfulSignalKinds = new Set<EducationProfileSignal["kind"]>([
  "situation", "goal", "interest", "strength", "constraint", "progress", "opportunity",
]);

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function signalEvidence(signals: readonly EducationProfileSignal[], kind: EducationProfileSignal["kind"]) {
  return signals.filter((signal) => signal.kind === kind && meaningfulSignalKinds.has(signal.kind));
}

export function buildAdaptiveEducationInterview(
  profile: EducationProfile,
  goalKind: EducationGoalKind,
  signals: readonly EducationProfileSignal[] = [],
) {
  const questions: string[] = [];
  if (!profile.currentSituation.trim()) questions.push("What is your current education, work, and life situation?");
  if (!profile.goals.length) questions.push("What would you like to be different one year from now?");
  if (!profile.strengths.length) questions.push("What do people rely on you for, and what has felt easier to learn?");
  if (!profile.constraints.length) questions.push("What time, cost, location, family, or accessibility limits should the plan respect?");
  if (goalKind === "career" && !profile.careerInterests?.length) questions.push("Which kinds of problems, environments, or responsibilities sound meaningful to you?");
  if (goalKind === "certification") questions.push("What outcome should this certification unlock, and is it required by a real role or program?");
  if (!profile.educationHistory?.length) questions.push("What education, training, credentials, or practical experience should receive credit in your plan?");
  if (signalEvidence(signals, "progress").length) questions.push("What helped this progress happen, and should the roadmap change because of it?");
  return questions.slice(0, 3);
}

export function refineEducationProfile(
  profile: EducationProfile,
  signals: readonly EducationProfileSignal[],
): EducationGuidanceSnapshot["profileRefinements"] {
  return signals.flatMap((signal) => {
    if (signal.confidence === "inferred") return [];
    const field: keyof EducationProfile | null = signal.kind === "goal" ? "goals"
      : signal.kind === "interest" ? "interests"
      : signal.kind === "strength" ? "strengths"
      : signal.kind === "constraint" ? "constraints"
      : signal.kind === "progress" ? "meaningfulProgress"
      : signal.kind === "situation" ? "currentSituation"
      : null;
    if (!field) return [];
    const current = profile[field];
    if (Array.isArray(current) && current.some((value) => value.toLowerCase() === signal.value.toLowerCase())) return [];
    if (typeof current === "string" && current.trim() === signal.value.trim()) return [];
    return [{ field, value: signal.value, evidenceId: signal.id }];
  });
}

export function sequenceCertifications(steps: readonly CertificationStep[]) {
  const completed = new Set(steps.filter((step) => step.status === "complete").map((step) => step.id));
  const remaining = steps.filter((step) => step.status !== "complete");
  return [...remaining].sort((left, right) => {
    const leftReady = left.prerequisiteIds.every((id) => completed.has(id)) ? 1 : 0;
    const rightReady = right.prerequisiteIds.every((id) => completed.has(id)) ? 1 : 0;
    return rightReady - leftReady || left.prerequisiteIds.length - right.prerequisiteIds.length || left.id.localeCompare(right.id);
  });
}

export function reasonAboutCareerPaths(
  profile: EducationProfile,
  candidates: readonly CareerPathCandidate[],
): CareerPathReasoning[] {
  const known = unique([...profile.strengths, ...profile.interests]).map((item) => item.toLowerCase());
  return candidates.map((candidate) => {
    const alignedStrengths = candidate.requiredSkills.filter((skill) =>
      known.some((item) => item.includes(skill.toLowerCase()) || skill.toLowerCase().includes(item)),
    );
    const skillGaps = candidate.requiredSkills.filter((skill) => !alignedStrengths.includes(skill));
    return {
      careerId: candidate.id,
      title: candidate.title,
      alignedStrengths,
      skillGaps,
      reasonsToExplore: unique([
        ...alignedStrengths.map((skill) => `${skill} aligns with known interests or strengths.`),
        ...candidate.typicalOutcomes.map((outcome) => `This path may support ${outcome}; verify that outcome with current role evidence.`),
      ]),
      uncertainties: unique([
        ...(!candidate.evidenceSources.length ? ["No authoritative role evidence has been attached yet."] : []),
        ...(skillGaps.length ? [`The user's current evidence for ${skillGaps.join(", ")} is not yet established.`] : []),
        "Personal fit, local opportunity, compensation, and hiring requirements still require verification.",
      ]),
      evidenceSources: candidate.evidenceSources,
    };
  });
}

export function detectEducationOpportunities(signals: readonly EducationProfileSignal[]): EducationOpportunity[] {
  return signalEvidence(signals, "opportunity").map((signal) => ({
    id: `opportunity-${signal.id}`,
    title: signal.value,
    reason: `A ${signal.source} signal may affect the user's education roadmap.`,
    source: signal.source,
    verification: "Confirm eligibility, deadline, cost, authority, and fit before changing the roadmap.",
  }));
}

export function recognizeEducationMilestones(
  roadmap: readonly EducationRoadmapMilestone[],
  signals: readonly EducationProfileSignal[],
) {
  const progress = signalEvidence(signals, "progress");
  return roadmap.filter((milestone) =>
    milestone.status === "complete" || progress.some((signal) => signal.value.toLowerCase().includes(milestone.title.toLowerCase())),
  ).map((milestone) => milestone.title);
}

function confidenceFor(evidenceCount: number): EducationRecommendation["confidence"] {
  return evidenceCount >= 3 ? "high" : evidenceCount >= 1 ? "medium" : "low";
}

export function buildGuidanceCounselorIntelligence({
  profile,
  plan,
  signals = [],
  playbook,
}: {
  profile: EducationProfile;
  plan: EducationGuidancePlan;
  signals?: readonly EducationProfileSignal[];
  playbook?: EducationGuidancePlaybook;
}): EducationGuidanceSnapshot {
  const opportunities = detectEducationOpportunities(signals);
  const changed = unique(signals.map((signal) => signal.value));
  const evidenceIds = signals.map((signal) => signal.id);
  const baseline: EducationRecommendation[] = [
    {
      id: "guidance-next-action",
      title: plan.nextAction,
      action: plan.nextAction,
      reason: plan.unansweredQuestions.length
        ? "The plan needs one high-value answer before a confident path recommendation."
        : "This is the earliest incomplete roadmap step that produces useful evidence.",
      explanation: unique([
        `Current situation: ${profile.currentSituation || "not yet clarified"}.`,
        `Goal: ${plan.goal}.`,
        profile.constraints.length ? `Constraints considered: ${profile.constraints.join(", ")}.` : "No constraints have been confirmed yet.",
        changed.length ? `Recent change considered: ${changed[0]}.` : "No newer meaningful change was available.",
      ]),
      priority: 100,
      confidence: confidenceFor(evidenceIds.length),
      evidenceIds,
      verifyBeforeActing: plan.goalKind === "career" || plan.goalKind === "certification"
        ? "Verify current role or credential requirements with an authoritative source."
        : undefined,
    },
    ...opportunities.map((opportunity, index): EducationRecommendation => ({
      id: opportunity.id,
      title: opportunity.title,
      action: `Review ${opportunity.title}`,
      reason: opportunity.reason,
      explanation: [opportunity.verification],
      priority: 90 - index,
      confidence: "medium",
      evidenceIds: [opportunity.id.replace("opportunity-", "")],
      opportunity: opportunity.title,
      verifyBeforeActing: opportunity.verification,
    })),
  ];
  const playbookRecommendations = playbook?.recommend?.({ profile, plan, signals }) || [];
  const recommendations = [...baseline, ...playbookRecommendations]
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  return {
    whoTheUserIs: unique([...profile.interests, ...profile.strengths]).join(", ") || "The user's interests and strengths are still being discovered.",
    whereTheyAre: profile.currentSituation || "The current situation is still being clarified.",
    whereTheyWantToGo: plan.goal,
    whatChanged: changed,
    bestNextStep: recommendations[0],
    recommendations,
    interviewQuestions: buildAdaptiveEducationInterview(profile, plan.goalKind, signals),
    recognizedMilestones: recognizeEducationMilestones(plan.roadmap, signals),
    profileRefinements: refineEducationProfile(profile, signals),
  };
}

export function educationMemoryRecords({
  ownerId,
  snapshot,
  now,
}: {
  ownerId: string;
  snapshot: EducationGuidanceSnapshot;
  now: string;
}): AgentMemoryRecord[] {
  return [
    ["user-story", { who: snapshot.whoTheUserIs, current: snapshot.whereTheyAre, destination: snapshot.whereTheyWantToGo }],
    ["guidance-continuity", { changes: snapshot.whatChanged, nextStep: snapshot.bestNextStep.action, evidenceIds: snapshot.bestNextStep.evidenceIds }],
    ["recognized-milestones", snapshot.recognizedMilestones],
  ].map(([key, value]) => ({
    id: `beasteducation:${ownerId}:${key}`,
    agentId: "beasteducation.guidance-counselor",
    ownerId,
    scope: "user" as const,
    key: String(key),
    value,
    purpose: "Preserve permissioned long-term Guidance Counselor continuity.",
    createdAt: now,
    updatedAt: now,
  }));
}

export function connectEducationIntelligenceEvents({
  events,
  memory,
  now = () => new Date().toISOString(),
}: {
  events: AgentEventBus;
  memory: AgentMemoryStore;
  now?: () => string;
}) {
  return events.subscribe<EducationProfileSignal>("beasteducation.profile-signal", async (event) => {
    const ownerId = event.payload.ownerId;
    if (!ownerId) return;
    await memory.put({
      id: `beasteducation:${ownerId}:signal:${event.payload.id}`,
      agentId: "beasteducation.guidance-counselor",
      ownerId,
      scope: "user",
      key: `profile-signal:${event.payload.kind}`,
      value: event.payload,
      purpose: "Remember a meaningful, permissioned education signal for future guidance.",
      createdAt: event.timestamp || now(),
      updatedAt: event.timestamp || now(),
    });
  });
}
