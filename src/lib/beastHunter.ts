export const beastHunterResultCounts = [10, 25, 50, 100] as const;

export type BeastHunterResultCount = (typeof beastHunterResultCounts)[number];
export type BeastHunterStrictness = "strict" | "flexible";
export type BeastHunterInteraction = "none" | "low" | "any";
export type BeastHunterAutomation = "manual" | "assisted" | "mostly_automated" | "any";
export type BeastHunterAudience = "general_consumer" | "small_business" | "any";
export type BeastHunterSpecializedDomainMode = "penalize" | "allow";
export type BeastHunterRecommendation = "BUILD" | "WATCH" | "REJECT";

export const beastHunterHuntTypes = ["PDF / Book", "App / Micro-SaaS", "Calculator / Tool", "Service", "Affiliate", "Beast Capability", "Social Content"] as const;
export const beastHunterMarkets = ["General Consumer", "AI", "Money", "Education", "Health", "Home", "Careers", "Veterans", "Small Business", "Entertainment"] as const;

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
  audience: BeastHunterAudience;
  specializedDomains: BeastHunterSpecializedDomainMode;
  minimumOwnerFit: number;
  minimumVerifiability: number;
  maximumLiabilityRisk: number;
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
  ownerFit?: number;
  verifiability?: number;
  aiBuildability?: number;
  liabilityRisk?: number;
};

export type BeastHunterOpportunityExplanation = {
  whatItIs: string;
  customer: string;
  whatToBuild: string;
  whyNow: string;
  monetization: string;
  verifiability: string;
  difficulty: string;
  ownerInvolvement: string;
};

export type BeastHunterCandidate = {
  id: string;
  title: string;
  summary: string;
  huntType: string;
  market: string;
  audience: "general_consumer" | "small_business" | "professional";
  discoveredAt: string;
  startupCost: number | null;
  buildDays: number | null;
  interaction: Exclude<BeastHunterInteraction, "any">;
  automation: Exclude<BeastHunterAutomation, "any">;
  competition: number | null;
  actionWindowDays: number | null;
  revenueModels: string[];
  geography: string;
  expectedMonthlyRevenueLow: number | null;
  expectedMonthlyRevenueHigh: number | null;
  specializedDomain: "none" | "medical" | "legal" | "tax_compliance" | "engineering" | "regulated_finance" | "other";
  explanation: BeastHunterOpportunityExplanation;
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
  roadmapItemId?: string | null;
  executionStatus?: "not_queued" | "ready" | "in_progress" | "completed" | "blocked";
  githubIssueUrl?: string | null;
  recommendation: BeastHunterRecommendation;
  recommendationReason: string;
};

export const BEAST_HUNTER_VERSION = "1.3.0-preview";
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
  economics: {
    offerPrice: string;
    revenueModel: string;
    monthlySalesNeeded: string;
    grossRevenueRange: string;
    monthlyOperatingCost: string;
    grossMargin: string;
    breakEvenPoint: string;
    timeToFirstRevenue: string;
    incomeConfidence: "low" | "moderate" | "high";
  };
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
  audience: "general_consumer",
  specializedDomains: "penalize",
  minimumOwnerFit: 65,
  minimumVerifiability: 65,
  maximumLiabilityRisk: 45,
  maximumCompetition: null,
  geography: "United States",
  minimumActionWindowDays: null,
  strictness: "flexible",
  resultCount: 10,
};

