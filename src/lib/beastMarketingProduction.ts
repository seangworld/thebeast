import type { VideoSeriesSettings } from "./beastMarketingVideo";

export const VIDEO_PRODUCTION_ENGINE_VERSION = "0.6.0";

export const videoProductionProviderSlots = ["narration", "visuals", "licensed_media", "composition"] as const;
export type VideoProductionProviderSlot = (typeof videoProductionProviderSlots)[number];
export type ProviderBinding = { slot: VideoProductionProviderSlot; required: boolean; providerId: string | null; modelOrService: string | null; authorized: boolean; paid: boolean; termsObservedAt: string | null };
export type ProductionAsset = { id: string; role: "narration" | "visual" | "product_capture" | "caption" | "music" | "final_video"; uri: string | null; mimeType: string | null; sourceType: "generated" | "first_party" | "licensed"; providerId: string | null; license: string | null; contentHash: string | null; createdAt: string | null; provenanceComplete: boolean };
export type CaptionCue = { startMs: number; endMs: number; text: string };
export type ProductionScene = { id: string; startMs: number; endMs: number; narration: string; visualBrief: string; transition: "cut" | "crossfade"; captions: CaptionCue[] };
export type ProductionManifest = {
  schemaVersion: "bmkt-production-1"; jobId: string; revision: number; aspectRatio: VideoSeriesSettings["aspectRatio"]; width: number; height: number;
  runtimeMs: number; visualStyle: string; captionStyle: string; presenterProfileId: string | null; presenterMode: "faceless" | "future_identity";
  scenes: ProductionScene[]; assets: ProductionAsset[]; providerBindings: ProviderBinding[]; retryPolicy: { maximumAttempts: number; delaysSeconds: number[] };
  planState: "planned_provider_blocked"; blockers: string[]; checksum: string;
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

export function buildProductionManifest(input: { jobId: string; revision: number; script: { hook: string; narration: string[]; cta: string; estimatedSeconds: number }; settings: VideoSeriesSettings }): ProductionManifest {
  const segments = [input.script.hook, ...input.script.narration, input.script.cta].map((item) => item.trim()).filter(Boolean);
  const totalWords = Math.max(1, segments.reduce((sum, item) => sum + words(item), 0));
  const runtimeMs = Math.max(1, input.script.estimatedSeconds) * 1000;
  let cursor = 0;
  const scenes = segments.map((narration, index) => {
    const isLast = index === segments.length - 1;
    const duration = isLast ? runtimeMs - cursor : Math.max(1000, Math.round(runtimeMs * words(narration) / totalWords));
    const startMs = cursor; const endMs = Math.min(runtimeMs, cursor + duration); cursor = endMs;
    return { id: `scene-${String(index + 1).padStart(2, "0")}`, startMs, endMs, narration, visualBrief: index === 0 ? `Opening visual for ${input.settings.visualStyle}` : isLast ? "Branded CTA and destination treatment" : `Original or licensed supporting visual ${index}`, transition: index === 0 ? "cut" as const : "crossfade" as const, captions: [{ startMs, endMs, text: narration }] };
  });
  if (scenes.length) { scenes[scenes.length - 1].endMs = runtimeMs; scenes[scenes.length - 1].captions[0].endMs = runtimeMs; }
  const [width, height] = dimensions[input.settings.aspectRatio];
  const providerBindings = videoProductionProviderSlots.map((slot) => ({ slot, required: slot !== "licensed_media", providerId: null, modelOrService: null, authorized: false, paid: false, termsObservedAt: null }));
  const base = { schemaVersion: "bmkt-production-1" as const, jobId: input.jobId, revision: input.revision, aspectRatio: input.settings.aspectRatio, width, height, runtimeMs, visualStyle: input.settings.visualStyle, captionStyle: input.settings.captionStyle, presenterProfileId: input.settings.presenterProfileId, presenterMode: "faceless" as const, scenes, assets: [] as ProductionAsset[], providerBindings, retryPolicy: { maximumAttempts: 3, delaysSeconds: [30, 120, 600] }, planState: "planned_provider_blocked" as const, blockers: ["No authorized narration provider is bound.", "No authorized visual provider is bound.", "No authorized composition renderer is bound."] };
  return { ...base, checksum: fingerprint(JSON.stringify(base)) };
}

export function validateProductionManifest(manifest: ProductionManifest, settings: VideoSeriesSettings) {
  const errors: string[] = [];
  if (!manifest.scenes.length) errors.push("At least one production scene is required.");
  if (manifest.runtimeMs < settings.minimumRuntimeSeconds * 1000 || manifest.runtimeMs > settings.maximumRuntimeSeconds * 1000) errors.push("Planned runtime is outside the configured range.");
  if (manifest.scenes.some((scene, index) => scene.startMs !== (index ? manifest.scenes[index - 1].endMs : 0) || scene.endMs <= scene.startMs)) errors.push("Scene timing must be contiguous and positive.");
  if (manifest.scenes.at(-1)?.endMs !== manifest.runtimeMs) errors.push("The scene timeline must end at the planned runtime.");
  if (manifest.scenes.some((scene) => !scene.captions.length || scene.captions.some((cue) => cue.startMs < scene.startMs || cue.endMs > scene.endMs || !cue.text.trim()))) errors.push("Every scene requires bounded non-empty captions.");
  const missingProviders = manifest.providerBindings.filter((binding) => binding.required && (!binding.authorized || !binding.providerId)).map((binding) => binding.slot);
  return { planValid: errors.length === 0, renderReady: errors.length === 0 && missingProviders.length === 0, errors, missingProviders };
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
