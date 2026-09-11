import type { ProductionManifest } from "./beastMarketingProduction";
import { normalizeBeastDisplayNames, normalizeBeastNarrationForSpeech } from "./beastMarketingNarration";
import { buildVisualBeatPlan, validateVisualAsset } from "./beastMarketingQuality";

export const SHOTSTACK_ADAPTER_VERSION = "0.12.0";
export const SHOTSTACK_PROVIDER_ID = "shotstack";
export const SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER = 2;
export const SHOTSTACK_MAX_MANUAL_ATTEMPTS = 7;

export type ShotstackAttemptSummary = {
  attemptNumber: number;
  status: string;
  errorCategory: string | null;
  providerRequestId: string | null;
};

export type ShotstackEnvironment = "stage" | "v1";
export type ShotstackEdit = {
  timeline: {
    background: string;
    tracks: Array<{ clips: Array<Record<string, unknown>> }>;
  };
  output: {
    format: "mp4";
    aspectRatio?: ProductionManifest["aspectRatio"];
    fps?: number;
    size: { width: number; height: number };
    range?: { start: number; length: number };
  };
};

export type ShotstackAsset = {
  id: string;
  renderId: string;
  url: string;
  filename: string;
  filesize: number | null;
  status: "importing" | "ready" | "failed" | "deleted";
};

export type ShotstackInspection = {
  status: "submitted" | "succeeded" | "failed";
  retryable: boolean;
  providerStatus: string;
  asset: ShotstackAsset | null;
};

export class ShotstackProviderError extends Error {
  readonly category: "configuration" | "authentication" | "rate_limit" | "validation" | "provider" | "network";
  readonly retryable: boolean;
  readonly httpStatus: number | null;
  readonly providerCode: string | null;
  readonly providerMessage: string | null;
  readonly providerRequestId: string | null;
  readonly providerValidationPath: string | null;
  readonly sanitizedResponseBody: unknown;
  readonly occurredAt: string;

  constructor(category: ShotstackProviderError["category"], retryable: boolean, httpStatus: number | null = null, diagnostics: Partial<Pick<ShotstackProviderError, "providerCode" | "providerMessage" | "providerRequestId" | "providerValidationPath" | "sanitizedResponseBody" | "occurredAt">> = {}) {
    super("Shotstack could not complete the internal render operation.");
    this.name = "ShotstackProviderError";
    this.category = category;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
    this.providerCode = diagnostics.providerCode || null;
    this.providerMessage = diagnostics.providerMessage || null;
    this.providerRequestId = diagnostics.providerRequestId || null;
    this.providerValidationPath = diagnostics.providerValidationPath || null;
    this.sanitizedResponseBody = diagnostics.sanitizedResponseBody ?? null;
    this.occurredAt = diagnostics.occurredAt || new Date().toISOString();
  }
}

export function nextShotstackManualAttempt(latest: ShotstackAttemptSummary | null, visualTest = false) {
  if (!latest) return 1;
  if (visualTest) return latest.attemptNumber === 1 && latest.status === "failed"
    && latest.errorCategory === "validation" && latest.providerRequestId === null ? 2 : null;
  const credentialFailureBeforeSubmission = latest.attemptNumber === 1
    && latest.status === "failed"
    && latest.providerRequestId === null
    && ["authentication", "configuration"].includes(latest.errorCategory || "");
  if (credentialFailureBeforeSubmission) return 2;
  const schemaFailureBeforeSubmission = [2, 3].includes(latest.attemptNumber)
    && latest.status === "failed"
    && latest.providerRequestId === null
    && latest.errorCategory === "validation";
  if (schemaFailureBeforeSubmission) return latest.attemptNumber + 1;
  const firstQualityRemediation = latest.attemptNumber === 4
    && latest.status === "succeeded"
    && latest.providerRequestId !== null
    && !latest.errorCategory;
  if (firstQualityRemediation) return 5;
  const pronunciationValidation = latest.attemptNumber === 5
    && latest.status === "succeeded"
    && latest.providerRequestId !== null
    && !latest.errorCategory;
  if (pronunciationValidation) return 6;
  const controlTokenRemediation = latest.attemptNumber === 6
    && latest.status === "succeeded"
    && latest.providerRequestId !== null
    && !latest.errorCategory;
  return controlTokenRemediation ? SHOTSTACK_MAX_MANUAL_ATTEMPTS : null;
}

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const clean = (value: unknown, maximum = 500) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const providerSensitiveKey = /(?:api[_-]?key|authorization|cookie|credential|jwt|password|secret|token)/i;

function sanitizeProviderValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") {
    return value.slice(0, 1000).replace(/bearer\s+[A-Za-z0-9._~-]+/ig, "[redacted bearer]").replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeProviderValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).slice(0, 40).reduce<Record<string, unknown>>((result, [key, item]) => {
      if (!providerSensitiveKey.test(key)) result[key.slice(0, 100)] = sanitizeProviderValue(item, depth + 1);
      return result;
    }, {});
  }
  return null;
}

async function sanitizedProviderBody(response: Response) {
  const raw = (await response.text()).slice(0, 12_000);
  if (!raw) return null;
  try { return sanitizeProviderValue(JSON.parse(raw)); }
  catch { return { unparsed: true, length: raw.length, value: "[redacted non-JSON provider response]" }; }
}

function diagnosticString(value: unknown, maximum = 300) {
  return clean(value, maximum).replace(/[\r\n]+/g, " ") || null;
}

function providerDiagnostics(body: unknown) {
  const root = asRecord(body);
  const response = asRecord(root.response);
  const error = asRecord(root.error);
  const details = asRecord(root.details);
  const validation = asRecord(root.validation);
  const firstError = Array.isArray(root.errors) ? asRecord(root.errors[0]) : {};
  return {
    providerCode: diagnosticString(response.code || error.code || firstError.code || root.code, 100),
    providerMessage: diagnosticString(response.message || error.message || firstError.message || root.message || root.error, 500),
    providerRequestId: diagnosticString(response.requestId || response.request_id || error.requestId || error.request_id || root.requestId || root.request_id, 120),
    providerValidationPath: diagnosticString(validation.path || validation.field || details.path || details.field || error.path || error.field || firstError.path || firstError.field || root.path || root.field, 240),
  };
}

export function shotstackEnvironment(environment: Readonly<Record<string, string | undefined>> = process.env): ShotstackEnvironment {
  return environment.SHOTSTACK_API_ENV === "v1" ? "v1" : "stage";
}

export function shotstackConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const apiKey = clean(environment.SHOTSTACK_API_KEY, 500);
  return { configured: apiKey.length >= 20, apiKey, environment: shotstackEnvironment(environment) };
}

export function shotstackWatermarkPolicy(environment: ShotstackEnvironment) {
  return environment === "v1"
    ? { publicationWatermarkEligible: true, testWatermarkExpected: false }
    : { publicationWatermarkEligible: false, testWatermarkExpected: true };
}

export function estimateShotstackCredits(manifest: ProductionManifest, environment: ShotstackEnvironment) {
  const narration = normalizeBeastNarrationForSpeech(manifest.scenes.map((scene) => scene.narration).join(" "));
  const speechCredits = Math.ceil(Math.max(1, narration.length) / 100) * 0.1;
  const renderCredits = environment === "v1" ? Math.ceil(manifest.runtimeMs / 60_000 * 10) / 10 : 0;
  return {
    renderCredits,
    speechCredits,
    estimatedTotal: Math.round((renderCredits + speechCredits) * 10) / 10,
    basis: environment === "v1" ? "Production render plus text-to-speech" : "Sandbox render plus text-to-speech",
  };
}

