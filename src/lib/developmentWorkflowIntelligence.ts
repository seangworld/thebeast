import type { DevelopmentAgentId } from "./developmentAgentCapabilityFramework";
import { standingObservationPermittedSources } from "./standingObservation";

export type RiskClass = "routine" | "owner-gate" | "prohibited";
export type ProductCompletenessDimension =
  | "product-truth"
  | "member-experience"
  | "owner-operations"
  | "navigation-discovery"
  | "onboarding-help"
  | "telemetry-outcome"
  | "version-release"
  | "security-privacy"
  | "public-evidence";

export type ObjectiveContextPacket = {
  packageId: string;
  objective: string;
  authorizedOutcomes: readonly string[];
  explicitExclusions: readonly string[];
  productTruthReferences: readonly string[];
  repositories: readonly string[];
  dependencies: readonly string[];
  riskGates: readonly { condition: string; class: RiskClass; ownerAction: string }[];
  impactDimensions: readonly ProductCompletenessDimension[];
  assignments: readonly { agent: DevelopmentAgentId; responsibility: string }[];
  acceptanceEvidence: readonly string[];
  stopConditions: readonly string[];
};

export type DeveloperContextPacket = ObjectiveContextPacket & {
  assignmentId: string;
  contextPacketId: string;
  productTruth: { source: string; version: string; evidenceIds: readonly string[] };
  repositoryMap: readonly { repository: string; purpose: string; permittedMutation: boolean }[];
  architectureNotes: readonly string[];
  currentVersions: Readonly<Record<string, string>>;
  securityPrivacyConstraints: readonly string[];
  historicalDecisions: readonly string[];
  priorReviewerFindings: readonly string[];
  requiredValidation: readonly string[];
  expectedOutputs: readonly string[];
};

export type DeveloperPhaseEvidence = {
  phase: (typeof developerExecutionLoop)[number];
  evidenceId: string;
  contextPacketId: string;
  sourceReference: string;
  candidateId?: string;
  treeId?: string;
  validationEvidenceIds?: readonly string[];
};

export const orchestratorDecompositionStages = [
  "confirm-authority",
  "load-current-product-truth",
  "identify-products-and-repositories",
  "derive-impact-graph",
  "sequence-dependencies",
  "classify-risk-and-owner-gates",
  "assign-independent-work",
  "collect-acceptance-evidence",
  "stop-at-authority-boundary",
] as const;

export const developerExecutionLoop = [
  "inspect",
  "plan",
  "implement",
  "test",
  "diagnose",
  "bounded-remediate",
  "retest",
  "exact-candidate",
] as const;

export const ownerInterruptionPolicy = {
  agentHandledInsideAuthorizedPackage: [
    "Repository and Product Truth inspection",
    "Bounded planning and dependency sequencing",
    "Routine implementation, testing, diagnosis, and in-scope remediation",
    "Independent exact-candidate review and re-review",
    "Product Completeness evidence collection",
    "Previously authorized low-touch release steps",
    "Immediate and scheduled evidence evaluation",
  ],
  ownerRequired: [
    "Missing or expired authorization",
    "Material scope, product, policy, or authority decision",
    "Security, privacy, provider, credential, financial, or destructive high-risk gate",
    "Required Production authority not already granted",
    "Remediation that cannot remain inside the authorized package",
  ],
  sessionRule: "Reuse a valid correctly scoped authenticated session; request authentication only when absent, expired, invalid, wrong-origin, or insufficiently authorized.",
} as const;

export const exactCandidateReviewerMatrix = [
  { id: "candidate-identity", question: "Is review bound to the exact candidate, tree, changed files, and evidence?" },
  { id: "scope", question: "Does the candidate stay inside the authorized objective and exclusions?" },
  { id: "correctness", question: "Does behavior satisfy the acceptance contract, including failure states?" },
  { id: "architecture", question: "Does it reuse canonical architecture and avoid unnecessary parallel systems?" },
  { id: "regression", question: "Are related existing behaviors and unrelated products protected?" },
  { id: "authentication", question: "Are authentication and session boundaries preserved?" },
  { id: "authorization", question: "Are role, entitlement, owner, and material approval boundaries preserved?" },
  { id: "rls-data-ownership", question: "Are RLS, tenant/member ownership, and data access fail-closed?" },
  { id: "security", question: "Are secrets, injection, supply-chain, and unsafe action paths addressed?" },
  { id: "privacy", question: "Is data collection minimum-necessary, disclosed, and privacy bounded?" },
  { id: "errors-failures", question: "Are unavailable, partial, retry, duplicate, and rollback states honest and safe?" },
  { id: "responsive-mobile", question: "Do mobile, tablet, desktop, and narrow layouts preserve the task?" },
  { id: "accessibility", question: "Are semantics, keyboard, focus, contrast, and assistive labels usable?" },
  { id: "product-truth", question: "Do claims and behavior reconcile with current canonical Product Truth?" },
  { id: "cross-ecosystem", question: "Were impact-graph products, repositories, docs, navigation, telemetry, and releases reconciled?" },
  { id: "actual-user-need", question: "Does the candidate solve the requested user outcome rather than only literal technical criteria?" },
] as const;

