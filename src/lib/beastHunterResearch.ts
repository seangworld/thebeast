import { beastHunterHuntTypes, beastHunterMarkets, isExplicitSpecializedSearch, type BeastHunterCandidate, type BeastHunterCriteria, type BeastHunterEvidenceScores, type BeastHunterOpportunityExplanation } from "./beastHunter";

type Citation = { type?: string; url?: string; title?: string };
export type BeastHunterResearchPayload = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; annotations?: Citation[] }>; action?: { sources?: Array<{ url?: string; title?: string }> } }>;
};

export const beastHunterResearchInstructions = [
  "You are BeastHunter, SEANGWORLD's private opportunity research analyst.",
  "Use current web research. Find genuine emerging commercial opportunities that match the supplied hunt contract.",
  "Do not invent demand, revenue, competition, costs, dates, sources, or certainty.",
  "Each opportunity must be supported by at least one URL that appears in your web-search citations.",
  "Return conservative estimates. Scores are evidence assessments from 0 to 100, not guarantees.",
  "Saturation and AI commoditization are risk scores: higher means worse.",
  "Owner Fit measures whether a non-specialist owner can understand the concept, supervise the work, identify the customer, and judge the outcome.",
  "Verifiability measures whether the finished product can be independently checked without relying on AI to verify its own specialized claims.",
  "AI Buildability measures how much production or development AI can perform under owner review. Liability Risk is higher when incorrect output could create professional, regulatory, medical, legal, tax, financial, or engineering harm.",
  "Unless the hunt explicitly requests a specialized domain, prefer broadly understandable consumer or small-business products and penalize specialized medical billing, clinical, legal, tax/compliance, engineering, and regulated-finance workflows.",
  "Do not permanently ban specialized domains. Return them when the hunt explicitly asks for one, but label the domain and score owner fit, verifiability, and liability honestly.",
  "Every opportunity must explain in plain language what it is, who uses or buys it, exactly what would be built, why current evidence matters, how it makes money, how it can be verified, how hard it is, and what the owner must do.",
  "Prefer fewer strong, concrete, attributable opportunities over filling the requested maximum with obscure niches.",
  "Keep opportunities distinct and actionable. Prefer primary sources and direct market evidence.",
].join("\n");

export const beastHunterResearchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["opportunities"],
  properties: {
    opportunities: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary", "huntType", "market", "audience", "startupCost", "buildDays", "interaction", "automation", "competition", "actionWindowDays", "revenueModels", "expectedMonthlyRevenueLow", "expectedMonthlyRevenueHigh", "geography", "specializedDomain", "explanation", "sourceUrls", "scores"],
        properties: {
          title: { type: "string" }, summary: { type: "string" }, huntType: { type: "string", enum: beastHunterHuntTypes }, market: { type: "string", enum: beastHunterMarkets }, audience: { type: "string", enum: ["general_consumer", "small_business", "professional"] },
          startupCost: { anyOf: [{ type: "number" }, { type: "null" }] }, buildDays: { anyOf: [{ type: "number" }, { type: "null" }] },
          interaction: { type: "string", enum: ["none", "low"] }, automation: { type: "string", enum: ["manual", "assisted", "mostly_automated"] },
          competition: { anyOf: [{ type: "number" }, { type: "null" }] }, actionWindowDays: { anyOf: [{ type: "number" }, { type: "null" }] },
          revenueModels: { type: "array", items: { type: "string" } },
          expectedMonthlyRevenueLow: { anyOf: [{ type: "number" }, { type: "null" }] }, expectedMonthlyRevenueHigh: { anyOf: [{ type: "number" }, { type: "null" }] },
          geography: { type: "string" }, specializedDomain: { type: "string", enum: ["none", "medical", "legal", "tax_compliance", "engineering", "regulated_finance", "other"] },
          explanation: { type: "object", additionalProperties: false, required: ["whatItIs", "customer", "whatToBuild", "whyNow", "monetization", "verifiability", "difficulty", "ownerInvolvement"], properties: Object.fromEntries(["whatItIs", "customer", "whatToBuild", "whyNow", "monetization", "verifiability", "difficulty", "ownerInvolvement"].map((name) => [name, { type: "string" }])) },
          sourceUrls: { type: "array", minItems: 1, items: { type: "string" } },
          scores: { type: "object", additionalProperties: false, required: ["demand", "velocity", "competitionGap", "commercialIntent", "saturation", "aiCommoditizationRisk", "seangworldFit", "timeToMarket", "revenuePotential", "durability", "confidence", "actionWindow", "ownerFit", "verifiability", "aiBuildability", "liabilityRisk"], properties: Object.fromEntries(["demand", "velocity", "competitionGap", "commercialIntent", "saturation", "aiCommoditizationRisk", "seangworldFit", "timeToMarket", "revenuePotential", "durability", "confidence", "actionWindow", "ownerFit", "verifiability", "aiBuildability", "liabilityRisk"].map((name) => [name, { type: "number", minimum: 0, maximum: 100 }])) },
        },
      },
    },
  },
} as const;

