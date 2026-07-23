export type ConfidenceLevel = "high" | "moderate" | "low" | "insufficient";
export type EvidenceQuality = "strong" | "moderate" | "limited" | "insufficient";
export type UncertaintyLevel = "low" | "moderate" | "high";
export type Likelihood =
  | "very-unlikely"
  | "unlikely"
  | "about-even"
  | "likely"
  | "very-likely";
export type EvidenceRelationship = "supports" | "contradicts" | "neutral";
export type EvidenceClaimType = "direct" | "inference" | "correlation" | "causal";

export type ConfidenceEvidence = {
  id: string;
  source: string;
  relationship: EvidenceRelationship;
  claimType: EvidenceClaimType;
  authority: number;
  reliability: number;
  freshness: number;
  completeness: number;
  directness: number;
  independent: boolean;
  limitation?: string;
};

export type SupportedProbability = {
  value: number;
  method: string;
  source: string;
  sourceDate: string;
  supportingEvidenceIds: readonly string[];
  calculation: string;
  assumptions: readonly string[];
};

export type ConfidenceAssessmentRequest = {
  claim: string;
  evidence: readonly ConfidenceEvidence[];
  requiredEvidenceCount?: number;
  missingInformation?: readonly string[];
  probability?: SupportedProbability;
  attemptsCausalConclusion?: boolean;
};

export type ProbabilityAssessment = SupportedProbability & {
  likelihood: Likelihood;
};

export type ConfidenceAssessment = {
  claim: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  evidenceQuality: EvidenceQuality;
  evidenceQualityScore: number;
  uncertainty: UncertaintyLevel;
  insufficientEvidence: boolean;
  contradictoryEvidence: boolean;
  correlationOnly: boolean;
  causalConclusionSupported: boolean;
  supportingEvidenceIds: readonly string[];
  contradictoryEvidenceIds: readonly string[];
  reasons: readonly string[];
  uncertaintyReasons: readonly string[];
  additionalInformationNeeded: readonly string[];
  probability?: ProbabilityAssessment;
};

