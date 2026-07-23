import type { BenchmarkResult } from "./benchmarks";
import type { Observation } from "./observations";
import type { AgentPlan } from "./planning";
import type { ConfidenceAssessment } from "./probabilityConfidence";
import type { StructuredAgentAction } from "./tools";

export type ExplainableEntityType = "recommendation" | "observation" | "benchmark" | "conclusion";
export type ExplainabilityEvidenceRole = "supports" | "contradicts" | "context";

export type ExplainabilityEvidence = {
  id: string;
  source: string;
  sourceRecordId?: string;
  capturedAt: string;
  statement: string;
  role: ExplainabilityEvidenceRole;
  authoritative: boolean;
};

export type ExplainabilityAlternative = {
  id: string;
  label: string;
  reasonNotSelected: string;
  evidenceIds: readonly string[];
};

export type ExplainabilityReasoningStep = {
  id: string;
  label: string;
  purpose: string;
  sourceIds: readonly string[];
  status: "used" | "skipped" | "blocked";
};

export type ExplainabilityReport = {
  id: string;
  ownerId: string;
  specialistId: string;
  entityType: ExplainableEntityType;
  entityId: string;
  conclusion: string;
  why: string;
  evidence: readonly ExplainabilityEvidence[];
  authoritativeEvidenceIds: readonly string[];
  alternatives: readonly ExplainabilityAlternative[];
  reasoningPath: readonly ExplainabilityReasoningStep[];
  confidence?: ConfidenceAssessment;
  action?: {
    toolId: string;
    title: string;
    target?: string;
    confirmation: StructuredAgentAction["confirmation"];
    status: StructuredAgentAction["status"];
  };
  limitations: readonly string[];
  generatedAt: string;
  disclosure: string;
};

export type CreateExplainabilityReportInput = Omit<ExplainabilityReport, "authoritativeEvidenceIds" | "generatedAt" | "disclosure">;

export class SharedExplainabilityEngine {
  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  create(input: CreateExplainabilityReportInput): ExplainabilityReport {
    if (!input.id.trim() || !input.ownerId.trim() || !input.specialistId.trim() || !input.entityId.trim()) throw new Error("Explainability reports require an id, owner, specialist, and entity.");
    if (!input.conclusion.trim() || !input.why.trim()) throw new Error("Explainability reports require a conclusion and reason.");
    if (!input.evidence.length) throw new Error("Explainability reports require structured evidence.");
    const evidenceIds = new Set(input.evidence.map((item) => item.id));
    if (evidenceIds.size !== input.evidence.length) throw new Error("Explainability evidence ids must be unique.");
    for (const alternative of input.alternatives) {
      if (!alternative.reasonNotSelected.trim()) throw new Error("Alternatives require a reason they were not selected.");
      if (alternative.evidenceIds.some((id) => !evidenceIds.has(id))) throw new Error("Alternative explanations reference unknown evidence.");
    }
    for (const step of input.reasoningPath) {
      if (!step.label.trim() || !step.purpose.trim()) throw new Error("Reasoning path steps require a label and purpose.");
      if (step.sourceIds.some((id) => !evidenceIds.has(id))) throw new Error("Reasoning path steps reference unknown evidence.");
    }
    return {
      ...input,
      authoritativeEvidenceIds: input.evidence.filter((item) => item.authoritative).map((item) => item.id),
      generatedAt: this.now(),
      disclosure: "This report exposes evidence, decision criteria, alternatives, confidence, and the procedural reasoning path. It does not expose hidden chain-of-thought.",
    };
  }

