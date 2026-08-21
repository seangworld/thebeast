export const beastHunterResultCounts = [10, 25, 50, 100] as const;

export type BeastHunterResultCount = (typeof beastHunterResultCounts)[number];
export type BeastHunterStrictness = "strict" | "flexible";
export type BeastHunterInteraction = "none" | "low" | "any";
export type BeastHunterAutomation = "manual" | "assisted" | "mostly_automated" | "any";

export type BeastHunterCriteria = {
  query: string;
  huntTypes: string[];
  markets: string[];
  freshnessDays: number;
  interaction: BeastHunterInteraction;
  maximumStartupCost: number | null;
  maximumBuildDays: number | null;
  revenueModels: string[];
  monthlyRevenueTarget: number | null;
  automation: BeastHunterAutomation;
  maximumCompetition: number | null;
  geography: string;
  minimumActionWindowDays: number | null;
  strictness: BeastHunterStrictness;
  resultCount: BeastHunterResultCount;
};

export type BeastHunterEvidenceScores = {
  demand: number;
  velocity: number;
  competitionGap: number;
  commercialIntent: number;
  saturation: number;
  aiCommoditizationRisk: number;
  seangworldFit: number;
  timeToMarket: number;
  revenuePotential: number;
  durability: number;
  confidence: number;
  actionWindow: number;
};

export type BeastHunterCandidate = {
  id: string;
  title: string;
  summary: string;
  huntType: string;
  market: string;
  discoveredAt: string;
  startupCost: number | null;
  buildDays: number | null;
  interaction: Exclude<BeastHunterInteraction, "any">;
  automation: Exclude<BeastHunterAutomation, "any">;
  competition: number | null;
  actionWindowDays: number | null;
  revenueModels: string[];
  geography: string;
  evidence: { label: string; url: string; observedAt: string }[];
  scores: BeastHunterEvidenceScores;
};

export type BeastHunterRankedCandidate = BeastHunterCandidate & {
  score: number;
  rank: number;
  filterNotes: string[];
  trackingStatus?: BeastHunterTrackingStatus;
  validation?: BeastHunterValidation | null;
  buildBrief?: BeastHunterBuildBrief | null;
  trendStatus?: BeastHunterTrendStatus;
  lastMonitoredAt?: string | null;
};

export const BEAST_HUNTER_VERSION = "1.0.0";
export const beastHunterTrendStatuses = ["unknown", "rising", "stable", "falling", "saturated", "expired"] as const;
export type BeastHunterTrendStatus = (typeof beastHunterTrendStatuses)[number];
export type BeastHunterValidation = {
  verdict: "go" | "caution" | "no_go";
  demandEvidence: string;
  competitorAnalysis: string;
  realisticMonthlyRevenue: string;
  startupCost: string;
  buildEstimate: string;
  marketingDifficulty: string;
  platformDependencies: string[];
  reasonsToProceed: string[];
  reasonsToReject: string[];
  nextSteps: string[];
  sourceUrls: string[];
  validatedAt: string;
};
export type BeastHunterBuildBrief = {
  objective: string;
  audience: string;
  valueProposition: string;
  minimumViableScope: string[];
  exclusions: string[];
  milestones: string[];
  successMeasures: string[];
  risks: string[];
  createdAt: string;
};

export const beastHunterTrackingStatuses = ["new", "watch", "validate", "build", "rejected", "archived"] as const;
export type BeastHunterTrackingStatus = (typeof beastHunterTrackingStatuses)[number];

export function isBeastHunterTrackingStatus(value: unknown): value is BeastHunterTrackingStatus {
  return beastHunterTrackingStatuses.includes(value as BeastHunterTrackingStatus);
}

export const defaultBeastHunterCriteria: BeastHunterCriteria = {
  query: "",
  huntTypes: [],
  markets: [],
  freshnessDays: 30,
  interaction: "any",
  maximumStartupCost: null,
  maximumBuildDays: null,
  revenueModels: [],
  monthlyRevenueTarget: null,
  automation: "any",
  maximumCompetition: null,
  geography: "United States",
  minimumActionWindowDays: null,
  strictness: "flexible",
  resultCount: 25,
};

const positiveWeights: Record<Exclude<keyof BeastHunterEvidenceScores, "saturation" | "aiCommoditizationRisk">, number> = {
  demand: 0.12,
  velocity: 0.11,
  competitionGap: 0.1,
  commercialIntent: 0.1,
  seangworldFit: 0.12,
  timeToMarket: 0.08,
  revenuePotential: 0.11,
  durability: 0.08,
  confidence: 0.1,
  actionWindow: 0.08,
};

