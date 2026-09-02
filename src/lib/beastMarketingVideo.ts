export const VIDEO_ENGINE_VERSION = "0.6.0";
export const VIDEO_TOPIC_PHRASE_LIMIT = 30;
export const VIDEO_TOPIC_PHRASE_MAX_LENGTH = 80;

export function normalizeVideoTopicPhrases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const phrase = item.replace(/\s+/g, " ").trim();
    const identity = phrase.toLowerCase();
    if (!phrase || phrase.length > VIDEO_TOPIC_PHRASE_MAX_LENGTH || seen.has(identity)) continue;
    seen.add(identity);
    phrases.push(phrase);
    if (phrases.length === VIDEO_TOPIC_PHRASE_LIMIT) break;
  }
  return phrases;
}

export function validateVideoTopicPhrases(value: unknown) {
  if (value == null) return { valid: true as const, phrases: [] as string[], error: null };
  if (!Array.isArray(value)) return { valid: false as const, phrases: [] as string[], error: "Topics must be stored as an array of phrases." };
  if (value.length > VIDEO_TOPIC_PHRASE_LIMIT) return { valid: false as const, phrases: [] as string[], error: `A series can contain at most ${VIDEO_TOPIC_PHRASE_LIMIT} topic phrases in each list.` };
  if (value.some((item) => typeof item !== "string")) return { valid: false as const, phrases: [] as string[], error: "Every topic must be a text phrase." };
  const tooLong = value.find((item) => item.replace(/\s+/g, " ").trim().length > VIDEO_TOPIC_PHRASE_MAX_LENGTH);
  if (tooLong) return { valid: false as const, phrases: [] as string[], error: `Each topic phrase must be ${VIDEO_TOPIC_PHRASE_MAX_LENGTH} characters or fewer.` };
  return { valid: true as const, phrases: normalizeVideoTopicPhrases(value), error: null };
}

export const videoJobStates = ["idea", "selected", "scripted", "generating", "ready", "scheduled", "published", "measuring", "completed", "scale", "modify", "stop", "failed", "skipped"] as const;
export type VideoJobState = (typeof videoJobStates)[number];

export const allowedVideoTransitions: Record<VideoJobState, readonly VideoJobState[]> = {
  idea: ["selected", "skipped"], selected: ["scripted", "skipped"], scripted: ["generating", "modify", "skipped"],
  generating: ["ready", "failed"], ready: ["scheduled", "modify", "skipped"], scheduled: ["published", "ready", "skipped"],
  published: ["measuring"], measuring: ["completed", "scale", "modify", "stop"], completed: ["scale", "modify", "stop"],
  scale: ["completed"], modify: ["selected", "scripted"], stop: [], failed: ["generating", "modify", "stop"], skipped: ["idea"],
};

export type VideoSeriesSettings = {
  publishingEnabled: boolean; approvalMode: "owner_approval" | "automatic"; manualApprovalFirstN: number; daysOfWeek: number[]; preferredWindows: string[];
  minimumSpacingMinutes: number; maximumPerDay: number; maximumPerWeek: number;
  minimumRuntimeSeconds: number; targetRuntimeSeconds: number; maximumRuntimeSeconds: number; aspectRatio: "9:16" | "16:9" | "1:1";
  voiceProfileId: string | null; visualStyle: string; captionStyle: string; presenterProfileId: string | null; qualityThreshold: number;
  allowedTopics: string[]; excludedTopics: string[]; evergreenPercent: number; beastPromotionPercent: number; trendSensitivity: number; minimumOpportunityConfidence: number;
  optimizeTitle: boolean; optimizeDescription: boolean; researchKeywords: boolean; generateTags: boolean; generateHashtags: boolean;
  testHooks: boolean; testCtas: boolean; selectDestination: boolean; campaignAttribution: boolean; optimizeTiming: boolean;
};

export const defaultVideoSeriesSettings: VideoSeriesSettings = {
  publishingEnabled: false, approvalMode: "owner_approval", manualApprovalFirstN: 3, daysOfWeek: [1, 3, 5], preferredWindows: ["18:00-21:00"],
  minimumSpacingMinutes: 720, maximumPerDay: 1, maximumPerWeek: 3, minimumRuntimeSeconds: 45, targetRuntimeSeconds: 60,
  maximumRuntimeSeconds: 90, aspectRatio: "9:16", voiceProfileId: null, visualStyle: "faceless_editorial", captionStyle: "high_contrast",
  presenterProfileId: null, qualityThreshold: 85, allowedTopics: [], excludedTopics: [], evergreenPercent: 60, beastPromotionPercent: 35,
  trendSensitivity: 50, minimumOpportunityConfidence: 65, optimizeTitle: true, optimizeDescription: true, researchKeywords: true,
  generateTags: true, generateHashtags: true, testHooks: true, testCtas: true, selectDestination: true, campaignAttribution: true, optimizeTiming: true,
};

export type VideoQualityInput = { factualClaimsVerified: boolean; productTruthVerified: boolean; misleadingClaimsAbsent: boolean; safeContent: boolean; provenanceComplete: boolean; destinationValid: boolean; duplicateRisk: number; mediaIntegrity: boolean; metadataQuality: number; attributionValid: boolean; runtimeSeconds: number; settings: VideoSeriesSettings };
export function evaluateVideoReadiness(input: VideoQualityInput) {
  const blockers: string[] = [];
  if (!input.factualClaimsVerified) blockers.push("Factual claims are not verified.");
  if (!input.productTruthVerified) blockers.push("Beast Product Truth is not verified.");
  if (!input.misleadingClaimsAbsent || !input.safeContent) blockers.push("Brand or safety review failed.");
  if (!input.provenanceComplete) blockers.push("Asset provenance is incomplete.");
  if (!input.destinationValid || !input.attributionValid) blockers.push("Destination or campaign attribution is invalid.");
  if (input.duplicateRisk >= 0.8) blockers.push("Content is too repetitive.");
  if (!input.mediaIntegrity) blockers.push("Video, audio, or captions failed integrity checks.");
  if (input.runtimeSeconds < input.settings.minimumRuntimeSeconds || input.runtimeSeconds > input.settings.maximumRuntimeSeconds) blockers.push("Runtime is outside the configured range.");
  if (input.metadataQuality < input.settings.qualityThreshold) blockers.push("Metadata quality is below the configured threshold.");
  return { ready: blockers.length === 0, blockers };
}

export const externalVideoAuthorities = { providersConfigured: false, youtubeAuthorized: false, externalPublishingEnabled: false, automaticPublishingEnabled: false } as const;
