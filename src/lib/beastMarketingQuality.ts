import type { ProductionAsset, ProductionManifest, ProductionScene, VisualBeat, VisualMotion, VisualPlan } from "./beastMarketingProduction";
import { validateProductionManifest } from "./beastMarketingProduction";
import type { VideoSeriesSettings } from "./beastMarketingVideo";

export const BMKT_VISUAL_PLAN_VERSION = "bmkt-visual-plan-1" as const;
export const BMKT_MAX_VISUAL_BEAT_MS = 4_500;
export const BMKT_MIN_VISUAL_BEAT_MS = 1_200;
export const BMKT_MAX_STATIC_INTERVAL_MS = 6_000;
export const BMKT_MIN_UNIQUE_VISUAL_RATIO = 0.5;
export const BMKT_MIN_CTA_DURATION_MS = 4_000;
export const BMKT_MAX_HOOK_BEAT_MS = 3_000;
export const BMKT_MAX_CAPTION_WORDS = 8;
export const BMKT_MIN_NARRATION_WPM = 110;
export const BMKT_MAX_NARRATION_WPM = 180;
export const BMKT_MIN_VOICE_SPEED = 1.05;
export const BMKT_MAX_VOICE_SPEED = 1.2;
export const BMKT_MIN_VOICE_PAUSE_MS = 80;
export const BMKT_MAX_VOICE_PAUSE_MS = 350;

const stopWords = new Set(["a", "about", "and", "are", "as", "at", "be", "before", "by", "for", "from", "how", "in", "into", "is", "it", "of", "on", "or", "the", "to", "use", "what", "with", "your"]);
const motionOrder: VisualMotion[] = ["push_in", "pan_left", "pull_out", "pan_right", "pan_up", "pan_down"];

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean);
const tokens = (value: string) => words(value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ")).filter((word) => word.length > 2 && !stopWords.has(word));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function sceneAssetCandidates(scene: ProductionScene, assets: readonly ProductionAsset[]) {
  const terms = new Set(tokens(`${scene.narration} ${scene.visualBrief}`));
  return assets
    .filter((asset) => ["visual", "product_capture"].includes(asset.role) && asset.uri)
    .map((asset, index) => {
      const haystack = new Set(tokens(`${asset.id} ${(asset.topics || []).join(" ")} ${asset.uri || ""}`));
      const score = Array.from(terms).reduce((total, term) => total + (haystack.has(term) ? 3 : 0), 0);
      return { asset, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ asset }) => asset);
}

function sceneVisualCandidates(scene: ProductionScene, assets: readonly ProductionAsset[]) {
  if (scene.visualAssetId) {
    const explicit = assets.find((asset) => asset.id === scene.visualAssetId);
    return explicit ? [explicit] : [];
  }
  return sceneAssetCandidates(scene, assets);
}

/** Resolve an unbound scene to an explicitly supplied, provenance-backed candidate. */
export function resolveVisualAssetId(scene: ProductionScene, assets: readonly ProductionAsset[]) {
  if (scene.visualAssetId) return scene.visualAssetId;
  return sceneAssetCandidates(scene, assets)[0]?.id;
}

function beatMotion(sceneIndex: number, beatIndex: number, isFirst: boolean, isLast: boolean): VisualMotion {
  if (isFirst) return "reveal";
  if (isLast) return "pull_out";
  return motionOrder[(sceneIndex + beatIndex - 1) % motionOrder.length];
}