export const beastHunterBuiltInPresets = [
  {
    id: "easy-app-ideas",
    name: "Easy App Ideas",
    description: "Consumer apps that are inexpensive, understandable, AI-buildable, and quick to validate.",
    criteria: { ...defaultBeastHunterCriteria, query: "Current general-consumer problems suited to a focused app or micro-SaaS", huntTypes: ["App / Micro-SaaS"], maximumStartupCost: 500, maximumBuildDays: 21, automation: "mostly_automated", maximumCompetition: 65 },
  },
  {
    id: "pdf-guide-opportunities",
    name: "PDF / Guide Opportunities",
    description: "Current consumer problems that support a verifiable, low-liability paid or free guide.",
    criteria: { ...defaultBeastHunterCriteria, query: "Current identifiable consumer problems suitable for a factual independently verifiable PDF, guide, or short book", huntTypes: ["PDF / Book"], maximumStartupCost: 250, maximumBuildDays: 10, revenueModels: ["One-time sale", "Affiliate"] },
  },
  {
    id: "consumer-tools",
    name: "Consumer Tools",
    description: "Simple calculators and web tools for a broad, identifiable consumer audience.",
    criteria: { ...defaultBeastHunterCriteria, query: "Useful current consumer problems suited to a simple calculator or web tool", huntTypes: ["Calculator / Tool"], maximumStartupCost: 500, maximumBuildDays: 14, revenueModels: ["Advertising", "Affiliate", "Freemium"] },
  },
  {
    id: "low-expertise-side-income",
    name: "Low-Expertise Side Income",
    description: "Low-cost products or automated services that do not require professional credentials.",
    criteria: { ...defaultBeastHunterCriteria, query: "Low-expertise side-income products for a general consumer or small-business buyer", huntTypes: ["App / Micro-SaaS", "Calculator / Tool", "PDF / Book", "Service"], audience: "any", maximumStartupCost: 750, maximumBuildDays: 21, interaction: "low", automation: "mostly_automated" },
  },
  {
    id: "ai-buildable-products",
    name: "AI-Buildable Products",
    description: "Products where AI can do substantial production work and the result remains independently checkable.",
    criteria: { ...defaultBeastHunterCriteria, query: "Current products AI can substantially build while a non-specialist owner can independently verify the result", huntTypes: ["App / Micro-SaaS", "Calculator / Tool", "PDF / Book"], maximumStartupCost: 750, maximumBuildDays: 21, automation: "mostly_automated", minimumOwnerFit: 70, minimumVerifiability: 70 },
  },
] satisfies Array<{ id: string; name: string; description: string; criteria: BeastHunterCriteria }>;

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
  actionWindow: 0.05,
  ownerFit: 0.12,
  verifiability: 0.1,
  aiBuildability: 0.08,
  liabilityRisk: 0,
};

function bounded(value: number | undefined) {
  return Math.max(0, Math.min(100, typeof value === "number" && Number.isFinite(value) ? value : 0));
}

export function scoreBeastHunterCandidate(scores: BeastHunterEvidenceScores) {
  const positive = Object.entries(positiveWeights).reduce(
    (total, [key, weight]) => total + bounded(scores[key as keyof typeof positiveWeights]) * weight,
    0
  );
  const riskPenalty = bounded(scores.saturation) * 0.07 + bounded(scores.aiCommoditizationRisk) * 0.05 + bounded(scores.liabilityRisk ?? 50) * 0.1;
  return Math.round(Math.max(0, Math.min(100, positive - riskPenalty + 12)));
}

const specializedTerms = /\b(medicaid|medicare|clinical|diagnos(?:is|tic)|medical billing|cpt|icd-?10|legal advice|attorney|tax compliance|tax code|engineering standard|professional engineer|securities compliance|finra)\b/i;

export function isExplicitSpecializedSearch(criteria: BeastHunterCriteria) {
  return criteria.specializedDomains === "allow" || specializedTerms.test(criteria.query);
}

export function recommendBeastHunterCandidate(candidate: BeastHunterCandidate, score = scoreBeastHunterCandidate(candidate.scores)) {
  const ownerFit = bounded(candidate.scores.ownerFit ?? 50);
  const verifiability = bounded(candidate.scores.verifiability ?? 50);
  const liabilityRisk = bounded(candidate.scores.liabilityRisk ?? 50);
  if (ownerFit < 45) return { recommendation: "REJECT" as const, reason: "The opportunity requires more specialized owner expertise than this search allows." };
  if (verifiability < 45) return { recommendation: "REJECT" as const, reason: "The finished product would be too difficult to verify independently." };
  if (liabilityRisk > 70) return { recommendation: "REJECT" as const, reason: "Professional or regulatory liability is too high for the current opportunity." };
  if (score >= 72 && ownerFit >= 65 && verifiability >= 65 && liabilityRisk <= 45 && candidate.scores.confidence >= 60) {
    return { recommendation: "BUILD" as const, reason: "Strong evidence, owner fit, verifiability, and manageable execution risk justify build consideration." };
  }
  return { recommendation: "WATCH" as const, reason: score < 60 ? "The evidence or economics are not yet strong enough to build." : "Promising, but one or more fit, validation, competition, or timing signals still need proof." };
}