const allowedClipFields = new Set(["asset", "start", "length", "fit", "scale", "width", "height", "position", "offset", "transition", "effect", "filter", "opacity", "transform", "alias"]);
const allowedAssetFields: Record<string, Set<string>> = {
  image: new Set(["type", "src", "prompt", "model", "resolution", "aspectRatio", "crop"]),
  // The deployed Edit endpoint rejected voice metadata on generated `audio`
  // assets. Keep `audio` for sourced music/SFX only and use the legacy-compatible
  // text-to-speech asset for narration.
  audio: new Set(["type", "src", "prompt", "model", "musicLengthMs", "forceInstrumental", "compositionPlan", "trim", "volume", "effect"]),
  "text-to-speech": new Set(["type", "text", "voice", "language", "newscaster", "trim", "volume", "effect"]),
  "rich-text": new Set(["type", "text", "font", "style", "stroke", "shadow", "background", "border", "padding", "align", "animation"]),
};

const supportedTransitions = new Set([
  "none", "fade", "fadeSlow", "fadeFast", "reveal", "revealSlow", "revealFast",
  "wipeLeft", "wipeLeftSlow", "wipeLeftFast", "wipeRight", "wipeRightSlow", "wipeRightFast",
  "slideLeft", "slideLeftSlow", "slideLeftFast", "slideRight", "slideRightSlow", "slideRightFast",
  "slideUp", "slideUpSlow", "slideUpFast", "slideDown", "slideDownSlow", "slideDownFast",
  "carouselLeft", "carouselLeftSlow", "carouselLeftFast", "carouselRight", "carouselRightSlow", "carouselRightFast",
  "carouselUp", "carouselUpSlow", "carouselUpFast", "carouselDown", "carouselDownSlow", "carouselDownFast",
  "shuffleTopRight", "shuffleTopRightSlow", "shuffleTopRightFast", "shuffleRightTop", "shuffleRightTopSlow", "shuffleRightTopFast",
  "shuffleRightBottom", "shuffleRightBottomSlow", "shuffleRightBottomFast", "shuffleBottomRight", "shuffleBottomRightSlow", "shuffleBottomRightFast",
  "shuffleBottomLeft", "shuffleBottomLeftSlow", "shuffleBottomLeftFast", "shuffleLeftBottom", "shuffleLeftBottomSlow", "shuffleLeftBottomFast",
  "shuffleLeftTop", "shuffleLeftTopSlow", "shuffleLeftTopFast", "shuffleTopLeft", "shuffleTopLeftSlow", "shuffleTopLeftFast", "zoom",
]);
const allowedTimelineFields = new Set(["background", "fonts", "tracks", "soundtrack", "cache"]);
const allowedOutputFields = new Set(["format", "resolution", "aspectRatio", "size", "fps", "scaleTo", "quality", "repeat", "mute", "range", "poster", "thumbnail", "destinations"]);