/** Split long narration scenes into deterministic editorial beats without contacting a provider. */
export function buildVisualBeatPlan(manifest: ProductionManifest, options: { maxBeatDurationMs?: number } = {}): VisualPlan {
  const maxBeatDurationMs = clamp(Math.trunc(options.maxBeatDurationMs ?? BMKT_MAX_VISUAL_BEAT_MS), BMKT_MIN_VISUAL_BEAT_MS, 8_000);
  const beats: VisualBeat[] = [];
  manifest.scenes.forEach((scene, sceneIndex) => {
    const duration = Math.max(1, scene.endMs - scene.startMs);
    const count = Math.max(1, Math.ceil(duration / maxBeatDurationMs));
    const candidates = sceneVisualCandidates(scene, manifest.assets);
    for (let index = 0; index < count; index += 1) {
      const startMs = scene.startMs + Math.round(duration * index / count);
      const endMs = index === count - 1 ? scene.endMs : scene.startMs + Math.round(duration * (index + 1) / count);
      beats.push({
        id: `${scene.id}-beat-${String(index + 1).padStart(2, "0")}`,
        sceneId: scene.id,
        startMs,
        endMs,
        visualAssetId: candidates.length ? candidates[(sceneIndex + index) % candidates.length].id : resolveVisualAssetId(scene, manifest.assets),
        motion: beatMotion(sceneIndex, index, sceneIndex === 0 && index === 0, sceneIndex === manifest.scenes.length - 1),
        transition: sceneIndex === 0 && index === 0 ? "cut" : "crossfade",
        fit: manifest.aspectRatio === "9:16" ? "cover" : "contain",
        captionSafe: true,
      });
    }
  });
  return { version: BMKT_VISUAL_PLAN_VERSION, maxBeatDurationMs, beats };
}

/**
 * Build the presentation-only treatment used for product screenshots. The
 * editorial timing and asset assignment are retained exactly; only framing,
 * motion, and transitions are changed. `contain` leaves the complete source
 * image visible inside the output canvas, with the canvas background filling
 * the remaining space.
 */
export function buildStaticContainVisualPlan(manifest: ProductionManifest): VisualPlan {
  const source = manifest.visualPlan && manifest.visualPlan.version === BMKT_VISUAL_PLAN_VERSION
    ? manifest.visualPlan
    : buildVisualBeatPlan(manifest);
  return {
    version: BMKT_VISUAL_PLAN_VERSION,
    maxBeatDurationMs: source.maxBeatDurationMs,
    beats: source.beats.map((beat, index) => ({
      ...beat,
      motion: "static" as const,
      fit: "contain" as const,
      transition: index === 0 ? "cut" as const : "crossfade" as const,
      captionSafe: true,
    })),
  };
}

/** Return the integer display bounds for a complete source image in a canvas. */
export function containDimensions(sourceWidth: number, sourceHeight: number, canvasWidth = 1080, canvasHeight = 1920) {
  if (![sourceWidth, sourceHeight, canvasWidth, canvasHeight].every((value) => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)), scale };
}

function validSha(value: string | null) {
  return /^sha256:[a-f0-9]{64}$/i.test(value || "");
}

/** Validate media provenance and restrict first-party assets to public product paths. */
export function validateVisualAsset(asset: ProductionAsset) {
  const errors: string[] = [];
  if (!["visual", "product_capture"].includes(asset.role)) errors.push("Visual media must use a visual or product-capture role.");
  if (!asset.uri || !asset.provenanceComplete || !asset.createdAt || !asset.license || !validSha(asset.contentHash)) errors.push("Visual media requires complete provenance, a license reference, and a SHA-256 content hash.");
  if (asset.sourceType === "licensed" && !asset.license) errors.push("Licensed visual media requires a retained license reference.");
  if (asset.sourceType !== "first_party" && (!asset.providerId || asset.authorized !== true)) errors.push("Generated or licensed visual media requires an authorized provider binding.");
  if (asset.width !== undefined && (!Number.isInteger(asset.width) || asset.width < 1)) errors.push("Visual width must be a positive integer.");
  if (asset.height !== undefined && (!Number.isInteger(asset.height) || asset.height < 1)) errors.push("Visual height must be a positive integer.");
  if (asset.focalPoint && (asset.focalPoint.x < 0 || asset.focalPoint.x > 1 || asset.focalPoint.y < 0 || asset.focalPoint.y > 1)) errors.push("Visual focal points must be normalized between zero and one.");
  if (asset.uri) {
    try {
      const url = new URL(asset.uri);
      const firstPartyPath = /^\/marketing\/visuals\/[a-z0-9-]+\.(png|jpg|webp)$/i.test(url.pathname);
      const safeUrl = url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash;
      if (!safeUrl) errors.push("Visual media URLs must be HTTPS without credentials, ports, queries, or fragments.");
      if (asset.sourceType === "first_party" && (!['thebeast.seangworld.com', 'news.seangworld.com'].includes(url.hostname) || !firstPartyPath)) errors.push("First-party visual media must use the public marketing visuals path.");
    } catch {
      errors.push("Visual media URI must be a valid URL.");
    }
  }
  return { valid: errors.length === 0, errors };
}

