import type { ConceptMastery } from "./types";

export type LearnerSkillEvidenceKind =
  | "placement"
  | "lesson-check"
  | "guided-practice"
  | "quiz"
  | "reflection"
  | "review";

export type LearnerSkillEvidence = {
  id: string;
  kind: LearnerSkillEvidenceKind;
  sourceId: string;
  scorePercent?: number;
  observedAt: string;
  summary: string;
};

export type LearnerSkillState = {
  learnerId: string;
  skillId: string;
  conceptId: string;
  state: "new" | "building" | "strengthening" | "ready";
  confidence: ConceptMastery["confidence"];
  evidence: LearnerSkillEvidence[];
  lastEvidenceAt: string | null;
};

function skillStateFromConfidence(confidence: ConceptMastery["confidence"]) {
  if (confidence === "high") return "ready";
  if (confidence === "medium") return "strengthening";
  return "building";
}

export function buildLearnerSkillState({
  learnerId,
  skillId,
  concept,
  evidence,
}: {
  learnerId: string;
  skillId: string;
  concept: ConceptMastery;
  evidence: LearnerSkillEvidence[];
}): LearnerSkillState {
  const sortedEvidence = evidence
    .slice()
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  return {
    learnerId,
    skillId,
    conceptId: concept.conceptId,
    state: sortedEvidence.length ? skillStateFromConfidence(concept.confidence) : "new",
    confidence: concept.confidence,
    evidence: sortedEvidence,
    lastEvidenceAt: sortedEvidence[sortedEvidence.length - 1]?.observedAt || null,
  };
}

export function skillStateHasEvidence(state: LearnerSkillState) {
  return state.evidence.length > 0 && Boolean(state.lastEvidenceAt);
}
