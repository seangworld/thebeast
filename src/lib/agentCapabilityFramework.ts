export type KnightAutonomyLevel = 1 | 2 | 3 | 4 | 5;
export type CapabilityDimensionId =
  | "goal-complexity"
  | "environmental-complexity"
  | "adaptability"
  | "independent-execution";

export type AgentAssessmentBinding = {
  modelId: string;
  toolsetId: string;
  promptContractId: string;
  configurationId: string;
  environmentId: string;
};

export type AgentCapabilityDimensionAssessment = {
  dimension: CapabilityDimensionId;
  label: string;
  demonstrated: string;
  evidence: readonly string[];
  limitation: string;
};

export type AgentAutonomyAssessment = {
  framework: "Knight Institute Levels of Autonomy for AI Agents";
  level: KnightAutonomyLevel;
  userRole: "operator" | "collaborator" | "consultant" | "approver" | "observer";
  conciseDefinition: string;
  evidence: readonly string[];
  limitations: readonly string[];
  classification: "self-assessed";
};

export type AgentAuthorityAssessment<Authority extends string> = {
  classification: Authority;
  permitted: readonly string[];
  prohibited: readonly string[];
  source: "canonical BeastFusion package authority";
};

export type AgentAssessmentEvidenceReference = {
  id: string;
  sha256: string;
  result: "pass" | "fail";
};

export function isImmutableEvidenceHash(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