function bounded(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between 0 and 1.`);
  return value;
}

function likelihood(value: number): Likelihood {
  if (value < 0.1) return "very-unlikely";
  if (value < 0.4) return "unlikely";
  if (value <= 0.6) return "about-even";
  if (value <= 0.9) return "likely";
  return "very-likely";
}

function level(score: number, insufficient: boolean): ConfidenceLevel {
  if (insufficient) return "insufficient";
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "moderate";
  return "low";
}

function quality(score: number, hasEvidence: boolean): EvidenceQuality {
  if (!hasEvidence) return "insufficient";
  if (score >= 0.8) return "strong";
  if (score >= 0.55) return "moderate";
  return "limited";
}

export class SharedProbabilityConfidenceEngine {
  assess(request: ConfidenceAssessmentRequest): ConfidenceAssessment {
    if (!request.claim.trim()) throw new Error("Confidence assessment requires a claim.");
    const ids = new Set<string>();
    for (const evidence of request.evidence) {
      if (!evidence.id.trim() || !evidence.source.trim()) throw new Error("Confidence evidence requires an id and source.");
      if (ids.has(evidence.id)) throw new Error(`Confidence evidence ${evidence.id} is duplicated.`);
      ids.add(evidence.id);
      bounded(evidence.authority, "Evidence authority");
      bounded(evidence.reliability, "Evidence reliability");
      bounded(evidence.freshness, "Evidence freshness");
      bounded(evidence.completeness, "Evidence completeness");
      bounded(evidence.directness, "Evidence directness");
    }

    const evidenceScores = request.evidence.map((evidence) =>
      evidence.authority * 0.24 +
      evidence.reliability * 0.24 +
      evidence.freshness * 0.18 +
      evidence.completeness * 0.18 +
      evidence.directness * 0.16
    );
    const evidenceQualityScore = evidenceScores.length
      ? evidenceScores.reduce((sum, score) => sum + score, 0) / evidenceScores.length
      : 0;
    const supporting = request.evidence.filter((item) => item.relationship === "supports");
    const contradictory = request.evidence.filter((item) => item.relationship === "contradicts");
    const contradictoryEvidence = supporting.length > 0 && contradictory.length > 0;
    const requiredCount = Math.max(1, request.requiredEvidenceCount || 1);
    const missing = [...(request.missingInformation || [])];
    if (request.evidence.length < requiredCount) missing.push(`${requiredCount - request.evidence.length} additional required evidence item${requiredCount - request.evidence.length === 1 ? "" : "s"}`);
    const insufficientEvidence = request.evidence.length < requiredCount || supporting.length === 0 || evidenceQualityScore < 0.35;
    const contradictionPenalty = contradictoryEvidence
      ? Math.min(0.45, contradictory.length / Math.max(1, supporting.length + contradictory.length))
      : 0;
    const independenceBonus = request.evidence.filter((item) => item.independent).length >= 2 ? 0.05 : 0;
    const confidenceScore = insufficientEvidence
      ? Math.min(0.34, evidenceQualityScore)
      : Math.max(0, Math.min(1, evidenceQualityScore - contradictionPenalty + independenceBonus));
    const correlationOnly = supporting.length > 0 && supporting.every((item) => item.claimType === "correlation");
    const causalConclusionSupported = supporting.some((item) => item.claimType === "causal") && !contradictoryEvidence;
    if (request.attemptsCausalConclusion && !causalConclusionSupported) {
      missing.push("causal evidence capable of distinguishing correlation from causation");
    }

    let probability: ProbabilityAssessment | undefined;
    if (request.probability) {
      bounded(request.probability.value, "Probability");
      if (!request.probability.method.trim() || !request.probability.source.trim() || !request.probability.calculation.trim()) {
        throw new Error("Probability requires a documented method, source, and calculation.");
      }
      if (!request.probability.supportingEvidenceIds.length) throw new Error("Probability requires supporting evidence.");
      const unknownIds = request.probability.supportingEvidenceIds.filter((id) => !ids.has(id));
      if (unknownIds.length) throw new Error(`Probability references unknown evidence: ${unknownIds.join(", ")}.`);
      probability = { ...request.probability, likelihood: likelihood(request.probability.value) };
    }

    const confidence = level(confidenceScore, insufficientEvidence);
    const evidenceQuality = quality(evidenceQualityScore, request.evidence.length > 0);
    const uncertainty: UncertaintyLevel =
      insufficientEvidence || confidence === "low" || contradictoryEvidence ? "high" :
        confidence === "moderate" || missing.length ? "moderate" : "low";
    const reasons = [
      `${confidence === "insufficient" ? "Confidence is insufficient" : `Confidence is ${confidence}`} because the available evidence quality is ${evidenceQuality}.`,
      supporting.length ? `${supporting.length} evidence item${supporting.length === 1 ? "" : "s"} support the claim.` : "No evidence item directly supports the claim.",
      ...(request.evidence.filter((item) => item.independent).length >= 2 ? ["Multiple independent evidence items improve confidence."] : []),
    ];
    const uncertaintyReasons = [
      ...(contradictoryEvidence ? ["Available evidence points in conflicting directions."] : []),
      ...(correlationOnly ? ["The evidence establishes correlation, not causation."] : []),
      ...request.evidence.flatMap((item) => item.limitation ? [item.limitation] : []),
      ...(!probability ? ["No probability is stated because no supported probability model was supplied."] : []),
    ];

    return {
      claim: request.claim,
      confidence,
      confidenceScore: Math.round(confidenceScore * 1000) / 1000,
      evidenceQuality,
      evidenceQualityScore: Math.round(evidenceQualityScore * 1000) / 1000,
      uncertainty,
      insufficientEvidence,
      contradictoryEvidence,
      correlationOnly,
      causalConclusionSupported,
      supportingEvidenceIds: supporting.map((item) => item.id),
      contradictoryEvidenceIds: contradictory.map((item) => item.id),
      reasons,
      uncertaintyReasons,
      additionalInformationNeeded: Array.from(new Set(missing)),
      probability,
    };
  }

  explain(assessment: ConfidenceAssessment) {
    return {
      summary: assessment.reasons.join(" "),
      uncertainty: assessment.uncertaintyReasons,
      additionalInformationNeeded: assessment.additionalInformationNeeded,
      probability: assessment.probability
        ? `${Math.round(assessment.probability.value * 1000) / 10}% (${assessment.probability.likelihood}), based on ${assessment.probability.method}.`
        : "No supported probability is available.",
    };
  }
}