function evaluateCandidate(candidate: BeastHunterCandidate, criteria: BeastHunterCriteria) {
  const notes: string[] = [];
  const failures: string[] = [];
  const check = (passes: boolean, message: string) => {
    if (!passes) failures.push(message);
  };
  const normalizedQuery = criteria.query.trim().toLowerCase();
  if (normalizedQuery) {
    const terms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length > 3 && !["current", "suited", "product", "opportunity", "problem", "general"].includes(term));
    const candidateText = `${candidate.title} ${candidate.summary} ${candidate.explanation.whatItIs} ${candidate.explanation.whatToBuild}`.toLowerCase();
    check(!terms.length || terms.some((term) => candidateText.includes(term)), "Objective relevance is weak");
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
  if (criteria.monthlyRevenueTarget !== null && candidate.expectedMonthlyRevenueHigh !== null) check(candidate.expectedMonthlyRevenueHigh >= criteria.monthlyRevenueTarget, "Revenue potential is below target");
  if (criteria.audience !== "any") check(candidate.audience === criteria.audience, "Audience differs from the requested buyer type");
  check((candidate.scores.ownerFit ?? 50) >= criteria.minimumOwnerFit, "Owner fit is below target");
  check((candidate.scores.verifiability ?? 50) >= criteria.minimumVerifiability, "Verifiability is below target");
  check((candidate.scores.liabilityRisk ?? 50) <= criteria.maximumLiabilityRisk, "Liability or regulatory risk exceeds target");
  if (criteria.geography.trim() && criteria.geography !== "Worldwide") check(candidate.geography === criteria.geography || candidate.geography === "Worldwide", "Geography differs");
  if (failures.length) notes.push(...failures);
  const defaultSpecializedHardStop = !isExplicitSpecializedSearch(criteria) && candidate.specializedDomain !== "none" && ((candidate.scores.ownerFit ?? 50) < 45 || (candidate.scores.verifiability ?? 50) < 45 || (candidate.scores.liabilityRisk ?? 50) > 70);
  return { include: !defaultSpecializedHardStop && (criteria.strictness === "flexible" || failures.length === 0), notes };
}

export function rankBeastHunterCandidates(candidates: BeastHunterCandidate[], criteria: BeastHunterCriteria) {
  return candidates
    .map((candidate) => ({ candidate, evaluation: evaluateCandidate(candidate, criteria) }))
    .filter(({ evaluation }) => evaluation.include)
    .map(({ candidate, evaluation }) => {
      const score = scoreBeastHunterCandidate(candidate.scores);
      return { ...candidate, score, rank: 0, filterNotes: evaluation.notes, ...recommendBeastHunterCandidate(candidate, score) };
    })
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
    audience: ["general_consumer", "small_business", "any"].includes(String(raw.audience)) ? raw.audience as BeastHunterAudience : "general_consumer",
    specializedDomains: raw.specializedDomains === "allow" ? "allow" : "penalize",
    minimumOwnerFit: typeof raw.minimumOwnerFit === "number" ? Math.max(0, Math.min(100, raw.minimumOwnerFit)) : 65,
    minimumVerifiability: typeof raw.minimumVerifiability === "number" ? Math.max(0, Math.min(100, raw.minimumVerifiability)) : 65,
    maximumLiabilityRisk: typeof raw.maximumLiabilityRisk === "number" ? Math.max(0, Math.min(100, raw.maximumLiabilityRisk)) : 45,
    maximumCompetition: typeof raw.maximumCompetition === "number" ? Math.max(0, Math.min(100, raw.maximumCompetition)) : null,
    geography: typeof raw.geography === "string" ? raw.geography.trim().slice(0, 120) : "United States",
    minimumActionWindowDays: typeof raw.minimumActionWindowDays === "number" && raw.minimumActionWindowDays >= 0 ? raw.minimumActionWindowDays : null,
    strictness: raw.strictness === "strict" ? "strict" : "flexible",
    resultCount,
  };
  return validateBeastHunterCriteria(criteria).length ? null : criteria;
}