  fromObservation(input: { ownerId: string; observation: Observation }): ExplainabilityReport {
    if (input.observation.ownerId !== input.ownerId) throw new Error("Observation explainability is owner scoped.");
    const evidence = input.observation.evidence.map((item): ExplainabilityEvidence => ({
      id: item.id,
      source: item.source,
      sourceRecordId: item.recordId,
      capturedAt: item.observedAt,
      statement: `${item.label}: ${String(item.value)}`,
      role: item.kind === "fact" ? "supports" : "context",
      authoritative: item.kind === "fact",
    }));
    return this.create({
      id: `explain:observation:${input.observation.id}`,
      ownerId: input.ownerId,
      specialistId: input.observation.specialistId,
      entityType: "observation",
      entityId: input.observation.id,
      conclusion: input.observation.presentation.summary,
      why: input.observation.presentation.whyNoticed,
      evidence,
      alternatives: [],
      reasoningPath: [{ id: "observation-rule", label: "Apply observation rule", purpose: input.observation.provenance.ruleDescription, sourceIds: evidence.map((item) => item.id), status: "used" }],
      confidence: input.observation.confidenceAnalysis,
      action: input.observation.presentation.action ? this.action(input.observation.presentation.action) : undefined,
      limitations: input.observation.provenance.limitations,
    });
  }

  fromBenchmark(input: { ownerId: string; result: BenchmarkResult }): ExplainabilityReport {
    if (input.result.ownerId !== input.ownerId) throw new Error("Benchmark explainability is owner scoped.");
    const currentEvidence: ExplainabilityEvidence = { id: `benchmark-current:${input.result.id}`, source: "authenticated member records", capturedAt: input.result.current.measuredAt, statement: `${input.result.current.label}: ${input.result.current.value} ${input.result.calculation.unit}`, role: "supports", authoritative: true };
    const referenceEvidence: ExplainabilityEvidence = { id: `benchmark-reference:${input.result.id}`, source: input.result.source.name, capturedAt: input.result.sourceDate, statement: `${input.result.reference.label}: ${input.result.reference.value} ${input.result.calculation.unit}`, role: "context", authoritative: input.result.source.authority !== "custom" };
    return this.create({
      id: `explain:benchmark:${input.result.id}`,
      ownerId: input.ownerId,
      specialistId: input.result.specialistId,
      entityType: "benchmark",
      entityId: input.result.id,
      conclusion: input.result.interpretation,
      why: `The current value was compared with ${input.result.benchmarkName}.`,
      evidence: [currentEvidence, referenceEvidence],
      alternatives: [],
      reasoningPath: [{ id: "benchmark-calculation", label: "Calculate benchmark comparison", purpose: input.result.calculation.formula, sourceIds: [currentEvidence.id, referenceEvidence.id], status: "used" }],
      confidence: input.result.confidenceAnalysis,
      limitations: input.result.limitations,
    });
  }

  fromPlan(input: {
    ownerId: string;
    specialistId: string;
    entityId: string;
    entityType: "recommendation" | "conclusion";
    conclusion: string;
    why: string;
    plan: AgentPlan;
    evidence: readonly ExplainabilityEvidence[];
    alternatives?: readonly ExplainabilityAlternative[];
    confidence?: ConfidenceAssessment;
    action?: StructuredAgentAction;
    limitations?: readonly string[];
  }) {
    if (input.plan.specialistId !== input.specialistId) throw new Error("Planning explainability must belong to the same specialist.");
    return this.create({
      id: `explain:${input.entityType}:${input.entityId}`,
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      entityType: input.entityType,
      entityId: input.entityId,
      conclusion: input.conclusion,
      why: input.why,
      evidence: input.evidence,
      alternatives: input.alternatives || [],
      reasoningPath: input.plan.steps.map((step) => ({
        id: step.id,
        label: step.label,
        purpose: step.purpose,
        sourceIds: [],
        status: step.status === "blocked" ? "blocked" : step.status === "skipped" ? "skipped" : "used",
      })),
      confidence: input.confidence || input.plan.confidenceAssessment,
      action: input.action ? this.action(input.action) : undefined,
      limitations: input.limitations || [],
    });
  }

  private action(action: StructuredAgentAction) {
    return { toolId: action.toolId, title: action.title, target: action.target, confirmation: action.confirmation, status: action.status };
  }
}
