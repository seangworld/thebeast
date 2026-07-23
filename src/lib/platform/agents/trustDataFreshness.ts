import {
  SharedProbabilityConfidenceEngine,
  type ConfidenceAssessment,
  type ConfidenceAssessmentRequest,
  type ConfidenceEvidence,
} from "./probabilityConfidence";

export type DataFreshness = "current" | "recent" | "stale" | "unknown";
export type DataSourceHealth = "healthy" | "degraded" | "unavailable" | "unknown";

export type DataSourceFreshnessInput = {
  id: string;
  ownerId: string;
  specialistId: string;
  source: string;
  label: string;
  recordType: string;
  lastSynchronizedAt?: string;
  lastSuccessfulSynchronizationAt?: string;
  expectedRefreshMinutes: number;
  health: DataSourceHealth;
  consecutiveFailures?: number;
  missingExpectedUpdates?: number;
};

export type DataSourceTrustAssessment = {
  sourceId: string;
  ownerId: string;
  specialistId: string;
  source: string;
  label: string;
  recordType: string;
  freshness: DataFreshness;
  health: DataSourceHealth;
  ageMinutes?: number;
  trustScore: number;
  stale: boolean;
  missingUpdate: boolean;
  lastSynchronizedAt?: string;
  lastSuccessfulSynchronizationAt?: string;
  statement: string;
  confidenceImpact: string;
  limitations: readonly string[];
};

export type TrustDataFreshnessReport = {
  ownerId: string;
  specialistId: string;
  assessedAt: string;
  sources: readonly DataSourceTrustAssessment[];
  overallTrustScore: number;
  overallFreshness: DataFreshness;
  staleSourceIds: readonly string[];
  unavailableSourceIds: readonly string[];
  missingUpdateSourceIds: readonly string[];
  statements: readonly string[];
};

function elapsedMinutes(from: string, to: string) {
  return Math.max(0, (Date.parse(to) - Date.parse(from)) / 60000);
}

