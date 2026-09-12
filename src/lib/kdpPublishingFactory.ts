export const KDP_FACTORY_VERSION = "0.2.0";

export const kdpPublicationStates = [
  "idea", "scored", "brief_ready", "brief_approved", "drafting", "quality_review",
  "package_ready", "owner_approved", "submitted", "published", "measured",
  "rejected", "blocked",
] as const;

export type KdpPublicationState = (typeof kdpPublicationStates)[number];
export type KdpFormat = "ebook" | "paperback" | "hardcover";

export const kdpStateTransitions: Record<KdpPublicationState, readonly KdpPublicationState[]> = {
  idea: ["scored", "rejected"],
  scored: ["brief_ready", "rejected"],
  brief_ready: ["brief_approved", "scored", "rejected"],
  brief_approved: ["drafting", "rejected"],
  drafting: ["quality_review", "blocked", "rejected"],
  quality_review: ["drafting", "package_ready", "blocked", "rejected"],
  package_ready: ["quality_review", "owner_approved", "rejected"],
  owner_approved: ["package_ready", "submitted", "rejected"],
  submitted: ["published", "blocked"],
  published: ["measured", "blocked"],
  measured: [],
  rejected: [],
  blocked: ["drafting", "quality_review", "package_ready", "owner_approved", "submitted", "published", "rejected"],
};

export function canTransitionKdpPublication(from: KdpPublicationState, to: KdpPublicationState) {
  return kdpStateTransitions[from].includes(to);
}

export type KdpOpportunityInput = {
  buyerIntent: number;
  differentiation: number;
  evidenceReadiness: number;
  seriesPotential: number;
  timeToMarketDays: number;
  estimatedCashCost: number;
};

export type KdpPublicationBrief = {
  positioning: string;
  readerOutcome: string;
  chapters: string[];
  evidencePlan: string[];
  acceptanceCriteria: string[];
};

export function buildKdpPublicationBrief(input: {
  title: string;
  audience: string;
  topic: string;
  formats: KdpFormat[];
}): KdpPublicationBrief {
  return {
    positioning: `${input.title} is a concise, practical guide for ${input.audience}.`,
    readerOutcome: `Help the reader understand and act on: ${input.topic}`,
    chapters: [
      "The problem and what changes now",
      "Essential concepts and decision points",
      "A step-by-step action plan",
      "Common mistakes and risk controls",
      "Checklist, resources, and next actions",
    ],
    evidencePlan: [
      "Verify time-sensitive claims against current primary sources.",
      "Record source links and access dates for factual review.",
      "Run originality, rights, and AI-disclosure reviews before approval.",
    ],
    acceptanceCriteria: [
      `Produce a complete package for ${input.formats.join(", ")}.`,
      "Every factual claim is supported or clearly framed as guidance.",
      "Interior, cover, metadata, pricing, and disclosures pass the package gate.",
    ],
  };
}

function bounded(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function scoreKdpOpportunity(input: KdpOpportunityInput) {
  const speed = bounded(100 - Math.max(0, input.timeToMarketDays - 1) * 4);
  const cost = bounded(100 - Math.max(0, input.estimatedCashCost));
  const score = Math.round(
    bounded(input.buyerIntent) * 0.30 +
    bounded(input.differentiation) * 0.25 +
    bounded(input.evidenceReadiness) * 0.15 +
    bounded(input.seriesPotential) * 0.15 +
    speed * 0.10 +
    cost * 0.05,
  );
  return {
    score,
    recommendation: score >= 75 ? "advance" : score >= 55 ? "review" : "hold",
    limitations: [
      "The score ranks preparation priority; it does not predict sales.",
      "Marketplace demand, competition and account eligibility require current evidence before submission.",
    ],
  } as const;
}

export type KdpPricingInput = {
  format: KdpFormat;
  marketplaceCurrency: "USD";
  marketplaceMinimum: number;
  printingCost?: number | null;
  targetPrintMargin?: number | null;
};

export function recommendKdpListPrice(input: KdpPricingInput) {
  if (!Number.isFinite(input.marketplaceMinimum) || input.marketplaceMinimum <= 0) return null;
  if (input.format === "ebook") {
    const listPrice = Math.max(0.99, input.marketplaceMinimum);
    return {
      listPrice: Math.ceil(listPrice * 100) / 100,
      strategy: "lowest_eligible_ebook_price",
      royaltyPlan: "35_percent_or_current_eligible_plan",
      requiresCurrentRuleCheck: true,
    } as const;
  }
  if (!Number.isFinite(input.printingCost) || (input.printingCost ?? 0) < 0) return null;
  const margin = Number.isFinite(input.targetPrintMargin) ? Math.max(0, input.targetPrintMargin ?? 0) : 2;
  const listPrice = Math.max(input.marketplaceMinimum, (input.printingCost ?? 0) + margin);
  return {
    listPrice: Math.ceil(listPrice * 100) / 100,
    strategy: "print_minimum_plus_margin",
    royaltyPlan: "current_print_royalty_terms",
    requiresCurrentRuleCheck: true,
  } as const;
}

export type KdpPackageEvidence = {
  manuscript: boolean;
  interior: boolean;
  cover: boolean;
  metadata: boolean;
  pricing: boolean;
  originalityReview: boolean;
  rightsReview: boolean;
  factualReview: boolean;
  aiDisclosurePrepared: boolean;
};

export function evaluateKdpPackageReadiness(evidence: KdpPackageEvidence) {
  const missing = Object.entries(evidence).filter(([, ready]) => !ready).map(([name]) => name);
  return {
    readyForOwnerApproval: missing.length === 0,
    missing,
    submissionAuthorized: false,
    ownerAction: missing.length ? "Complete blocking package evidence." : "Review the complete package and explicitly approve or reject it.",
  };
}