function extraFields(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

/** Validate the provider-facing Edit JSON against the current documented shape before any network call. */
export function validateShotstackEdit(edit: ShotstackEdit) {
  const errors: string[] = [];
  const timeline = asRecord(edit.timeline);
  const output = asRecord(edit.output);
  extraFields(timeline, allowedTimelineFields).forEach((field) => errors.push(`timeline.${field} is not supported`));
  extraFields(output, allowedOutputFields).forEach((field) => errors.push(`output.${field} is not supported`));
  if (!Array.isArray(timeline.tracks) || timeline.tracks.length === 0) errors.push("timeline.tracks must contain at least one track");
  if (output.format !== "mp4") errors.push("output.format must be mp4");
  const size = asRecord(output.size);
  if (Object.keys(size).length && (!Number.isInteger(size.width) || !Number.isInteger(size.height) || Number(size.width) % 2 !== 0 || Number(size.height) % 2 !== 0)) errors.push("output.size must contain even integer width and height");
  const tracks = Array.isArray(timeline.tracks) ? timeline.tracks : [];
  tracks.forEach((track: unknown, trackIndex: number) => {
    const trackRecord = asRecord(track);
    if (!Array.isArray(trackRecord.clips) || trackRecord.clips.length === 0) errors.push(`timeline.tracks[${trackIndex}].clips must not be empty`);
    const ranges: Array<{ start: number; end: number; index: number }> = [];
    const clips = Array.isArray(trackRecord.clips) ? trackRecord.clips : [];
    clips.forEach((clip: unknown, clipIndex: number) => {
      const clipRecord = asRecord(clip);
      extraFields(clipRecord, allowedClipFields).forEach((field) => errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].${field} is not supported`));
      const start = typeof clipRecord.start === "number" ? clipRecord.start : null;
      const length = typeof clipRecord.length === "number" ? clipRecord.length : null;
      if (start !== null && length !== null) {
        if (start < 0 || length <= 0) errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}] has invalid timing`);
        ranges.forEach((range) => { if (start < range.end - 1e-9 && start + length > range.start + 1e-9) errors.push(`timeline.tracks[${trackIndex}] clips ${range.index} and ${clipIndex} overlap`); });
        ranges.push({ start, end: start + length, index: clipIndex });
      }
      const asset = asRecord(clipRecord.asset);
      const assetType = clean(asset.type, 40);
      const allowed = allowedAssetFields[assetType];
      if (!allowed) errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}] uses unsupported asset type`);
      else {
        extraFields(asset, allowed).forEach((field) => errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].asset.${field} is not supported`));
        if (assetType === "audio" && (!asset.prompt && !asset.src || asset.prompt && asset.src)) errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].asset must provide exactly one audio source`);
        if (assetType === "text-to-speech") {
          if (typeof asset.text !== "string" || !asset.text.trim()) errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].asset.text is required`);
          if (typeof asset.voice !== "string" || !asset.voice.trim()) errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].asset.voice is required`);
        }
      }
      if (clipRecord.transition && typeof clipRecord.transition !== "object") errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].transition must be an object`);
      if (clipRecord.transition && typeof clipRecord.transition === "object") {
        const transition = asRecord(clipRecord.transition);
        extraFields(transition, new Set(["in", "out"])).forEach((field) => errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].transition.${field} is not supported`));
        for (const direction of ["in", "out"] as const) {
          const value = transition[direction];
          if (value !== undefined && (typeof value !== "string" || !supportedTransitions.has(value))) {
            errors.push(`timeline.tracks[${trackIndex}].clips[${clipIndex}].transition.${direction} is not supported`);
          }
        }
      }
    });
  });
  return { valid: errors.length === 0, errors };
}

export function buildShotstackEdit(manifest: ProductionManifest): ShotstackEdit {
  if (!manifest.scenes.length) throw new ShotstackProviderError("validation", false);
  const narration = normalizeBeastNarrationForSpeech(manifest.scenes.map((scene) => scene.narration.trim()).filter(Boolean).join(" "));
  if (!narration) throw new ShotstackProviderError("validation", false);

  const visualPlan = manifest.visualPlan || buildVisualBeatPlan(manifest);
  const voiceDelivery = manifest.audioMix?.voiceDelivery;
  // Only explicitly bound, provenance-backed media can enter this renderer.
  // Never pass arbitrary URLs to an external media fetcher.
  const visualClips = visualPlan.beats.flatMap((beat) => {
    if (!beat.visualAssetId) {
      if (manifest.requireVisuals) throw new ShotstackProviderError("validation", false);
      return [];
    }
    const matches = manifest.assets.filter((asset) => asset.id === beat.visualAssetId);
    const asset = matches[0];
    if (matches.length !== 1 || !asset || !["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType || "") || !validateVisualAsset(asset).valid) {
      throw new ShotstackProviderError("validation", false);
    }
    if (!asset.uri) throw new ShotstackProviderError("validation", false);
    return [{
      asset: { type: "image", src: asset.uri },
      start: beat.startMs / 1000,
      length: (beat.endMs - beat.startMs) / 1000,
      // `cover` is an internal planner term; Shotstack's aspect-safe equivalent
      // is `crop` (the provider's `cover` stretches the image).
      fit: beat.fit === "cover" ? "crop" : beat.fit,
      position: "center",
      width: manifest.width,
      height: manifest.height,
      effect: { reveal: "zoomInFast", push_in: "zoomInFast", pull_out: "zoomOutFast", pan_left: "slideLeftFast", pan_right: "slideRightFast", pan_up: "slideUpFast", pan_down: "slideDownFast" }[beat.motion],
      transition: { in: beat.transition === "cut" ? "none" : "fadeFast", out: "fadeFast" },
    }];
  });

  const sceneHeadline = (narration: string, index: number) => {
    const normalized = narration.replace(/^Next:\s*/i, "").trim();
    if (index === 0) return normalized;
    if (index === manifest.scenes.length - 1) return normalized;
    const subject = normalized.split(/\s+(?:presents|separates|are|explains|connects|guides|organizes|publishes)\b/i)[0]?.trim();
    return (subject || normalized.split(/\s+/).slice(0, 6).join(" ")).slice(0, 90);
  };
  const sceneClips = manifest.scenes.flatMap((scene, index) => scene.visualAssetId ? [] : [{
    asset: {
      type: "rich-text",
      text: normalizeBeastDisplayNames(sceneHeadline(scene.narration, index)),
      font: { family: "Montserrat", size: manifest.aspectRatio === "9:16" ? 84 : 64, weight: 800, color: "#f8fafc" },
      style: { lineHeight: 1.12 },
      align: { horizontal: "center", vertical: "middle" },
      background: { color: index % 2 === 0 ? "#111827" : "#172033", opacity: 0.94, borderRadius: 32 },
      padding: 44,
      animation: { preset: index === 0 ? "typewriter" : "fadeIn", duration: 0.6, style: "word" },
    },
    start: scene.startMs / 1000,
    length: Math.max(0.1, (scene.endMs - scene.startMs) / 1000),
    width: Math.round(manifest.width * 0.82),
    height: Math.round(manifest.height * 0.42),
    position: "center",
  }]);
  const captionClips = manifest.scenes.flatMap((scene) => scene.captions.map((cue) => ({
    asset: {
      type: "rich-text",
      text: normalizeBeastDisplayNames(cue.text),
      font: { family: "Montserrat", size: manifest.aspectRatio === "9:16" ? 46 : 38, weight: 800, color: "#ffffff" },
      style: { lineHeight: 1.12 },
      background: { color: "#070b14", opacity: 0.72, borderRadius: 18 },
      padding: 22,
      align: { horizontal: "center", vertical: "middle" },
    },
    start: cue.startMs / 1000,
    length: Math.max(0.1, (cue.endMs - cue.startMs) / 1000),
    width: Math.round(manifest.width * 0.9),
      height: Math.round(manifest.height * 0.18),
      position: "bottom",
      offset: { x: 0, y: 0.1 },
      fit: "none",
  })));

  const finalScene = manifest.scenes.at(-1);
  const endCardClip = finalScene ? {
    asset: {
      type: "rich-text",
      text: normalizeBeastDisplayNames(finalScene.narration),
      font: { family: "Montserrat", size: manifest.aspectRatio === "9:16" ? 58 : 46, weight: 800, color: "#ffffff" },
      style: { lineHeight: 1.08 },
      background: { color: "#070b14", opacity: 0.92, borderRadius: 24 },
      padding: 28,
      align: { horizontal: "center", vertical: "middle" },
    },
    start: finalScene.startMs / 1000,
    length: Math.max(0.1, (finalScene.endMs - finalScene.startMs) / 1000),
    width: Math.round(manifest.width * 0.86),
    height: Math.round(manifest.height * 0.2),
    position: "center",
    // `zoomFast` is a clip effect, not a valid transition name. Keep the
    // CTA's visual treatment as a supported transition and leave image zoom
    // effects on the visual clips above.
    transition: { in: "fadeFast", out: "fadeFast" },
  } : null;

  const musicAsset = manifest.audioMix?.musicAssetId ? manifest.assets.find((asset) => asset.id === manifest.audioMix?.musicAssetId) : null;
  const musicAuthorized = Boolean(musicAsset?.uri && musicAsset.role === "music" && musicAsset.mimeType?.startsWith("audio/")
    && musicAsset.provenanceComplete && Boolean(musicAsset.createdAt) && /^sha256:[a-f0-9]{64}$/i.test(musicAsset.contentHash || "")
    && (musicAsset.sourceType === "first_party" || (Boolean(musicAsset.providerId) && musicAsset.authorized === true)));
  const musicClip = musicAuthorized ? {
    asset: { type: "audio", src: musicAsset!.uri!, volume: Math.min(0.35, Math.max(0.05, manifest.audioMix?.musicVolume ?? 0.16)) },
    start: 0,
    length: manifest.runtimeMs / 1000,
  } : null;
  const sfxClips = (manifest.audioMix?.sfx || []).flatMap((cue) => {
    const asset = manifest.assets.find((candidate) => candidate.id === cue.assetId);
    const authorized = Boolean(asset?.uri && asset.mimeType?.startsWith("audio/") && asset.provenanceComplete && asset.createdAt
      && /^sha256:[a-f0-9]{64}$/i.test(asset.contentHash || "")
      && (asset.sourceType === "first_party" || (asset.providerId && asset.authorized === true)));
    if (!authorized || !asset?.uri || cue.endMs <= cue.startMs || cue.startMs < 0 || cue.endMs > manifest.runtimeMs) throw new ShotstackProviderError("validation", false);
    return [{ asset: { type: "audio", src: asset.uri, volume: Math.min(0.5, Math.max(0, cue.volume)) }, start: cue.startMs / 1000, length: (cue.endMs - cue.startMs) / 1000 }];
  });

  const edit: ShotstackEdit = {
    timeline: {
      background: "#070b14",
      tracks: [
        {
          clips: captionClips,
        },
        ...(endCardClip ? [{ clips: [endCardClip] }] : []),
        ...(sceneClips.length ? [{ clips: sceneClips }] : []),
        {
          clips: [{
            asset: {
              type: "rich-text",
              text: normalizeBeastDisplayNames(manifest.brandLabel?.trim().slice(0, 80) || "SEANGWORLD"),
              font: { family: "Montserrat", size: manifest.aspectRatio === "9:16" ? 34 : 28, weight: 800, color: "#fbbf24" },
              style: { letterSpacing: 3, textTransform: "uppercase" },
            },
            start: 0,
            length: "end",
            width: Math.round(manifest.width * 0.58),
            height: 100,
            position: "topLeft",
            offset: { x: 0.03, y: -0.04 },
          }],
        },
        ...(visualClips.length ? [{ clips: visualClips }] : []),
        {
          clips: [{
            alias: "bmkt-narration",
            // The Production endpoint rejected voice metadata on an `audio`
            // asset. Use Shotstack's supported text-to-speech representation;
            // delivery speed remains a BeastMarketing quality target, but is
            // not serialized.
            asset: {
              type: "text-to-speech",
              text: narration,
              voice: voiceDelivery?.voice || "Matthew",
              language: voiceDelivery?.language || "en-US",
              newscaster: voiceDelivery?.newscaster ?? false,
            },
            start: 0,
            length: "auto",
          }],
        },
        ...(musicClip ? [{ clips: [musicClip] }] : []),
        ...(sfxClips.length ? [{ clips: sfxClips }] : []),
      ],
    },
    output: { format: "mp4", aspectRatio: manifest.aspectRatio, fps: 25, size: { width: manifest.width, height: manifest.height }, range: { start: 0, length: manifest.runtimeMs / 1000 } },
  };
  const validation = validateShotstackEdit(edit);
  if (!validation.valid) throw new ShotstackProviderError("validation", false, null, { providerMessage: validation.errors.join("; ") });
  return edit;
}

async function providerError(response: Response) {
  const body = await sanitizedProviderBody(response);
  const diagnostics = { ...providerDiagnostics(body), sanitizedResponseBody: body, occurredAt: new Date().toISOString() };
  if (response.status === 401 || response.status === 403) return new ShotstackProviderError("authentication", false, response.status, diagnostics);
  if (response.status === 429) return new ShotstackProviderError("rate_limit", true, response.status, diagnostics);
  if ([400, 422].includes(response.status)) return new ShotstackProviderError("validation", false, response.status, diagnostics);
  return new ShotstackProviderError("provider", response.status >= 500, response.status, diagnostics);
}

async function providerFetch(url: string, apiKey: string, init: RequestInit = {}, fetcher: typeof fetch = fetch) {
  if (apiKey.length < 20) throw new ShotstackProviderError("configuration", false);
  try {
    const response = await fetcher(url, {
      ...init,
      headers: { accept: "application/json", "content-type": "application/json", "x-api-key": apiKey, ...(init.headers || {}) },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) throw await providerError(response);
    return response;
  } catch (error) {
    if (error instanceof ShotstackProviderError) throw error;
    throw new ShotstackProviderError("network", true);
  }
}

export async function submitShotstackRender(input: { apiKey: string; environment: ShotstackEnvironment; edit: ShotstackEdit; fetcher?: typeof fetch }) {
  const response = await providerFetch(`https://api.shotstack.io/edit/${input.environment}/render`, input.apiKey, { method: "POST", body: JSON.stringify(input.edit) }, input.fetcher);
  const body = asRecord(await response.json());
  const result = asRecord(body.response);
  const id = clean(result.id, 80);
  if (!id) throw new ShotstackProviderError("provider", false);
  return { providerRequestId: id, status: "submitted" as const };
}

