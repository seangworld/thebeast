import type { VideoSeriesSettings } from "./beastMarketingVideo";
import { stripInternalProductionMarkers } from "./beastMarketingNarration";

export const VIDEO_PRODUCTION_ENGINE_VERSION = "0.6.0";

export const videoProductionProviderSlots = ["narration", "visuals", "licensed_media", "composition"] as const;
export type VideoProductionProviderSlot = (typeof videoProductionProviderSlots)[number];
export type ProviderBinding = { slot: VideoProductionProviderSlot; required: boolean; providerId: string | null; modelOrService: string | null; authorized: boolean; paid: boolean; termsObservedAt: string | null };
export type ProductionAsset = { id: string; role: "narration" | "visual" | "product_capture" | "caption" | "music" | "final_video"; uri: string | null; mimeType: string | null; sourceType: "generated" | "first_party" | "licensed"; providerId: string | null; license: string | null; contentHash: string | null; createdAt: string | null; provenanceComplete: boolean; authorized?: boolean; topics?: string[]; width?: number; height?: number; focalPoint?: { x: number; y: number } };
export type CaptionCue = { startMs: number; endMs: number; text: string };
export type ProductionScene = { id: string; startMs: number; endMs: number; narration: string; visualBrief: string; visualAssetId?: string; transition: "cut" | "crossfade"; captions: CaptionCue[] };
export type VisualMotion = "static" | "reveal" | "push_in" | "pull_out" | "pan_left" | "pan_right" | "pan_up" | "pan_down";
export type VisualBeat = { id: string; sceneId: string; startMs: number; endMs: number; visualAssetId?: string; motion: VisualMotion; transition: "cut" | "crossfade"; fit: "cover" | "contain"; captionSafe: boolean };
export type VisualPlan = { version: "bmkt-visual-plan-1"; maxBeatDurationMs: number; beats: VisualBeat[] };
export type AudioSfxCue = { assetId: string; startMs: number; endMs: number; volume: number };
export type VoiceDeliveryPlan = { voice?: string; language?: string; style?: "energetic_conversational" | "modern_news" | "calm_explainer"; speed?: number; newscaster?: boolean; pauseMs?: number; emphasisTerms?: string[] };
export type AudioMixPlan = { narrationSpeed?: number; voiceDelivery?: VoiceDeliveryPlan; musicAssetId?: string; musicVolume?: number; sfx?: AudioSfxCue[] };
export type NarrationTimingCue = { sceneId: string; text: string; startMs: number; endMs: number; wordStart?: number; wordEnd?: number };
export type NarrationTimingEvidence = { providerId: string; assetId: string; assetUri?: string | null; durationMs: number; timingType: "word" | "phrase"; cues: NarrationTimingCue[]; verifiedAt: string; syncToleranceMs: number; maxObservedDriftMs: number };
export type ProductionManifest = {
  schemaVersion: "bmkt-production-1"; jobId: string; revision: number; aspectRatio: VideoSeriesSettings["aspectRatio"]; width: number; height: number;
  runtimeMs: number; visualStyle: string; captionStyle: string; presenterProfileId: string | null; presenterMode: "faceless" | "future_identity";
  scenes: ProductionScene[]; assets: ProductionAsset[]; providerBindings: ProviderBinding[]; retryPolicy: { maximumAttempts: number; delaysSeconds: number[] };
  planState: "planned_provider_blocked"; blockers: string[]; checksum: string;
  requireVisuals?: boolean;
  brandLabel?: string;
  visualPlan?: VisualPlan;
  audioMix?: AudioMixPlan;
  monetizationOriented?: boolean;
  syncVerificationRequired?: boolean;
  syncMethod?: "narration_derived_calibrated" | "provider_word_timestamps";
  timingEvidenceRequired?: boolean;
  narrationTimingEvidence?: NarrationTimingEvidence;
  visualTransitionGapMs?: number;
  backgroundColor?: string;
  /** Presentation profile controlling the editorial cadence budget. */
  visualCadenceProfile?: "standard" | "slow_static";
};
export type ProductionOperation = "narration" | "visuals" | "composition";
export type ProductionAttempt = { operation: ProductionOperation; attemptNumber: number; idempotencyKey: string; status: "planned" | "submitted" | "succeeded" | "failed" | "cancelled"; retryable: boolean };
export interface VideoProductionProviderAdapter {
  readonly providerId: string;
  readonly operations: readonly ProductionOperation[];
  submit(input: { idempotencyKey: string; manifest: ProductionManifest; operation: ProductionOperation }): Promise<{ providerRequestId: string; status: "submitted" | "succeeded" }>;
  inspect(providerRequestId: string): Promise<{ status: "submitted" | "succeeded" | "failed"; retryable: boolean; assets: ProductionAsset[] }>;
}