function humanAge(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} minute${Math.round(minutes) === 1 ? "" : "s"}`;
  if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function freshness(ageMinutes: number | undefined, expected: number): DataFreshness {
  if (ageMinutes === undefined) return "unknown";
  if (ageMinutes <= expected) return "current";
  if (ageMinutes <= expected * 3) return "recent";
  return "stale";
}

function freshnessScore(value: DataFreshness) {
  return value === "current" ? 1 : value === "recent" ? 0.72 : value === "stale" ? 0.25 : 0.4;
}

function healthScore(value: DataSourceHealth) {
  return value === "healthy" ? 1 : value === "degraded" ? 0.55 : value === "unavailable" ? 0.05 : 0.4;
}

function aggregateFreshness(score: number): DataFreshness {
  return score >= 0.85 ? "current" : score >= 0.6 ? "recent" : score >= 0.3 ? "stale" : "unknown";
}

export class SharedTrustDataFreshnessEngine {
  assess(input: { ownerId: string; specialistId: string; asOf: string; sources: readonly DataSourceFreshnessInput[] }): TrustDataFreshnessReport {
    if (!input.ownerId.trim() || !input.specialistId.trim() || !Number.isFinite(Date.parse(input.asOf))) throw new Error("Trust assessment requires an owner, specialist, and valid timestamp.");
    const sources = input.sources.map((source): DataSourceTrustAssessment => {
      if (source.ownerId !== input.ownerId || source.specialistId !== input.specialistId) throw new Error("Trust sources must match the report owner and specialist.");
      if (!source.id.trim() || !source.source.trim() || !source.label.trim() || source.expectedRefreshMinutes <= 0) throw new Error("Trust sources require identity, labels, and a positive refresh interval.");
      const synchronizedAt = source.lastSuccessfulSynchronizationAt || source.lastSynchronizedAt;
      if (synchronizedAt && !Number.isFinite(Date.parse(synchronizedAt))) throw new Error(`Source ${source.id} has an invalid synchronization timestamp.`);
      const ageMinutes = synchronizedAt ? elapsedMinutes(synchronizedAt, input.asOf) : undefined;
      const sourceFreshness = freshness(ageMinutes, source.expectedRefreshMinutes);
      const missingUpdate = (source.missingExpectedUpdates || 0) > 0 || sourceFreshness === "stale";
      const trustScore = Math.round((freshnessScore(sourceFreshness) * 0.65 + healthScore(source.health) * 0.35) * 1000) / 1000;
      const age = ageMinutes === undefined ? "has no successful synchronization timestamp" : `synchronized ${humanAge(ageMinutes)} ago`;
      const statement = `${source.label} ${age}.${source.health === "healthy" ? "" : ` Source health is ${source.health}.`}`;
      return {
        sourceId: source.id,
        ownerId: source.ownerId,
        specialistId: source.specialistId,
        source: source.source,
        label: source.label,
        recordType: source.recordType,
        freshness: sourceFreshness,
        health: source.health,
        ageMinutes,
        trustScore,
        stale: sourceFreshness === "stale",
        missingUpdate,
        lastSynchronizedAt: source.lastSynchronizedAt,
        lastSuccessfulSynchronizationAt: source.lastSuccessfulSynchronizationAt,
        statement,
        confidenceImpact: sourceFreshness === "current" && source.health === "healthy"
          ? "No freshness penalty is needed."
          : `Confidence should be reduced because freshness is ${sourceFreshness} and source health is ${source.health}.`,
        limitations: [
          ...(synchronizedAt ? [] : ["No successful synchronization time is available."]),
          ...((source.consecutiveFailures || 0) > 0 ? [`${source.consecutiveFailures} consecutive synchronization failure${source.consecutiveFailures === 1 ? "" : "s"} recorded.`] : []),
          ...((source.missingExpectedUpdates || 0) > 0 ? [`${source.missingExpectedUpdates} expected update${source.missingExpectedUpdates === 1 ? "" : "s"} missing.`] : []),
        ],
      };
    });
    const overallTrustScore = sources.length ? Math.round((sources.reduce((sum, item) => sum + item.trustScore, 0) / sources.length) * 1000) / 1000 : 0;
    return {
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      assessedAt: input.asOf,
      sources,
      overallTrustScore,
      overallFreshness: sources.length ? aggregateFreshness(overallTrustScore) : "unknown",
      staleSourceIds: sources.filter((item) => item.stale).map((item) => item.sourceId),
      unavailableSourceIds: sources.filter((item) => item.health === "unavailable").map((item) => item.sourceId),
      missingUpdateSourceIds: sources.filter((item) => item.missingUpdate).map((item) => item.sourceId),
      statements: sources.map((item) => item.statement),
    };
  }

  assessConfidence(input: {
    confidenceEngine?: SharedProbabilityConfidenceEngine;
    request: ConfidenceAssessmentRequest;
    trust: TrustDataFreshnessReport;
    evidenceSourceIds: Readonly<Record<string, string>>;
  }): ConfidenceAssessment {
    const byId = new Map(input.trust.sources.map((item) => [item.sourceId, item]));
    const evidence: ConfidenceEvidence[] = input.request.evidence.map((item) => {
      const sourceId = input.evidenceSourceIds[item.id];
      const sourceTrust = sourceId ? byId.get(sourceId) : undefined;
      if (!sourceTrust) return item;
      return {
        ...item,
        freshness: Math.min(item.freshness, freshnessScore(sourceTrust.freshness) * healthScore(sourceTrust.health)),
        limitation: [item.limitation, ...sourceTrust.limitations, sourceTrust.confidenceImpact].filter(Boolean).join(" "),
      };
    });
    return (input.confidenceEngine || new SharedProbabilityConfidenceEngine()).assess({
      ...input.request,
      evidence,
      missingInformation: [
        ...(input.request.missingInformation || []),
        ...input.trust.sources.filter((item) => item.stale || item.health === "unavailable").map((item) => `a current healthy update from ${item.label}`),
      ],
    });
  }
}