export async function inspectShotstackRender(input: { apiKey: string; environment: ShotstackEnvironment; providerRequestId: string; fetcher?: typeof fetch }): Promise<ShotstackInspection> {
  const editResponse = await providerFetch(`https://api.shotstack.io/edit/${input.environment}/render/${encodeURIComponent(input.providerRequestId)}?data=false`, input.apiKey, { method: "GET" }, input.fetcher);
  const editBody = asRecord(await editResponse.json());
  const render = asRecord(editBody.response);
  const providerStatus = clean(render.status, 40).toLowerCase();
  if (providerStatus === "failed") return { status: "failed", retryable: false, providerStatus, asset: null };
  if (providerStatus !== "done") return { status: "submitted", retryable: true, providerStatus: providerStatus || "submitted", asset: null };

  const serveResponse = await providerFetch(`https://api.shotstack.io/serve/${input.environment}/assets/render/${encodeURIComponent(input.providerRequestId)}`, input.apiKey, { method: "GET" }, input.fetcher);
  const serveBody = asRecord(await serveResponse.json());
  const data = Array.isArray(serveBody.data) ? serveBody.data : [];
  const candidate = data.map((entry) => asRecord(asRecord(entry).attributes)).find((entry) => clean(entry.filename, 300).toLowerCase().endsWith(".mp4")) || null;
  if (!candidate) return { status: "submitted", retryable: true, providerStatus: "hosting", asset: null };
  const status = clean(candidate.status, 40).toLowerCase() as ShotstackAsset["status"];
  if (status === "failed" || status === "deleted") return { status: "failed", retryable: false, providerStatus: status, asset: null };
  const url = clean(candidate.url, 1500);
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new ShotstackProviderError("provider", false); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "cdn.shotstack.io") throw new ShotstackProviderError("provider", false);
  const asset: ShotstackAsset = {
    id: clean(candidate.id, 100), renderId: clean(candidate.renderId, 100), url,
    filename: clean(candidate.filename, 300), filesize: Number.isFinite(Number(candidate.filesize)) ? Number(candidate.filesize) : null,
    status,
  };
  return { status: status === "ready" ? "succeeded" : "submitted", retryable: true, providerStatus: status, asset };
}