const dimensions: Record<VideoSeriesSettings["aspectRatio"], [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080] };
const fingerprint = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
};
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const emphasisStopWords = new Set(["about", "after", "before", "could", "should", "show", "that", "their", "there", "these", "those", "what", "when", "where", "which", "while", "with", "would", "you"]);
const emphasisTerms = (value: string) => value.replace(/[^A-Za-z0-9\s-]/g, " ").split(/\s+/).filter((item) => item.length >= 4 && !emphasisStopWords.has(item.toLowerCase())).slice(0, 2);
const captionCues = (text: string, startMs: number, endMs: number): CaptionCue[] => {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const cues: CaptionCue[] = [];
  for (let offset = 0; offset < tokens.length; offset += 6) {
    const end = Math.min(tokens.length, offset + 6);
    cues.push({
      startMs: startMs + Math.round((endMs - startMs) * offset / tokens.length),
      endMs: startMs + Math.round((endMs - startMs) * end / tokens.length),
      text: tokens.slice(offset, end).join(" "),
    });
  }
  return cues;
};

/** Re-sign a newly prepared plan after binding verified assets. Not an approval. */
export function fingerprintProductionManifest(manifest: ProductionManifest): ProductionManifest {
  const { checksum: _checksum, ...body } = manifest;
  return { ...body, checksum: fingerprint(JSON.stringify(body)) };
}

export function buildProductionManifest(input: { jobId: string; revision: number; script: { hook: string; narration: string[]; cta: string; estimatedSeconds: number }; settings: VideoSeriesSettings }): ProductionManifest {
  const segments = [input.script.hook, ...input.script.narration, input.script.cta].map(stripInternalProductionMarkers).filter(Boolean);
  const totalWords = Math.max(1, segments.reduce((sum, item) => sum + words(item), 0));
  const runtimeMs = Math.max(1, input.script.estimatedSeconds) * 1000;
  let cursor = 0;
  const scenes = segments.map((narration, index) => {
    const isLast = index === segments.length - 1;
    const duration = isLast ? runtimeMs - cursor : Math.max(1000, Math.round(runtimeMs * words(narration) / totalWords));
    const startMs = cursor; const endMs = Math.min(runtimeMs, cursor + duration); cursor = endMs;
    return { id: `scene-${String(index + 1).padStart(2, "0")}`, startMs, endMs, narration, visualBrief: index === 0 ? `Opening visual for ${input.settings.visualStyle}` : isLast ? "Branded CTA and destination treatment" : `Original or licensed supporting visual ${index}`, transition: index === 0 ? "cut" as const : "crossfade" as const, captions: captionCues(narration, startMs, endMs) };
  });
  if (scenes.length) {
    scenes[scenes.length - 1].endMs = runtimeMs;
    const finalCaptions = scenes[scenes.length - 1].captions;
    if (finalCaptions.length) finalCaptions[finalCaptions.length - 1].endMs = runtimeMs;
  }
  const [width, height] = dimensions[input.settings.aspectRatio];
  const providerBindings = videoProductionProviderSlots.map((slot) => ({ slot, required: slot !== "licensed_media", providerId: null, modelOrService: null, authorized: false, paid: false, termsObservedAt: null }));
  const base = { schemaVersion: "bmkt-production-1" as const, jobId: input.jobId, revision: input.revision, aspectRatio: input.settings.aspectRatio, width, height, runtimeMs, visualStyle: stripInternalProductionMarkers(input.settings.visualStyle), captionStyle: stripInternalProductionMarkers(input.settings.captionStyle), presenterProfileId: input.settings.presenterProfileId, presenterMode: "faceless" as const, scenes, assets: [] as ProductionAsset[], providerBindings, retryPolicy: { maximumAttempts: 3, delaysSeconds: [30, 120, 600] }, planState: "planned_provider_blocked" as const, blockers: ["No authorized narration provider is bound.", "No authorized visual provider is bound.", "No authorized composition renderer is bound."] };
  return { ...base, audioMix: { voiceDelivery: { voice: "Matthew", language: "en-US", style: "energetic_conversational", speed: 1.16, newscaster: false, pauseMs: 140, emphasisTerms: emphasisTerms(input.script.hook) } }, checksum: fingerprint(JSON.stringify({ ...base, audioMix: { voiceDelivery: { voice: "Matthew", language: "en-US", style: "energetic_conversational", speed: 1.16, newscaster: false, pauseMs: 140, emphasisTerms: emphasisTerms(input.script.hook) } } })) };
}

