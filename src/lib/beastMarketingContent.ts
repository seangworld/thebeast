import type { VideoSeriesSettings } from "./beastMarketingVideo";

export const VIDEO_CONTENT_ENGINE_VERSION = "0.4.0";

export type VideoEvidence = {
  source: "search_console" | "ga4" | "first_party" | "owner" | "youtube_history";
  label: string;
  url: string | null;
  observedAt: string | null;
  sampleSize: number | null;
  value: number | null;
  limitation: string | null;
};

export type VideoOpportunityInput = {
  title: string;
  category: string;
  capabilityMatch: number;
  funnelValue: number;
  historicalPerformance: number | null;
  audienceInterest: number | null;
  trendOpportunity: number | null;
  evidence: VideoEvidence[];
};

export type VideoOpportunity = VideoOpportunityInput & {
  score: number;
  confidence: number;
  selectable: boolean;
  evidenceStatus: "verified" | "partial" | "owner_only";
  rationale: string[];
};

const bounded = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreVideoOpportunity(input: VideoOpportunityInput, settings: VideoSeriesSettings): VideoOpportunity {
  const measured = [input.audienceInterest, input.trendOpportunity, input.historicalPerformance].filter((value): value is number => value !== null);
  const evidenceStatus = input.evidence.some((item) => item.source !== "owner") ? (measured.length >= 2 ? "verified" : "partial") : "owner_only";
  const interest = input.audienceInterest ?? 0;
  const trend = input.trendOpportunity ?? 0;
  const history = input.historicalPerformance ?? 0;
  const availableWeight = 35 + 25 + (input.audienceInterest === null ? 0 : 20) + (input.trendOpportunity === null ? 0 : 10) + (input.historicalPerformance === null ? 0 : 10);
  const weighted = input.capabilityMatch * 0.35 + input.funnelValue * 0.25 + interest * 0.20 + trend * 0.10 + history * 0.10;
  const score = bounded(weighted * 100 / availableWeight);
  const confidence = bounded(Math.min(100, input.evidence.length * 15 + measured.length * 15 + (input.capabilityMatch >= 70 ? 10 : 0)));
  const excluded = settings.excludedTopics.some((topic) => input.title.toLowerCase().includes(topic.toLowerCase()));
  const allowed = !settings.allowedTopics.length || settings.allowedTopics.some((topic) => `${input.title} ${input.category}`.toLowerCase().includes(topic.toLowerCase()));
  return {
    ...input, score, confidence, evidenceStatus,
    selectable: !excluded && allowed && input.capabilityMatch >= 50 && confidence >= settings.minimumOpportunityConfidence,
    rationale: [
      `Capability match ${bounded(input.capabilityMatch)}/100; funnel value ${bounded(input.funnelValue)}/100.`,
      measured.length ? `${measured.length} measured opportunity dimension${measured.length === 1 ? "" : "s"} available.` : "Audience, trend, and historical performance evidence are unavailable.",
      evidenceStatus === "owner_only" ? "Owner input only; no external demand claim is permitted." : `${input.evidence.length} provenance record${input.evidence.length === 1 ? "" : "s"} retained.`,
      ...(excluded ? ["The topic matches the series exclusion policy."] : []),
      ...(!allowed ? ["The topic does not match the series allowlist."] : []),
    ],
  };
}

export type ScriptFact = { statement: string; sourceLabel: string; sourceUrl: string | null; verified: boolean };
export type VideoScript = { hook: string; narration: string[]; cta: string; estimatedSeconds: number; facts: ScriptFact[]; warnings: string[]; generationReady: boolean };

export function buildGroundedScript(input: { topic: string; facts: ScriptFact[]; destinationLabel: string; destinationUrl: string; settings: VideoSeriesSettings }): VideoScript {
  const facts = input.facts.filter((fact) => fact.verified && fact.statement.trim()).slice(0, 8);
  const hook = `What should you know about ${input.topic} before you act?`;
  const narration = facts.map((fact, index) => `${index === 0 ? "Start here" : "Next"}: ${fact.statement.trim()}`);
  const cta = `For the relevant tools and current details, visit ${input.destinationLabel}.`;
  const wordCount = [hook, ...narration, cta].join(" ").split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);
  const warnings = [
    ...(!facts.length ? ["No verified facts are available for an original factual script."] : []),
    ...(estimatedSeconds < input.settings.minimumRuntimeSeconds ? ["Verified material is too short for the configured minimum; do not pad with filler."] : []),
    ...(estimatedSeconds > input.settings.maximumRuntimeSeconds ? ["The script exceeds the configured maximum runtime."] : []),
    ...(!/^https:\/\//.test(input.destinationUrl) ? ["The destination must be HTTPS."] : []),
  ];
  return { hook, narration, cta, estimatedSeconds, facts, warnings, generationReady: warnings.length === 0 };
}

export type YouTubeMetadata = { title: string; description: string; tags: string[]; hashtags: string[]; spokenTerms: string[]; destinationUrl: string; campaign: Record<string, string>; warnings: string[] };

export function buildYouTubeMetadata(input: { topic: string; summary: string; keywords: string[]; destinationUrl: string; campaignId: string }): YouTubeMetadata {
  const natural = Array.from(new Set(input.keywords.map((item) => item.trim().toLowerCase()).filter((item) => item.length >= 2 && item.length <= 40))).slice(0, 12);
  const separator = input.destinationUrl.includes("?") ? "&" : "?";
  const destinationUrl = `${input.destinationUrl}${separator}utm_source=youtube&utm_medium=organic_video&utm_campaign=${encodeURIComponent(input.campaignId)}`;
  const title = input.topic.trim().slice(0, 100);
  const hashtags = natural.slice(0, 3).map((item) => `#${item.replace(/[^a-z0-9]+/g, "")}`).filter((item) => item.length > 1);
  const warnings = [...(!/^https:\/\//.test(input.destinationUrl) ? ["Destination must use HTTPS."] : []), ...(!title ? ["A truthful title is required."] : [])];
  return { title, description: `${input.summary.trim()}\n\nLearn more: ${destinationUrl}`.slice(0, 5000), tags: natural, hashtags, spokenTerms: natural.slice(0, 6), destinationUrl, campaign: { source: "youtube", medium: "organic_video", id: input.campaignId }, warnings };
}