function citations(payload: BeastHunterResearchPayload) {
  const annotations = (payload.output || []).flatMap((item) => item.content || []).flatMap((item) => item.annotations || []).filter((item) => item.type === "url_citation" && item.url);
  const searchSources = (payload.output || []).flatMap((item) => item.action?.sources || []).filter((item) => item.url).map((item) => ({ ...item, type: "url_citation" }));
  const found = [...annotations, ...searchSources];
  return new Map(found.map((item) => [item.url as string, { label: item.title?.trim() || new URL(item.url as string).hostname, url: item.url as string }]));
}

export function parseBeastHunterResearch(payload: BeastHunterResearchPayload, criteria: BeastHunterCriteria, now = new Date().toISOString()) {
  const rawText = payload.output_text || (payload.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!rawText) throw new Error("BeastHunter returned no structured opportunities.");
  const raw = JSON.parse(rawText) as { opportunities?: Array<Record<string, unknown>> };
  const cited = citations(payload);
  return (raw.opportunities || []).slice(0, criteria.resultCount).flatMap((item, index) => {
    const sourceUrls = Array.isArray(item.sourceUrls) ? item.sourceUrls.filter((url): url is string => typeof url === "string" && cited.has(url)) : [];
    if (!sourceUrls.length || !item.scores || typeof item.scores !== "object") return [];
    const scores = item.scores as BeastHunterEvidenceScores;
    const numericScores = Object.values(scores);
    if (numericScores.length !== 16 || numericScores.some((value) => typeof value !== "number" || value < 0 || value > 100)) return [];
    const explanation = item.explanation as BeastHunterOpportunityExplanation | undefined;
    if (!explanation || Object.values(explanation).length !== 8 || Object.values(explanation).some((value) => typeof value !== "string" || !value.trim())) return [];
    const candidate: BeastHunterCandidate = {
      id: crypto.randomUUID(), title: String(item.title || "").trim().slice(0, 180), summary: String(item.summary || "").trim().slice(0, 1200),
      huntType: String(item.huntType || "").trim(), market: String(item.market || "").trim(), audience: ["small_business", "professional"].includes(String(item.audience)) ? item.audience as BeastHunterCandidate["audience"] : "general_consumer", discoveredAt: now,
      startupCost: typeof item.startupCost === "number" ? Math.max(0, item.startupCost) : null, buildDays: typeof item.buildDays === "number" ? Math.max(0, item.buildDays) : null,
      interaction: item.interaction === "none" ? "none" : "low", automation: ["manual", "assisted", "mostly_automated"].includes(String(item.automation)) ? item.automation as BeastHunterCandidate["automation"] : "assisted",
      competition: typeof item.competition === "number" ? Math.max(0, Math.min(100, item.competition)) : null, actionWindowDays: typeof item.actionWindowDays === "number" ? Math.max(0, item.actionWindowDays) : null,
      revenueModels: Array.isArray(item.revenueModels) ? item.revenueModels.filter((value): value is string => typeof value === "string") : [], geography: String(item.geography || "Worldwide"),
      expectedMonthlyRevenueLow: typeof item.expectedMonthlyRevenueLow === "number" ? Math.max(0, item.expectedMonthlyRevenueLow) : null,
      expectedMonthlyRevenueHigh: typeof item.expectedMonthlyRevenueHigh === "number" ? Math.max(0, item.expectedMonthlyRevenueHigh) : null,
      specializedDomain: ["medical", "legal", "tax_compliance", "engineering", "regulated_finance", "other"].includes(String(item.specializedDomain)) ? item.specializedDomain as BeastHunterCandidate["specializedDomain"] : "none",
      explanation: Object.fromEntries(Object.entries(explanation).map(([key, value]) => [key, value.trim().slice(0, 1200)])) as BeastHunterOpportunityExplanation,
      evidence: sourceUrls.map((url) => ({ ...cited.get(url)!, observedAt: now })), scores,
    };
    return candidate.title && candidate.summary ? [candidate] : [];
  });
}

export function buildBeastHunterResearchInput(criteria: BeastHunterCriteria) {
  return JSON.stringify({
    huntContract: criteria,
    explicitSpecializedSearch: isExplicitSpecializedSearch(criteria),
    instruction: `Research and return no more than ${criteria.resultCount} opportunities. Quality is more important than filling the maximum. Apply every contract field before selecting candidates. For broad searches, omit specialized professional opportunities that a non-specialist owner cannot reasonably understand or verify.`,
  });
}