export function validateProductionManifest(manifest: ProductionManifest, settings: VideoSeriesSettings) {
  const errors: string[] = [];
  if (!manifest.scenes.length) errors.push("At least one production scene is required.");
  if (manifest.runtimeMs < settings.minimumRuntimeSeconds * 1000 || manifest.runtimeMs > settings.maximumRuntimeSeconds * 1000) errors.push("Planned runtime is outside the configured range.");
  if (manifest.scenes.some((scene, index) => scene.startMs !== (index ? manifest.scenes[index - 1].endMs : 0) || scene.endMs <= scene.startMs)) errors.push("Scene timing must be contiguous and positive.");
  if (manifest.scenes.at(-1)?.endMs !== manifest.runtimeMs) errors.push("The scene timeline must end at the planned runtime.");
  if (manifest.monetizationOriented === true && manifest.runtimeMs < 60_000) errors.push("Monetization-oriented candidates require a runtime of at least 60 seconds.");
  if (manifest.timingEvidenceRequired === true) {
    const timing = validateNarrationTimingEvidence(manifest, manifest.narrationTimingEvidence);
    if (!timing.valid) errors.push(...timing.errors);
  }
  if (manifest.scenes.some((scene) => !scene.captions.length || scene.captions.some((cue) => cue.startMs < scene.startMs || cue.endMs > scene.endMs || !cue.text.trim()))) errors.push("Every scene requires bounded non-empty captions.");
  const missingProviders = manifest.providerBindings.filter((binding) => binding.required && (!binding.authorized || !binding.providerId)).map((binding) => binding.slot);
  return { planValid: errors.length === 0, renderReady: errors.length === 0 && missingProviders.length === 0, errors, missingProviders };
}

const normalizedWords = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);