export type RemediationInput = {
  finding: string;
  insideAuthorizedScope: boolean;
  changesAuthority: boolean;
  highRisk: boolean;
  destructive: boolean;
  materialProductDecision: boolean;
  requiresNewProviderOrCredential: boolean;
};

export type RemediationDisposition =
  | "return-to-developer"
  | "owner-decision-required"
  | "separate-governed-package"
  | "prohibited";

export function classifyBoundedRemediation(input: RemediationInput): RemediationDisposition {
  if (input.changesAuthority || input.destructive || input.requiresNewProviderOrCredential) return "prohibited";
  if (input.highRisk || input.materialProductDecision) return "owner-decision-required";
  if (!input.insideAuthorizedScope) return "separate-governed-package";
  return "return-to-developer";
}

export const ecosystemImpactGraph = {
  nodes: [
    { id: "beastfusion-governance", kind: "governance", dimensions: ["product-truth", "version-release"] },
    { id: "agent-capability-source", kind: "product-truth", dimensions: ["product-truth", "public-evidence"] },
    { id: "beastadmin-development-console", kind: "owner-surface", dimensions: ["owner-operations", "navigation-discovery"] },
    { id: "digital-staff", kind: "member-surface", dimensions: ["member-experience", "navigation-discovery"] },
    { id: "public-agent-profiles", kind: "public-surface", dimensions: ["public-evidence", "navigation-discovery"] },
    { id: "onboarding", kind: "shared-capability", dimensions: ["onboarding-help", "member-experience"] },
    { id: "telemetry", kind: "shared-capability", dimensions: ["telemetry-outcome", "security-privacy"] },
    { id: "versions-releases", kind: "release-evidence", dimensions: ["version-release", "product-truth"] },
    { id: "security-privacy-docs", kind: "boundary-evidence", dimensions: ["security-privacy", "public-evidence"] },
  ],
  edges: [
    { from: "beastfusion-governance", to: "agent-capability-source", relation: "authorizes-and-versions" },
    { from: "agent-capability-source", to: "beastadmin-development-console", relation: "projects-owner-evidence" },
    { from: "agent-capability-source", to: "digital-staff", relation: "projects-member-evidence" },
    { from: "agent-capability-source", to: "public-agent-profiles", relation: "sanitizes-public-evidence" },
    { from: "digital-staff", to: "onboarding", relation: "may-require-reconciliation" },
    { from: "digital-staff", to: "telemetry", relation: "produces-bounded-outcomes" },
    { from: "agent-capability-source", to: "versions-releases", relation: "declares-generation" },
    { from: "public-agent-profiles", to: "security-privacy-docs", relation: "must-respect-boundaries" },
  ],
} as const;

export function deriveEcosystemImpact(startNodeIds: readonly string[]) {
  const known = new Set(ecosystemImpactGraph.nodes.map(({ id }) => id));
  const impacted = new Set(startNodeIds.filter((id) => known.has(id as never)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of ecosystemImpactGraph.edges) {
      if (impacted.has(edge.from) && !impacted.has(edge.to)) {
        impacted.add(edge.to);
        changed = true;
      }
    }
  }
  const nodes = ecosystemImpactGraph.nodes.filter(({ id }) => impacted.has(id));
  return {
    nodes,
    edges: ecosystemImpactGraph.edges.filter(({ from, to }) => impacted.has(from) && impacted.has(to)),
    productCompletenessDimensions: Array.from(new Set(nodes.flatMap(({ dimensions }) => dimensions))),
  };
}

export type OutcomeRecommendation = "Continue" | "Modify" | "Stop" | "Investigate";
export type OutcomeWindow = "immediate" | "short" | "7-day" | "30-day";

export const outcomeEvaluationWindows: readonly {
  id: OutcomeWindow;
  purpose: string;
  evidence: readonly string[];
}[] = [
  { id: "immediate", purpose: "Verify exact Production identity, health, safety controls, and critical task behavior.", evidence: ["deployment identity", "smoke verification", "error and authorization checks"] },
  { id: "short", purpose: "Detect early regressions and whether the released experience is being reached and used.", evidence: ["privacy-bounded usage telemetry", "support or error signals"] },
  { id: "7-day", purpose: "Compare the first stable weekly window with the declared baseline and expected outcome.", evidence: ["comparable seven-day metrics", "confounders and evidence gaps"] },
  { id: "30-day", purpose: "Evaluate sustained product or operational value instead of deployment success alone.", evidence: ["comparable thirty-day metrics", "trend, quality, and downstream outcome evidence"] },
] as const;

export function recommendOutcome(input: {
  technicalReleaseHealthy: boolean;
  intendedOutcomeObserved: boolean | null;
  materialRegression: boolean;
  evidenceComparable: boolean;
  confidence: "low" | "medium" | "high";
}): OutcomeRecommendation {
  if (input.materialRegression) return "Stop";
  if (!input.technicalReleaseHealthy) return "Modify";
  if (!input.evidenceComparable || input.intendedOutcomeObserved === null || input.confidence === "low") return "Investigate";
  return input.intendedOutcomeObserved ? "Continue" : "Modify";
}

