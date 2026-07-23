import type { Observation } from "./observations";
import {
  SharedProbabilityConfidenceEngine,
  type ConfidenceAssessment,
} from "./probabilityConfidence";

export type BenchmarkType =
  | "personal-historical-baseline"
  | "recent-trend-baseline"
  | "household-baseline"
  | "goal-baseline"
  | "professional-guideline"
  | "population-benchmark"
  | "age-benchmark"
  | "peer-benchmark"
  | "configuration-threshold"
  | "custom-benchmark";

export type BenchmarkConfidence = "low" | "medium" | "high";
export type BenchmarkEvidenceStrength = "limited" | "moderate" | "strong";
export type BenchmarkDirection = "higher-is-better" | "lower-is-better" | "target-range" | "descriptive";

export type BenchmarkSource = {
  name: string;
  authority: "member-records" | "household-records" | "member-goal" | "professional-authority" | "population-study" | "peer-dataset" | "configuration" | "custom";
  citation?: string;
  ownerScoped: boolean;
};

export type BenchmarkCalculation = {
  metric: string;
  unit: string;
  formula: string;
  direction: BenchmarkDirection;
};

export type BenchmarkApplicability = {
  description: string;
  requiredConditions: readonly string[];
};

export type BenchmarkDefinition = {
  id: string;
  name: string;
  type: BenchmarkType;
  domain: string;
  source: BenchmarkSource;
  sourceDate: string;
  calculation: BenchmarkCalculation;
  applicableMemberConditions: BenchmarkApplicability;
  applicableSpecialists: readonly string[];
  confidence: BenchmarkConfidence;
  strengthOfEvidence: BenchmarkEvidenceStrength;
  notes: readonly string[];
  expiresAt?: string;
};

export type BenchmarkValue = {
  value: number;
  label: string;
  measuredAt: string;
  supportingRecordIds: readonly string[];
};

export type BenchmarkEvaluationInput = {
  ownerId: string;
  specialistId: string;
  benchmarkId: string;
  current: BenchmarkValue;
  reference: BenchmarkValue;
  conditionEvidence: Readonly<Record<string, boolean>>;
  authorizedScopes: readonly string[];
  observations?: readonly Observation[];
};

export type BenchmarkComparison = "above" | "below" | "equal" | "within-range" | "outside-range";

export type BenchmarkResult = {
  id: string;
  ownerId: string;
  specialistId: string;
  benchmarkId: string;
  benchmarkName: string;
  benchmarkType: BenchmarkType;
  domain: string;
  current: BenchmarkValue;
  reference: BenchmarkValue;
  difference: number;
  percentDifference?: number;
  comparison: BenchmarkComparison;
  interpretation: string;
  source: BenchmarkSource;
  sourceDate: string;
  confidence: BenchmarkConfidence;
  strengthOfEvidence: BenchmarkEvidenceStrength;
  calculation: BenchmarkCalculation;
  relatedObservationIds: readonly string[];
  limitations: readonly string[];
  evaluatedAt: string;
  confidenceAnalysis?: ConfidenceAssessment;
};

export type BenchmarkQuery = {
  ownerId: string;
  specialistId?: string;
  types?: readonly BenchmarkType[];
  domain?: string;
};

function requireText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function validateDefinition(definition: BenchmarkDefinition, now: string) {
  requireText(definition.id, "Benchmark id");
  requireText(definition.name, "Benchmark name");
  requireText(definition.domain, "Benchmark domain");
  requireText(definition.source.name, "Benchmark source");
  requireText(definition.sourceDate, "Benchmark source date");
  requireText(definition.calculation.metric, "Benchmark metric");
  requireText(definition.calculation.formula, "Benchmark calculation");
  if (!definition.applicableSpecialists.length) throw new Error("Benchmarks require at least one applicable specialist.");
  if (
    ["professional-guideline", "population-benchmark", "age-benchmark", "peer-benchmark"].includes(definition.type) &&
    !definition.source.citation
  ) throw new Error(`${definition.type} requires a citable source.`);
  if (definition.type === "professional-guideline" && definition.source.authority !== "professional-authority") {
    throw new Error("Professional guidelines require a professional authority source.");
  }
  if (definition.expiresAt && Date.parse(definition.expiresAt) <= Date.parse(now)) throw new Error(`Benchmark ${definition.id} is expired.`);
  return definition;
}

function compare(current: number, reference: number): BenchmarkComparison {
  if (current === reference) return "equal";
  return current > reference ? "above" : "below";
}

function benchmarkLabel(type: BenchmarkType) {
  const labels: Record<BenchmarkType, string> = {
    "personal-historical-baseline": "your personal historical baseline",
    "recent-trend-baseline": "your recent trend baseline",
    "household-baseline": "your authorized household baseline",
    "goal-baseline": "your stated goal",
    "professional-guideline": "a professional guideline",
    "population-benchmark": "a population benchmark",
    "age-benchmark": "an age-based benchmark",
    "peer-benchmark": "a peer benchmark",
    "configuration-threshold": "your configured threshold",
    "custom-benchmark": "the selected custom benchmark",
  };
  return labels[type];
}

function requiredScope(type: BenchmarkType) {
  if (type === "household-baseline") return "household:read";
  if (["personal-historical-baseline", "recent-trend-baseline", "goal-baseline"].includes(type)) return "member:read";
  return undefined;
}