function bounded(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function scoreBeastHunterCandidate(scores: BeastHunterEvidenceScores) {
  const positive = Object.entries(positiveWeights).reduce(
    (total, [key, weight]) => total + bounded(scores[key as keyof typeof positiveWeights]) * weight,
    0
  );
  const riskPenalty = bounded(scores.saturation) * 0.08 + bounded(scores.aiCommoditizationRisk) * 0.07;
  return Math.round(Math.max(0, Math.min(100, positive - riskPenalty + 15)));
}

function evaluateCandidate(candidate: BeastHunterCandidate, criteria: BeastHunterCriteria) {
  const notes: string[] = [];
  const failures: string[] = [];
  const check = (passes: boolean, message: string) => {
    if (!passes) failures.push(message);
  };
  const normalizedQuery = criteria.query.trim().toLowerCase();
  if (normalizedQuery) {
    check(`${candidate.title} ${candidate.summary}`.toLowerCase().includes(normalizedQuery), "Query does not match directly");
  }
  if (criteria.huntTypes.length) check(criteria.huntTypes.includes(candidate.huntType), "Outside selected hunt types");
  if (criteria.markets.length) check(criteria.markets.includes(candidate.market), "Outside selected markets");
  if (criteria.maximumStartupCost !== null && candidate.startupCost !== null) check(candidate.startupCost <= criteria.maximumStartupCost, "Startup cost exceeds target");
  if (criteria.maximumBuildDays !== null && candidate.buildDays !== null) check(candidate.buildDays <= criteria.maximumBuildDays, "Build time exceeds target");
  if (criteria.maximumCompetition !== null && candidate.competition !== null) check(candidate.competition <= criteria.maximumCompetition, "Competition exceeds target");
  if (criteria.minimumActionWindowDays !== null && candidate.actionWindowDays !== null) check(candidate.actionWindowDays >= criteria.minimumActionWindowDays, "Action window is too short");
  if (criteria.interaction !== "any") check(candidate.interaction === criteria.interaction, "Interaction level differs");
  if (criteria.automation !== "any") check(candidate.automation === criteria.automation, "Automation level differs");
  if (criteria.revenueModels.length) check(candidate.revenueModels.some((model) => criteria.revenueModels.includes(model)), "Revenue model differs");
  if (criteria.geography.trim() && criteria.geography !== "Worldwide") check(candidate.geography === criteria.geography || candidate.geography === "Worldwide", "Geography differs");
  if (failures.length) notes.push(...failures);
  return { include: criteria.strictness === "flexible" || failures.length === 0, notes };
}

export function rankBeastHunterCandidates(candidates: BeastHunterCandidate[], criteria: BeastHunterCriteria) {
  return candidates
    .map((candidate) => ({ candidate, evaluation: evaluateCandidate(candidate, criteria) }))
    .filter(({ evaluation }) => evaluation.include)
    .map(({ candidate, evaluation }) => ({ ...candidate, score: scoreBeastHunterCandidate(candidate.scores), rank: 0, filterNotes: evaluation.notes }))
    .sort((a, b) => b.score - a.score || b.scores.confidence - a.scores.confidence || a.title.localeCompare(b.title))
    .slice(0, criteria.resultCount)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function validateBeastHunterCriteria(value: BeastHunterCriteria) {
  const errors: string[] = [];
  if (!value.query.trim() && !value.huntTypes.length && !value.markets.length) errors.push("Enter a hunt objective or select at least one type or market.");
  if (!beastHunterResultCounts.includes(value.resultCount)) errors.push("Result count must be 10, 25, 50, or 100.");
  if (value.freshnessDays < 1 || value.freshnessDays > 365) errors.push("Freshness must be between 1 and 365 days.");
  return errors;
}

export function normalizeBeastHunterCriteria(value: unknown): BeastHunterCriteria | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<BeastHunterCriteria>;
  const resultCount = Number(raw.resultCount) as BeastHunterResultCount;
  const criteria: BeastHunterCriteria = {
    query: typeof raw.query === "string" ? raw.query.trim().slice(0, 800) : "",
    huntTypes: Array.isArray(raw.huntTypes) ? raw.huntTypes.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
    markets: Array.isArray(raw.markets) ? raw.markets.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
    freshnessDays: Number(raw.freshnessDays),
    interaction: ["none", "low", "any"].includes(String(raw.interaction)) ? raw.interaction as BeastHunterInteraction : "any",
    maximumStartupCost: typeof raw.maximumStartupCost === "number" && raw.maximumStartupCost >= 0 ? raw.maximumStartupCost : null,
    maximumBuildDays: typeof raw.maximumBuildDays === "number" && raw.maximumBuildDays >= 0 ? raw.maximumBuildDays : null,
    revenueModels: Array.isArray(raw.revenueModels) ? raw.revenueModels.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
    monthlyRevenueTarget: typeof raw.monthlyRevenueTarget === "number" && raw.monthlyRevenueTarget >= 0 ? raw.monthlyRevenueTarget : null,
    automation: ["manual", "assisted", "mostly_automated", "any"].includes(String(raw.automation)) ? raw.automation as BeastHunterAutomation : "any",
    maximumCompetition: typeof raw.maximumCompetition === "number" ? Math.max(0, Math.min(100, raw.maximumCompetition)) : null,
    geography: typeof raw.geography === "string" ? raw.geography.trim().slice(0, 120) : "United States",
    minimumActionWindowDays: typeof raw.minimumActionWindowDays === "number" && raw.minimumActionWindowDays >= 0 ? raw.minimumActionWindowDays : null,
    strictness: raw.strictness === "strict" ? "strict" : "flexible",
    resultCount,
  };
  return validateBeastHunterCriteria(criteria).length ? null : criteria;
}