function assetForBeat(beat: VisualBeat, assets: readonly ProductionAsset[]) {
  return beat.visualAssetId ? assets.find((asset) => asset.id === beat.visualAssetId) || null : null;
}

export type ProductionQualityReport = {
  ready: boolean;
  score: number;
  blockers: string[];
  warnings: string[];
  metrics: {
    runtimeSeconds: number;
    sceneCount: number;
    visualBeatCount: number;
    visualBeatCoverage: number;
    distinctVisualCount: number;
    uniqueVisualRatio: number;
    adjacentVisualRepeats: number;
    maxStaticIntervalMs: number;
    maxBeatDurationMs: number;
    maxCaptionWords: number;
    hookBeatDurationMs: number;
    ctaDurationMs: number;
    plannedNarrationWpm: number;
    voiceStyle: string;
    voiceSpeed: number;
    voiceNewscaster: boolean;
    voicePauseMs: number;
    voiceEmphasisCount: number;
  };
};

/** Evaluate measurable pre-render quality defects without spending provider credits. */
export function evaluateProductionQuality(manifest: ProductionManifest, settings: VideoSeriesSettings, options: { plan?: VisualPlan } = {}): ProductionQualityReport {
  const suppliedPlan = options.plan || manifest.visualPlan;
  const suppliedPlanInvalid = Boolean(suppliedPlan && (suppliedPlan.version !== BMKT_VISUAL_PLAN_VERSION || !Number.isFinite(suppliedPlan.maxBeatDurationMs) || !Array.isArray(suppliedPlan.beats)));
  const plan = suppliedPlan && !suppliedPlanInvalid
    ? suppliedPlan
    : buildVisualBeatPlan(manifest);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (suppliedPlanInvalid) blockers.push("The visual plan is malformed or uses an unsupported version.");
  const validation = validateProductionManifest(manifest, settings);
  if (!validation.planValid) blockers.push(...validation.errors);
  const visualBeats = plan.beats;
  const withVisuals = visualBeats.filter((beat) => beat.visualAssetId);
  const ids = withVisuals.map((beat) => beat.visualAssetId as string);
  const distinctVisuals = new Set(ids);
  let adjacentVisualRepeats = 0;
  let maxStaticIntervalMs = 0;
  let runDuration = 0;
  let previousId: string | null = null;
  for (const beat of visualBeats) {
    const duration = Math.max(0, beat.endMs - beat.startMs);
    if (beat.visualAssetId && beat.visualAssetId === previousId) {
      adjacentVisualRepeats += 1;
      runDuration += duration;
    } else {
      runDuration = duration;
    }
    maxStaticIntervalMs = Math.max(maxStaticIntervalMs, runDuration);
    previousId = beat.visualAssetId || null;
  }
  const maxCaptionWords = Math.max(0, ...manifest.scenes.flatMap((scene) => scene.captions.map((cue) => words(cue.text).length)));
  const hookBeatDurationMs = visualBeats[0] ? visualBeats[0].endMs - visualBeats[0].startMs : 0;
  const ctaScene = manifest.scenes.at(-1);
  const ctaDurationMs = ctaScene ? ctaScene.endMs - ctaScene.startMs : 0;
  const visualBeatCoverage = manifest.runtimeMs > 0
    ? withVisuals.reduce((total, beat) => total + Math.max(0, beat.endMs - beat.startMs), 0) / manifest.runtimeMs
    : 0;
  const uniqueVisualRatio = visualBeats.length ? distinctVisuals.size / visualBeats.length : 0;
  const plannedNarrationWpm = manifest.runtimeMs > 0
    ? manifest.scenes.reduce((total, scene) => total + words(scene.narration).length, 0) / (manifest.runtimeMs / 60_000)
    : 0;
  const voice = manifest.audioMix?.voiceDelivery;
  const voiceStyle = voice?.style || "";
  const voiceSpeed = voice?.speed ?? manifest.audioMix?.narrationSpeed ?? 0;
  const voicePauseMs = voice?.pauseMs ?? 0;
  const narrationText = manifest.scenes.map((scene) => scene.narration).join(" ").toLowerCase();
  const voiceEmphasisCount = (voice?.emphasisTerms || []).filter((term) => typeof term === "string" && term.trim() && narrationText.includes(term.toLowerCase().trim())).length;

  if (!visualBeats.length || withVisuals.length !== visualBeats.length) blockers.push("Every planned visual beat requires an explicit visual asset.");
  if (visualBeats.some((beat) => beat.startMs < 0 || beat.endMs > manifest.runtimeMs || beat.endMs <= beat.startMs || beat.endMs - beat.startMs < BMKT_MIN_VISUAL_BEAT_MS || beat.endMs - beat.startMs > plan.maxBeatDurationMs)) blockers.push("Visual beats must be positive, meaningful, bounded by the runtime, and stay below the maximum beat duration.");
  const orderedBeats = [...visualBeats].sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  if (orderedBeats.some((beat, index) => index > 0 && (beat.startMs !== orderedBeats[index - 1].endMs || beat.sceneId !== manifest.scenes.find((scene) => beat.startMs >= scene.startMs && beat.startMs < scene.endMs)?.id))) blockers.push("Visual beats must be contiguous and mapped to their scene timeline.");
  if (visualBeatCoverage < 0.98) blockers.push("Visual media must cover the full planned runtime.");
  if (uniqueVisualRatio < BMKT_MIN_UNIQUE_VISUAL_RATIO) blockers.push("Visual variety is below the publication-quality threshold.");
  if (adjacentVisualRepeats > 0) blockers.push("Adjacent visual beats reuse the same asset.");
  if (maxStaticIntervalMs > BMKT_MAX_STATIC_INTERVAL_MS) blockers.push("A static visual interval is too long.");
  if (!visualBeats[0] || (!(["reveal"].includes(visualBeats[0].motion) || (visualBeats[0].motion === "static" && visualBeats[0].transition === "cut")) || hookBeatDurationMs > BMKT_MAX_HOOK_BEAT_MS)) blockers.push("The opening beat lacks a concise hook treatment.");
  if (!ctaScene || ctaDurationMs < BMKT_MIN_CTA_DURATION_MS || !/cta|call to action|end.?card|destination|visit|learn more|follow|subscribe/i.test(`${ctaScene.visualBrief} ${ctaScene.narration}`)) blockers.push("The ending requires a deliberate CTA/end-card treatment.");
  if (maxCaptionWords > BMKT_MAX_CAPTION_WORDS) blockers.push("Caption phrases are too dense for mobile readability.");
  if (plannedNarrationWpm < BMKT_MIN_NARRATION_WPM || plannedNarrationWpm > BMKT_MAX_NARRATION_WPM) blockers.push("Planned narration pacing is outside the publication-quality range.");
  if (visualBeats.some((beat) => !beat.captionSafe)) blockers.push("A visual beat does not reserve a caption-safe area.");
  if (!voice || !["energetic_conversational", "modern_news"].includes(voiceStyle)) blockers.push("A conversational or modern-news voice delivery plan is required.");
  if (voiceSpeed < BMKT_MIN_VOICE_SPEED || voiceSpeed > BMKT_MAX_VOICE_SPEED) blockers.push("Voice delivery speed is outside the energetic short-form range.");
  if (voiceStyle === "energetic_conversational" && voice?.newscaster === true) blockers.push("Energetic conversational delivery cannot use flat newscaster mode.");
  if (voicePauseMs < BMKT_MIN_VOICE_PAUSE_MS || voicePauseMs > BMKT_MAX_VOICE_PAUSE_MS) blockers.push("Controlled voice pauses must be within the supported delivery range.");
  if (!voiceEmphasisCount) blockers.push("Voice delivery requires at least one narration-matched emphasis term.");

  const usedAssets = new Map<string, ProductionAsset>();
  for (const beat of visualBeats) {
    const asset = assetForBeat(beat, manifest.assets);
    if (asset) usedAssets.set(asset.id, asset);
  }
  usedAssets.forEach((asset) => {
    const result = validateVisualAsset(asset);
    if (!result.valid) blockers.push(...result.errors.map((error) => `${asset.id}: ${error}`));
  });
  if (manifest.audioMix?.musicAssetId) {
    const music = manifest.assets.find((asset) => asset.id === manifest.audioMix?.musicAssetId);
    if (!music || music.role !== "music" || music.mimeType?.startsWith("audio/") !== true || !music.provenanceComplete || !music.createdAt || !validSha(music.contentHash) || (music.sourceType !== "first_party" && (music.authorized !== true || !music.providerId))) blockers.push("The configured music asset is unavailable or invalid.");
  }
  for (const cue of manifest.audioMix?.sfx || []) {
    const sfx = manifest.assets.find((asset) => asset.id === cue.assetId);
    if (!sfx || !sfx.mimeType?.startsWith("audio/") || !sfx.provenanceComplete || !sfx.createdAt || !validSha(sfx.contentHash) || (sfx.sourceType !== "first_party" && (sfx.authorized !== true || !sfx.providerId)) || cue.endMs <= cue.startMs || cue.startMs < 0 || cue.endMs > manifest.runtimeMs || cue.volume < 0 || cue.volume > 1) blockers.push(`The configured SFX cue ${cue.assetId} is invalid.`);
  }
  if (visualBeatCoverage < 1) warnings.push("The provider-neutral plan is waiting for authorized visual media.");
  if (manifest.scenes.some((scene) => scene.captions.length === 1 && words(scene.captions[0].text).length > 6)) warnings.push("Some captions use whole-scene timing instead of phrase-level cues.");

  const preliminaryScore = clamp(Math.round(100 - blockers.length * 12 - warnings.length * 3), 0, 100);
  if (preliminaryScore < settings.qualityThreshold) blockers.push(`The production quality score is below the configured ${settings.qualityThreshold} threshold.`);
  const score = clamp(Math.round(100 - blockers.length * 12 - warnings.length * 3), 0, 100);
  return {
    ready: blockers.length === 0,
    score,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    metrics: {
      runtimeSeconds: manifest.runtimeMs / 1000,
      sceneCount: manifest.scenes.length,
      visualBeatCount: visualBeats.length,
      visualBeatCoverage,
      distinctVisualCount: distinctVisuals.size,
      uniqueVisualRatio,
      adjacentVisualRepeats,
      maxStaticIntervalMs,
      maxBeatDurationMs: plan.maxBeatDurationMs,
      maxCaptionWords,
      hookBeatDurationMs,
      ctaDurationMs,
      plannedNarrationWpm: Math.round(plannedNarrationWpm * 10) / 10,
      voiceStyle,
      voiceSpeed,
      voiceNewscaster: voice?.newscaster === true,
      voicePauseMs,
      voiceEmphasisCount,
    },
  };
}