export class SharedBenchmarkIntelligence {
  private readonly definitions = new Map<string, Readonly<BenchmarkDefinition>>();
  private readonly results = new Map<string, BenchmarkResult>();
  private readonly confidenceEngine = new SharedProbabilityConfidenceEngine();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  register(definition: BenchmarkDefinition) {
    validateDefinition(definition, this.now());
    if (this.definitions.has(definition.id)) throw new Error(`Benchmark ${definition.id} is already registered.`);
    const stored = Object.freeze({
      ...definition,
      source: Object.freeze({ ...definition.source }),
      calculation: Object.freeze({ ...definition.calculation }),
      applicableMemberConditions: Object.freeze({
        ...definition.applicableMemberConditions,
        requiredConditions: Object.freeze([...definition.applicableMemberConditions.requiredConditions]),
      }),
      applicableSpecialists: Object.freeze([...definition.applicableSpecialists]),
      notes: Object.freeze([...definition.notes]),
    });
    this.definitions.set(definition.id, stored);
    return stored;
  }

  get(benchmarkId: string) { return this.definitions.get(benchmarkId); }
  listForSpecialist(specialistId: string) {
    return Array.from(this.definitions.values()).filter((item) => item.applicableSpecialists.includes(specialistId));
  }

  evaluate(input: BenchmarkEvaluationInput): BenchmarkResult {
    const definition = this.definitions.get(input.benchmarkId);
    if (!definition) throw new Error(`Benchmark ${input.benchmarkId} is not registered.`);
    if (!definition.applicableSpecialists.includes(input.specialistId)) throw new Error(`Benchmark ${definition.id} is not available to ${input.specialistId}.`);
    validateDefinition(definition, this.now());
    const missingConditions = definition.applicableMemberConditions.requiredConditions.filter((condition) => input.conditionEvidence[condition] !== true);
    if (missingConditions.length) throw new Error(`Benchmark ${definition.id} is not applicable; missing ${missingConditions.join(", ")}.`);
    const scope = requiredScope(definition.type);
    if (scope && !input.authorizedScopes.includes(scope)) throw new Error(`Benchmark ${definition.id} requires ${scope}.`);
    if (![input.current.value, input.reference.value].every(Number.isFinite)) throw new Error("Benchmark values must be finite numbers.");
    const difference = input.current.value - input.reference.value;
    const percentDifference = input.reference.value === 0 ? undefined : Math.round((difference / Math.abs(input.reference.value)) * 10000) / 100;
    const comparison = compare(input.current.value, input.reference.value);
    const result: BenchmarkResult = {
      id: `${input.ownerId}:${input.specialistId}:${definition.id}`,
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      benchmarkId: definition.id,
      benchmarkName: definition.name,
      benchmarkType: definition.type,
      domain: definition.domain,
      current: input.current,
      reference: input.reference,
      difference,
      percentDifference,
      comparison,
      interpretation: `${input.current.label} is ${comparison} ${benchmarkLabel(definition.type)} (${input.reference.label}).`,
      source: definition.source,
      sourceDate: definition.sourceDate,
      confidence: definition.confidence,
      strengthOfEvidence: definition.strengthOfEvidence,
      calculation: definition.calculation,
      relatedObservationIds: (input.observations || [])
        .filter((item) => item.ownerId === input.ownerId && item.specialistId === input.specialistId && item.domain === definition.domain)
        .map((item) => item.id),
      limitations: [
        ...definition.notes,
        "A benchmark provides comparison context, not a guarantee, diagnosis, or promised outcome.",
      ],
      evaluatedAt: this.now(),
      confidenceAnalysis: this.confidenceEngine.assess({
        claim: `${input.current.label} compared with ${input.reference.label}`,
        evidence: [
          {
            id: "benchmark-current",
            source: definition.source.name,
            relationship: "supports",
            claimType: "direct",
            authority: definition.source.authority === "professional-authority" ? 0.95 : definition.source.authority === "population-study" ? 0.85 : 0.9,
            reliability: definition.strengthOfEvidence === "strong" ? 0.95 : definition.strengthOfEvidence === "moderate" ? 0.75 : 0.5,
            freshness: definition.expiresAt ? 0.9 : 0.75,
            completeness: 0.9,
            directness: 1,
            independent: false,
          },
        ],
        missingInformation: definition.notes,
      }),
    };
    this.results.set(result.id, result);
    return result;
  }

  retrieve(query: BenchmarkQuery) {
    return Array.from(this.results.values())
      .filter((item) =>
        item.ownerId === query.ownerId &&
        (!query.specialistId || item.specialistId === query.specialistId) &&
        (!query.domain || item.domain === query.domain) &&
        (!query.types?.length || query.types.includes(item.benchmarkType))
      )
      .sort((a, b) => a.benchmarkName.localeCompare(b.benchmarkName));
  }

  explain(ownerId: string, resultId: string) {
    const result = this.results.get(resultId);
    if (!result || result.ownerId !== ownerId) throw new Error(`Benchmark result ${resultId} was not found for this owner.`);
    return {
      comparison: result.interpretation,
      benchmarkType: result.benchmarkType,
      current: result.current,
      reference: result.reference,
      formula: result.calculation.formula,
      source: result.source,
      sourceDate: result.sourceDate,
      confidence: result.confidence,
      strengthOfEvidence: result.strengthOfEvidence,
      limitations: result.limitations,
      confidenceAnalysis: result.confidenceAnalysis,
    };
  }
}
