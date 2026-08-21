import type { BeastHunterCandidate, BeastHunterCriteria, BeastHunterEvidenceScores } from "./beastHunter";

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
        required: ["title", "summary", "huntType", "market", "startupCost", "buildDays", "interaction", "automation", "competition", "actionWindowDays", "revenueModels", "geography", "sourceUrls", "scores"],
        properties: {
          title: { type: "string" }, summary: { type: "string" }, huntType: { type: "string" }, market: { type: "string" },
          startupCost: { anyOf: [{ type: "number" }, { type: "null" }] }, buildDays: { anyOf: [{ type: "number" }, { type: "null" }] },
          interaction: { type: "string", enum: ["none", "low"] }, automation: { type: "string", enum: ["manual", "assisted", "mostly_automated"] },
          competition: { anyOf: [{ type: "number" }, { type: "null" }] }, actionWindowDays: { anyOf: [{ type: "number" }, { type: "null" }] },
          revenueModels: { type: "array", items: { type: "string" } }, geography: { type: "string" }, sourceUrls: { type: "array", minItems: 1, items: { type: "string" } },
          scores: { type: "object", additionalProperties: false, required: ["demand", "velocity", "competitionGap", "commercialIntent", "saturation", "aiCommoditizationRisk", "seangworldFit", "timeToMarket", "revenuePotential", "durability", "confidence", "actionWindow"], properties: Object.fromEntries(["demand", "velocity", "competitionGap", "commercialIntent", "saturation", "aiCommoditizationRisk", "seangworldFit", "timeToMarket", "revenuePotential", "durability", "confidence", "actionWindow"].map((name) => [name, { type: "number", minimum: 0, maximum: 100 }])) },
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
    if (numericScores.length !== 12 || numericScores.some((value) => typeof value !== "number" || value < 0 || value > 100)) return [];
    const candidate: BeastHunterCandidate = {
      id: crypto.randomUUID(), title: String(item.title || "").trim().slice(0, 180), summary: String(item.summary || "").trim().slice(0, 1200),
      huntType: String(item.huntType || "").trim(), market: String(item.market || "").trim(), discoveredAt: now,
      startupCost: typeof item.startupCost === "number" ? Math.max(0, item.startupCost) : null, buildDays: typeof item.buildDays === "number" ? Math.max(0, item.buildDays) : null,
      interaction: item.interaction === "none" ? "none" : "low", automation: ["manual", "assisted", "mostly_automated"].includes(String(item.automation)) ? item.automation as BeastHunterCandidate["automation"] : "assisted",
      competition: typeof item.competition === "number" ? Math.max(0, Math.min(100, item.competition)) : null, actionWindowDays: typeof item.actionWindowDays === "number" ? Math.max(0, item.actionWindowDays) : null,
      revenueModels: Array.isArray(item.revenueModels) ? item.revenueModels.filter((value): value is string => typeof value === "string") : [], geography: String(item.geography || "Worldwide"),
      evidence: sourceUrls.map((url) => ({ ...cited.get(url)!, observedAt: now })), scores,
    };
    return candidate.title && candidate.summary ? [candidate] : [];
  });
}

export function buildBeastHunterResearchInput(criteria: BeastHunterCriteria) {
  return JSON.stringify({ huntContract: criteria, instruction: `Research and return up to ${criteria.resultCount} opportunities. Apply the contract before selecting candidates.` });
}
