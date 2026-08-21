import type { BeastHunterBuildBrief, BeastHunterRankedCandidate, BeastHunterTrendStatus, BeastHunterValidation } from "./beastHunter";
import type { BeastHunterResearchPayload } from "./beastHunterResearch";

const stringArray = { type: "array", items: { type: "string" } } as const;

export const beastHunterValidationSchema = {
  type: "object", additionalProperties: false,
  required: ["verdict", "demandEvidence", "competitorAnalysis", "realisticMonthlyRevenue", "startupCost", "buildEstimate", "marketingDifficulty", "economics", "platformDependencies", "reasonsToProceed", "reasonsToReject", "nextSteps", "sourceUrls"],
  properties: {
    verdict: { type: "string", enum: ["go", "caution", "no_go"] }, demandEvidence: { type: "string" }, competitorAnalysis: { type: "string" }, realisticMonthlyRevenue: { type: "string" }, startupCost: { type: "string" }, buildEstimate: { type: "string" }, marketingDifficulty: { type: "string" }, economics: { type: "object", additionalProperties: false, required: ["offerPrice", "revenueModel", "monthlySalesNeeded", "grossRevenueRange", "monthlyOperatingCost", "grossMargin", "breakEvenPoint", "timeToFirstRevenue", "incomeConfidence"], properties: { offerPrice: { type: "string" }, revenueModel: { type: "string" }, monthlySalesNeeded: { type: "string" }, grossRevenueRange: { type: "string" }, monthlyOperatingCost: { type: "string" }, grossMargin: { type: "string" }, breakEvenPoint: { type: "string" }, timeToFirstRevenue: { type: "string" }, incomeConfidence: { type: "string", enum: ["low", "moderate", "high"] } } }, platformDependencies: stringArray, reasonsToProceed: stringArray, reasonsToReject: stringArray, nextSteps: stringArray, sourceUrls: stringArray,
  },
} as const;

export const beastHunterMonitorSchema = {
  type: "object", additionalProperties: false,
  required: ["trendStatus", "summary", "totalScore", "sourceUrls"],
  properties: { trendStatus: { type: "string", enum: ["rising", "stable", "falling", "saturated", "expired"] }, summary: { type: "string" }, totalScore: { type: "number", minimum: 0, maximum: 100 }, sourceUrls: stringArray },
} as const;

function outputText(payload: BeastHunterResearchPayload) {
  return payload.output_text || (payload.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
}

function citedUrls(payload: BeastHunterResearchPayload) {
  return new Set((payload.output || []).flatMap((item) => [
    ...(item.content || []).flatMap((content) => content.annotations || []).map((source) => source.url),
    ...(item.action?.sources || []).map((source) => source.url),
  ]).filter((url): url is string => Boolean(url)));
}

export function parseBeastHunterValidation(payload: BeastHunterResearchPayload, now = new Date().toISOString()): { validation: BeastHunterValidation; sourceUrls: string[] } {
  const text = outputText(payload);
  if (!text) throw new Error("Validation returned no structured result.");
  const raw = JSON.parse(text) as Omit<BeastHunterValidation, "validatedAt"> & { sourceUrls?: string[] };
  const allowed = citedUrls(payload);
  const sourceUrls = (raw.sourceUrls || []).filter((url) => allowed.has(url));
  if (!sourceUrls.length || !["go", "caution", "no_go"].includes(raw.verdict)) throw new Error("Validation was not supported by attributable evidence.");
  if (!raw.economics || !["low", "moderate", "high"].includes(raw.economics.incomeConfidence)) throw new Error("Validation returned incomplete opportunity economics.");
  return { validation: { verdict: raw.verdict, demandEvidence: raw.demandEvidence, competitorAnalysis: raw.competitorAnalysis, realisticMonthlyRevenue: raw.realisticMonthlyRevenue, startupCost: raw.startupCost, buildEstimate: raw.buildEstimate, marketingDifficulty: raw.marketingDifficulty, economics: raw.economics, platformDependencies: raw.platformDependencies || [], reasonsToProceed: raw.reasonsToProceed || [], reasonsToReject: raw.reasonsToReject || [], nextSteps: raw.nextSteps || [], sourceUrls, validatedAt: now }, sourceUrls };
}

export function parseBeastHunterMonitor(payload: BeastHunterResearchPayload) {
  const text = outputText(payload);
  if (!text) throw new Error("Monitoring returned no structured result.");
  const raw = JSON.parse(text) as { trendStatus?: BeastHunterTrendStatus; summary?: string; totalScore?: number; sourceUrls?: string[] };
  const allowed = citedUrls(payload);
  const sourceUrls = (raw.sourceUrls || []).filter((url) => allowed.has(url));
  if (!sourceUrls.length || !raw.trendStatus || raw.trendStatus === "unknown" || typeof raw.totalScore !== "number") throw new Error("Monitoring was not supported by attributable evidence.");
  return { trendStatus: raw.trendStatus, summary: String(raw.summary || ""), totalScore: Math.max(0, Math.min(100, Math.round(raw.totalScore))), sourceUrls };
}

export function buildBeastHunterBuildBrief(opportunity: BeastHunterRankedCandidate): BeastHunterBuildBrief {
  const validation = opportunity.validation;
  return {
    objective: `Launch a validated first version of ${opportunity.title}.`,
    audience: `${opportunity.market} customers in ${opportunity.geography || "the selected market"}.`,
    valueProposition: opportunity.summary,
    minimumViableScope: validation?.nextSteps?.slice(0, 5) || ["Confirm the target customer", "Define the smallest sellable outcome", "Build the core delivery workflow", "Publish a conversion-ready offer"],
    exclusions: ["Unvalidated expansion features", "Autonomous financial commitments", "Unsupported revenue guarantees"],
    milestones: ["Evidence and scope approved", "Minimum viable product complete", "Checkout or conversion path tested", "First-market validation reviewed"],
    successMeasures: ["A working offer reaches the intended audience", "Demand evidence is recorded", "Acquisition cost and conversion are measurable", "Owner makes the scale, revise, or stop decision"],
    risks: validation?.reasonsToReject?.slice(0, 5) || opportunity.filterNotes,
    createdAt: new Date().toISOString(),
  };
}