/** Validate provider-supplied narration timing without treating estimates as evidence. */
export function validateNarrationTimingEvidence(manifest: ProductionManifest, evidence: NarrationTimingEvidence | undefined) {
  const errors: string[] = [];
  if (!evidence || typeof evidence !== "object") return { valid: false, errors: ["Actual narration timing evidence is required before rendering."] };
  if (!evidence.providerId.trim() || !evidence.assetId.trim()) errors.push("Narration timing evidence requires provider and asset identity.");
  if (!Number.isInteger(evidence.durationMs) || evidence.durationMs <= 0) errors.push("Narration timing evidence requires a positive actual narration duration.");
  if (!Number.isFinite(evidence.syncToleranceMs) || evidence.syncToleranceMs < 0 || evidence.syncToleranceMs > 150) errors.push("Narration timing sync tolerance must be at most 150 ms.");
  if (!Number.isFinite(evidence.maxObservedDriftMs) || evidence.maxObservedDriftMs < 0 || evidence.maxObservedDriftMs > 150 || evidence.maxObservedDriftMs > evidence.syncToleranceMs) errors.push("Narration timing drift exceeds the 150 ms acceptance tolerance.");
  if (!(evidence.timingType === "word" || evidence.timingType === "phrase")) errors.push("Narration timing evidence must identify word or phrase timestamps.");
  if (!evidence.verifiedAt || !Number.isFinite(Date.parse(evidence.verifiedAt))) errors.push("Narration timing evidence requires a verification timestamp.");
  if (!Array.isArray(evidence.cues) || evidence.cues.length === 0) errors.push("Narration timing evidence requires timestamped cues.");
  const expectedScenes = new Map(manifest.scenes.map((scene) => [scene.id, normalizedWords(scene.narration).join(" ")]));
  const byScene = new Map<string, NarrationTimingCue[]>();
  for (const cue of Array.isArray(evidence.cues) ? evidence.cues : []) {
    if (!expectedScenes.has(cue.sceneId)) errors.push("Narration timing cue references an unknown scene.");
    if (!Number.isInteger(cue.startMs) || !Number.isInteger(cue.endMs) || cue.endMs <= cue.startMs) errors.push("Narration timing cues must have positive integer ranges.");
    if (cue.startMs < 0 || cue.endMs > manifest.runtimeMs) errors.push("Narration timing cues must remain within the video runtime.");
    if (!cue.text.trim() || cue.text.trim().split(/\s+/).length > 6) errors.push("Narration timing cue phrases must contain one to six words.");
    const list = byScene.get(cue.sceneId) || []; list.push(cue); byScene.set(cue.sceneId, list);
  }
  expectedScenes.forEach((expected, sceneId) => {
    const scene = manifest.scenes.find((candidate) => candidate.id === sceneId)!;
    const cues = byScene.get(sceneId) || [];
    if (!cues.length) { errors.push(`Narration timing evidence is missing cues for ${sceneId}.`); return; }
    let previousEnd = scene.startMs;
    cues.forEach((cue) => {
      if (cue.startMs < scene.startMs || cue.endMs > scene.endMs) errors.push(`Narration timing cue for ${sceneId} is outside its scene bounds.`);
      if (cue.startMs < previousEnd) errors.push(`Narration timing cues overlap in ${sceneId}.`);
      previousEnd = cue.endMs;
    });
    if (cues.map((cue) => normalizedWords(cue.text)).flat().join(" ") !== expected) errors.push(`Narration timing cues do not cover the exact narration for ${sceneId}.`);
  });
  if (Number.isInteger(evidence.durationMs) && evidence.durationMs < Math.max(...(evidence.cues || []).map((cue) => cue.endMs), 0)) errors.push("Narration timing cues exceed the actual narration duration.");
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

/** Bind verified provider timestamps to bottom captions; this never changes narration or visuals. */
export function bindNarrationTimingEvidence(manifest: ProductionManifest, evidence: NarrationTimingEvidence) {
  const validation = validateNarrationTimingEvidence(manifest, evidence);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const scenes = manifest.scenes.map((scene) => ({ ...scene, captions: evidence.cues.filter((cue) => cue.sceneId === scene.id).map(({ text, startMs, endMs }) => ({ text, startMs, endMs })) }));
  return fingerprintProductionManifest({ ...manifest, scenes, narrationTimingEvidence: evidence, syncVerificationRequired: false, syncMethod: "provider_word_timestamps" });
}

export function validateProducedAssets(assets: ProductionAsset[]) {
  const finalVideo = assets.find((asset) => asset.role === "final_video");
  const errors = [
    ...(!finalVideo?.uri || finalVideo.mimeType !== "video/mp4" ? ["A final MP4 asset is required."] : []),
    ...(assets.some((asset) => !asset.provenanceComplete || !asset.contentHash) ? ["Every produced asset requires complete provenance and a content hash."] : []),
    ...(assets.some((asset) => asset.sourceType === "licensed" && !asset.license) ? ["Licensed assets require a retained license reference."] : []),
  ];
  return { valid: errors.length === 0, errors };
}

export function buildProductionAttempt(input: { jobId: string; revision: number; operation: ProductionOperation; attemptNumber: number }): ProductionAttempt {
  const attemptNumber = Math.max(1, Math.min(20, Math.trunc(input.attemptNumber)));
  return { operation: input.operation, attemptNumber, idempotencyKey: `bmkt-production:${fingerprint(`${input.jobId}|${input.revision}|${input.operation}|${attemptNumber}`)}`, status: "planned", retryable: false };
}

export function nextProductionRetry(attempt: ProductionAttempt, delaysSeconds = [30, 120, 600]) {
  if (attempt.status !== "failed" || !attempt.retryable || attempt.attemptNumber >= delaysSeconds.length) return { allowed: false, delaySeconds: null, nextAttemptNumber: null };
  return { allowed: true, delaySeconds: delaysSeconds[attempt.attemptNumber - 1], nextAttemptNumber: attempt.attemptNumber + 1 };
}

export function validatePersistedAssetCandidate(input: { ownerId: string; storagePath: string; mimeType: string; contentHash: string; sizeBytes: number }) {
  const allowedMimeTypes = new Set(["video/mp4", "audio/mpeg", "audio/wav", "image/jpeg", "image/png", "image/webp", "text/vtt", "application/json"]);
  const errors = [
    ...(!input.storagePath.startsWith(`${input.ownerId}/`) ? ["The private storage path must begin with the owner ID."] : []),
    ...(!allowedMimeTypes.has(input.mimeType) ? ["The media type is not allowed."] : []),
    ...(!/^[a-z0-9]+:[a-z0-9_-]{8,}$/i.test(input.contentHash) ? ["A provider-qualified content hash is required."] : []),
    ...(!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0 || input.sizeBytes > 500_000_000 ? ["The asset size is outside the private media limit."] : []),
  ];
  return { valid: errors.length === 0, errors };
}