export type StructuredObserverFinding = {
  source: (typeof standingObservationPermittedSources)[number];
  observedAt: string;
  signal: string;
  baseline: string;
  magnitude: string;
  confidence: "low" | "medium" | "high";
  impact: "none" | "low" | "medium" | "high";
  evidenceReferences: readonly string[];
  limitations: readonly string[];
  recommendedDisposition: "INVESTIGATE" | "MONITOR" | "IGNORE";
  executable: false;
};

export function buildObserverFinding(input: Omit<StructuredObserverFinding, "executable">): StructuredObserverFinding {
  if (!standingObservationPermittedSources.includes(input.source)) throw new Error("Observer source is outside the unchanged permitted allowlist.");
  if (!input.signal.trim() || !input.baseline.trim() || !input.observedAt.trim()) throw new Error("Observer findings require signal, baseline, and observation time.");
  return { ...input, executable: false };
}

export type StructuredProposal = {
  findingReference: string;
  evidence: readonly string[];
  problemOrOpportunity: string;
  expectedBenefit: string;
  proposedScope: readonly string[];
  effort: "small" | "medium" | "large" | "unknown";
  risk: "low" | "medium" | "high" | "unknown";
  dependencies: readonly string[];
  affectedProducts: readonly string[];
  priority: "low" | "normal" | "high" | "urgent";
  confidence: "low" | "medium" | "high";
  recommendedDisposition: "APPROVE FOR GOVERNED INTAKE" | "MODIFY" | "DEFER" | "REJECT" | "INVESTIGATE";
  unknowns: readonly string[];
  executable: false;
  executionStatus: "awaiting-owner-and-governance";
};

export function buildNonExecutableProposal(input: Omit<StructuredProposal, "executable" | "executionStatus">): StructuredProposal {
  if (!input.findingReference.trim() || !input.evidence.length || !input.problemOrOpportunity.trim()) {
    throw new Error("Proposals require a finding, evidence, and bounded problem or opportunity.");
  }
  return { ...input, executable: false, executionStatus: "awaiting-owner-and-governance" };
}

export function validateObjectiveContextPacket(packet: ObjectiveContextPacket) {
  const errors: string[] = [];
  if (!packet.packageId.trim()) errors.push("packageId is required");
  if (!packet.objective.trim()) errors.push("objective is required");
  if (!packet.explicitExclusions.length) errors.push("explicit exclusions are required");
  if (!packet.acceptanceEvidence.length) errors.push("acceptance evidence is required");
  if (!packet.stopConditions.length) errors.push("stop conditions are required");
  if (!packet.assignments.some(({ agent }) => agent === "reviewer-agent")) errors.push("independent Reviewer assignment is required");
  return { valid: errors.length === 0, errors };
}

export function validateDeveloperContextPacket(packet: DeveloperContextPacket) {
  const errors = [...validateObjectiveContextPacket(packet).errors];
  if (!packet.assignmentId.trim() || !packet.contextPacketId.trim()) errors.push("assignment and context packet identities are required");
  if (!packet.productTruth.source.trim() || !packet.productTruth.version.trim() || !packet.productTruth.evidenceIds.length) errors.push("versioned Product Truth evidence is required");
  if (!packet.repositoryMap.length || packet.repositoryMap.some(({ repository, purpose }) => !repository.trim() || !purpose.trim())) errors.push("repository architecture map is required");
  if (!Object.keys(packet.currentVersions).length || Object.values(packet.currentVersions).some((version) => !version.trim())) errors.push("current versions are required");
  if (!packet.impactDimensions.length) errors.push("Product Completeness impact is required");
  if (!packet.requiredValidation.length) errors.push("required validation is required");
  if (!packet.expectedOutputs.length) errors.push("expected outputs are required");
  if (!packet.riskGates.length) errors.push("risk and owner gates are required");
  return { valid: errors.length === 0, errors };
}

export function validateDeveloperExecutionEvidence(packet: DeveloperContextPacket, evidence: readonly DeveloperPhaseEvidence[]) {
  const errors = [...validateDeveloperContextPacket(packet).errors];
  for (const phase of developerExecutionLoop) {
    const record = evidence.find((item) => item.phase === phase);
    if (!record) {
      errors.push(`${phase} evidence is required`);
      continue;
    }
    if (!record.evidenceId.trim() || !record.sourceReference.trim() || record.contextPacketId !== packet.contextPacketId) {
      errors.push(`${phase} evidence must be bound to the context packet`);
    }
    if (phase === "exact-candidate" && (!record.candidateId?.trim() || !record.treeId?.trim() || !record.validationEvidenceIds?.length)) {
      errors.push("exact candidate identity, tree, and validation evidence are required");
    }
  }
  return { valid: errors.length === 0, errors };
}
