export const KDP_MANUSCRIPT_VERSION = "0.1.0";

export type KdpChapterSource = {
  title: string;
  url: string;
  claim: string;
  retrievedAt: string;
};

export type KdpChapterDraft = {
  draftText: string;
  sources: KdpChapterSource[];
  limitations: string[];
};

type Citation = { type?: string; url?: string; title?: string };
export type KdpManuscriptProviderPayload = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; annotations?: Citation[] }>; action?: { sources?: Array<{ url?: string; title?: string }> } }>;
};

export const kdpChapterDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["draftText", "sourceNotes", "limitations"],
  properties: {
    draftText: { type: "string" },
    sourceNotes: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["title", "url", "claim"], properties: { title: { type: "string" }, url: { type: "string" }, claim: { type: "string" } } } },
    limitations: { type: "array", maxItems: 12, items: { type: "string" } },
  },
} as const;

function safeUrl(value: string) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}

function citedSources(payload: KdpManuscriptProviderPayload) {
  const annotations = (payload.output || []).flatMap((item) => item.content || []).flatMap((item) => item.annotations || []).filter((item) => item.type === "url_citation" && item.url);
  const searched = (payload.output || []).flatMap((item) => item.action?.sources || []).filter((item) => item.url).map((item) => ({ ...item, type: "url_citation" }));
  return new Map([...annotations, ...searched].flatMap((item) => { const url = safeUrl(String(item.url)); return url ? [[url, item.title?.trim() || new URL(url).hostname] as const] : []; }));
}

export function parseKdpChapterDraft(payload: KdpManuscriptProviderPayload, retrievedAt = new Date().toISOString()): KdpChapterDraft {
  const text = payload.output_text || (payload.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("No structured chapter draft was returned.");
  const raw = JSON.parse(text) as { draftText?: unknown; sourceNotes?: Array<Record<string, unknown>>; limitations?: unknown[] };
  const draftText = typeof raw.draftText === "string" ? raw.draftText.trim() : "";
  const citations = citedSources(payload);
  const sources = (raw.sourceNotes || []).flatMap((item) => {
    const url = safeUrl(String(item.url || ""));
    if (!url || !citations.has(url) || typeof item.claim !== "string" || !item.claim.trim()) return [];
    return [{ title: String(item.title || citations.get(url)).trim().slice(0, 240), url, claim: item.claim.trim().slice(0, 600), retrievedAt }];
  });
  const uniqueSources = Array.from(new Map(sources.map((source) => [source.url, source])).values());
  if (draftText.split(/\s+/).length < 300 || !uniqueSources.length) throw new Error("The draft failed minimum length or attributable-source requirements.");
  return { draftText: draftText.slice(0, 80_000), sources: uniqueSources, limitations: (raw.limitations || []).filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 500)).slice(0, 12) };
}

export function kdpChapterInstructions() {
  return [
    "You are the private SEANGWORLD KDP manuscript drafting specialist.",
    "Draft only the requested chapter and use current web research for every time-sensitive factual claim.",
    "Prefer primary and authoritative sources. Do not invent facts, quotations, studies, laws, prices, platform rules, or outcomes.",
    "Write original practical prose; never copy substantial source language and never pad the chapter with repetitive filler.",
    "Do not provide individualized legal, tax, medical, or financial advice. State important limits and verification needs.",
    "Every sourceNotes URL must be present in the web-search citations and identify the claim it supports.",
    "Return at least 300 words. This is a review draft, not an approved or publishable manuscript.",
  ].join("\n");
}
