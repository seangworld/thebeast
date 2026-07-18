export const LEARNING_OUTCOME_EVIDENCE_KINDS = [
  "mentor_continuity",
  "guidance_goal",
  "education_milestone",
  "planner_cadence",
  "tutor_activity",
  "assessment",
] as const;

export type LearningOutcomeEvidenceKind = (typeof LEARNING_OUTCOME_EVIDENCE_KINDS)[number];
export type LearningOutcomeStatus = "completed" | "in_progress" | "stalled";

export type LearningOutcomeEvidence = {
  id: string;
  kind: LearningOutcomeEvidenceKind;
  occurredOn: string;
  status: LearningOutcomeStatus;
  evidenceRef: string;
  score?: number;
  tutorQuality?: number;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function percentage(numerator: number, denominator: number) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100);
}

function average(values: number[]) {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function validateLearningOutcomeEvidence(evidence: LearningOutcomeEvidence[]) {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const item of evidence) {
    if (ids.has(item.id)) issues.push(`Duplicate learning outcome evidence id: ${item.id}.`);
    ids.add(item.id);
    if (!item.id.trim() || !item.evidenceRef.trim()) {
      issues.push("Learning outcome evidence requires an id and source reference.");
    }
    if (!validDate(item.occurredOn)) issues.push(`Learning outcome evidence ${item.id} has invalid date ${item.occurredOn}.`);
    if (item.score !== undefined && (!Number.isFinite(item.score) || item.score < 0 || item.score > 100)) {
      issues.push(`Learning outcome evidence ${item.id} score must be between 0 and 100.`);
    }
    if (item.tutorQuality !== undefined && (!Number.isFinite(item.tutorQuality) || item.tutorQuality < 1 || item.tutorQuality > 5)) {
      issues.push(`Learning outcome evidence ${item.id} tutor quality must be between 1 and 5.`);
    }
    if (item.score !== undefined && item.kind !== "assessment") {
      issues.push(`Learning outcome evidence ${item.id} may report mastery score only from assessment evidence.`);
    }
    if (item.tutorQuality !== undefined && item.kind !== "tutor_activity") {
      issues.push(`Learning outcome evidence ${item.id} may report tutor quality only from tutor activity evidence.`);
    }
  }

  return issues;
}

export function buildLearningOutcomeAnalytics(evidence: LearningOutcomeEvidence[]) {
  const issues = validateLearningOutcomeEvidence(evidence);
  if (issues.length) throw new Error(issues.join(" "));

  const ordered = evidence.slice().sort((left, right) =>
    left.occurredOn.localeCompare(right.occurredOn) || left.id.localeCompare(right.id)
  );
  const byKind = Object.fromEntries(LEARNING_OUTCOME_EVIDENCE_KINDS.map((kind) => [
    kind,
    ordered.filter((item) => item.kind === kind),
  ])) as Record<LearningOutcomeEvidenceKind, LearningOutcomeEvidence[]>;
  const missingEvidenceKinds = LEARNING_OUTCOME_EVIDENCE_KINDS.filter((kind) => byKind[kind].length === 0);
  const assessmentScores = byKind.assessment
    .map(({ score }) => score)
    .filter((score): score is number => score !== undefined);
  const tutorQualityScores = byKind.tutor_activity
    .map(({ tutorQuality }) => tutorQuality)
    .filter((score): score is number => score !== undefined);
  const guidanceEvidence = [...byKind.mentor_continuity, ...byKind.guidance_goal];
  const planningEvidence = [...byKind.education_milestone, ...byKind.planner_cadence];

  return {
    evidence: ordered,
    coverage: {
      presentKinds: LEARNING_OUTCOME_EVIDENCE_KINDS.filter((kind) => byKind[kind].length > 0),
      missingKinds: missingEvidenceKinds,
      complete: missingEvidenceKinds.length === 0,
    },
    guidance: {
      evidenceCount: guidanceEvidence.length,
      completionRate: percentage(guidanceEvidence.filter(({ status }) => status === "completed").length, guidanceEvidence.length),
    },
    planning: {
      evidenceCount: planningEvidence.length,
      completionRate: percentage(planningEvidence.filter(({ status }) => status === "completed").length, planningEvidence.length),
    },
    learning: {
      completionRate: percentage(ordered.filter(({ status }) => status === "completed").length, ordered.length),
      masteryScore: average(assessmentScores),
      dropOffCount: ordered.filter(({ status }) => status === "stalled").length,
      tutorQuality: average(tutorQualityScores),
    },
    boundaries: {
      analyticsAreSupportingContext: true,
      analyticsAreProductCenter: false,
      predictsOutcome: false,
      determinesEligibility: false,
      missingEvidenceIsNotEstimated: true,
    },
  };
}
