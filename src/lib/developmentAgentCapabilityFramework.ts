import projection from "./development-agent-capability-projection.json";

export type DevelopmentAgentId = "orchestrator-3" | "observer-agent" | "proposal-agent" | "developer-agent" | "reviewer-agent" | "outcome-agent";
export type CapabilityDimensionId = "goal-complexity" | "environmental-complexity" | "adaptability" | "independent-execution";
export type KnightAutonomyLevel = 1 | 2 | 3 | 4 | 5;
export type CanonicalAuthorityClass = "coordinate-authorized" | "detect-only" | "recommend-only" | "implement-authorized" | "review-only" | "evaluate-only";

export type CapabilityDimensionAssessment = { dimension: CapabilityDimensionId; label: string; demonstrated: string; evidence: readonly string[]; limitation: string };
export type AssessmentBinding = { modelId: string; toolsetId: string; promptContractId: string; configurationId: string; environmentId: string };
export type DevelopmentAgentCapabilityAssessment = {
  agentId: DevelopmentAgentId;
  assessmentId: string;
  evidenceIds: readonly string[];
  assessmentBinding: AssessmentBinding;
  softwareGeneration: string;
  capabilityRelease: string;
  autonomy: { framework: "Knight Institute Levels of Autonomy for AI Agents"; level: KnightAutonomyLevel; userRole: "operator" | "collaborator" | "consultant" | "approver" | "observer"; conciseDefinition: string; evidence: readonly string[]; limitations: readonly string[]; classification: "self-assessed" };
  capability: readonly CapabilityDimensionAssessment[];
  authority: { classification: CanonicalAuthorityClass; permitted: readonly string[]; prohibited: readonly string[]; source: "canonical BeastFusion package authority" };
  assessedAt: string;
  assessedVersion: string;
};

export const developmentAgentCapabilityProjectionContract = projection.source;
export const developmentOpsCapabilityRelease = projection.release;
export const knightAutonomyFramework = projection.primaryBenchmark;
export const openAIAgenticnessDimensions = projection.companionFramework;
export const developmentAgentCapabilityAssessments = projection.assessments as readonly DevelopmentAgentCapabilityAssessment[];

export function getDevelopmentAgentCapabilityAssessment(agentId: string) {
  return developmentAgentCapabilityAssessments.find((assessment) => assessment.agentId === agentId);
}

export function publicDevelopmentAgentCapabilityAssessment(agentId: string) {
  const assessment = getDevelopmentAgentCapabilityAssessment(agentId);
  if (!assessment) return null;
  return {
    agentId: assessment.agentId, assessmentId: assessment.assessmentId, evidenceIds: assessment.evidenceIds,
    assessmentBinding: assessment.assessmentBinding, softwareGeneration: assessment.softwareGeneration,
    capabilityRelease: assessment.capabilityRelease, autonomy: assessment.autonomy, capability: assessment.capability,
    authority: assessment.authority, assessedAt: assessment.assessedAt, assessedVersion: assessment.assessedVersion,
    canonicalProjection: developmentAgentCapabilityProjectionContract,
  };
}
