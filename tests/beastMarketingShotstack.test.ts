import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";
import { buildProductionManifest } from "../src/lib/beastMarketingProduction";
import { buildStaticContainVisualPlan, buildVisualBeatPlan } from "../src/lib/beastMarketingQuality";
import { bindNewsAcceptance2Revision6Visuals, bindNewsAcceptance2Revision7Visuals, newsAcceptance2Revision6Script } from "../src/lib/beastMarketingNewsVisualTest";
import { bindNarrationTimingEvidence, type NarrationTimingEvidence, validateNarrationTimingEvidence } from "../src/lib/beastMarketingProduction";
import { isTrustedShotstackMediaUrl } from "../src/lib/beastMarketingShotstackMedia";
import {
  BEAST_PRONUNCIATION_MAP,
  normalizeBeastDisplayNames,
  normalizeBeastNarrationForSpeech,
} from "../src/lib/beastMarketingNarration";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  ShotstackProviderError,
  buildShotstackEdit,
  buildShotstackNarrationCreatePayload,
  buildShotstackTranscriptionPayload,
  createShotstackNarrationAsset,
  estimateShotstackCredits,
  inspectShotstackRender,
  ingestShotstackNarration,
  narrationTimingEvidenceFromSrt,
  nextShotstackManualAttempt,
  parseSrt,
  parseShotstackCreateAsset,
  parseShotstackIngestSource,
  shotstackConfiguration,
  shotstackEnvironment,
  shotstackWatermarkPolicy,
  submitShotstackRender,
  validateShotstackEdit,
} from "../src/lib/beastMarketingShotstack";

const manifest = buildProductionManifest({
  jobId: "job-1",
  revision: 1,
  script: {
    hook: "What should you know before choosing an AI tool?",
    narration: [
      "Start with a specific task and verify the result before relying on it.",
      "The Beast organizes focused AI specialists around distinct member goals.",
    ],
    cta: "Visit SEANGWORLD for current product information.",
    estimatedSeconds: 45,
  },
  settings: defaultVideoSeriesSettings,
});

function illustratedManifest() {
  return {
    ...structuredClone(manifest), requireVisuals: true, brandLabel: "SEANGWORLD NEWS",
    scenes: manifest.scenes.map((scene) => ({ ...scene, visualAssetId: "news-home" })),
    assets: [{ id: "news-home", role: "product_capture" as const,
      uri: "https://news.seangworld.com/marketing/visuals/news-home.jpg",
      mimeType: "image/jpeg", sourceType: "first_party" as const, providerId: null,
      license: "Owner-provided product capture", contentHash: `sha256:${"a".repeat(64)}`,
      createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true }],
  };
}

test("visual composition binds actual images to scene timing, beneath captions", () => {
  const source = illustratedManifest();
  const edit = buildShotstackEdit(source);
  assert.ok(edit.timeline.tracks.every((track) => track.clips.length > 0));
  const images = edit.timeline.tracks.flatMap((track) => track.clips).filter((clip) => (clip.asset as Record<string, unknown>).type === "image");
  const beats = buildVisualBeatPlan(source).beats;
  assert.equal(images.length, beats.length);
  images.forEach((clip, index) => {
    assert.deepEqual(clip.asset, { type: "image", src: source.assets[0].uri });
    assert.equal(clip.start, beats[index].startMs / 1000);
    assert.equal(clip.length, (beats[index].endMs - beats[index].startMs) / 1000);
    assert.equal(clip.fit, "crop");
    assert.ok(clip.effect);
    assert.deepEqual(clip.transition, { in: index === 0 ? "none" : "fadeFast", out: "fadeFast" });
  });
  assert.match(JSON.stringify(edit), /SEANGWORLD NEWS/);
  assert.doesNotMatch(JSON.stringify(edit), /Explore The Beast AI Specialists/);
});

test("visual-required composition fails closed rather than producing text-only output", () => {
  assert.throws(() => buildShotstackEdit({ ...manifest, requireVisuals: true }), ShotstackProviderError);
  const missing = illustratedManifest(); missing.assets = [];
  assert.throws(() => buildShotstackEdit(missing), ShotstackProviderError);
  const duplicate = illustratedManifest(); duplicate.assets.push({ ...duplicate.assets[0] });
  assert.throws(() => buildShotstackEdit(duplicate), ShotstackProviderError);
});

test("visual composition rejects untrusted fetch locations and incomplete provenance", () => {
  for (const uri of ["http://news.seangworld.com/marketing/visuals/a.jpg",
    "https://evil.example/marketing/visuals/a.jpg", "https://news.seangworld.com.evil.example/marketing/visuals/a.jpg",
    "https://127.0.0.1/marketing/visuals/a.jpg", "https://news.seangworld.com/api/private",
    "https://news.seangworld.com/marketing/visuals/a.jpg?token=secret",
    "https://user:password@news.seangworld.com/marketing/visuals/a.jpg",
    "https://news.seangworld.com/marketing/visuals/a.jpg#fragment", "not-a-url"]) {
    const source = illustratedManifest(); source.assets[0].uri = uri;
    assert.throws(() => buildShotstackEdit(source), ShotstackProviderError);
  }
  for (const patch of [{ license: "" }, { contentHash: "fnv1a32:12345678" },
    { provenanceComplete: false }, { mimeType: "text/html" }, { createdAt: "" }]) {
    const source = illustratedManifest(); Object.assign(source.assets[0], patch);
    assert.throws(() => buildShotstackEdit(source), ShotstackProviderError);
  }
});

test("text fallback preserves the script destination instead of substituting another product", () => {
  const edit = buildShotstackEdit(manifest);
  assert.equal((edit.timeline.tracks[1].clips.at(-1)?.asset as { text: string }).text, manifest.scenes.at(-1)?.narration);
});

test("BMKT-007 keeps Product Truth display names separate from spoken TTS names", () => {
  const source = "beastos connects BeastMoney and BeastEducation AI at SEANGWORLD.COM.";
  assert.equal(
    normalizeBeastDisplayNames(source),
    "BeastOS connects BeastMoney and BeastEducation AI at SEANGWORLD.COM.",
  );
  assert.equal(
    normalizeBeastNarrationForSpeech(source),
    "Beast O S connects Beast Money and Beast Education A I at Sean G World dot com.",
  );
  assert.equal(normalizeBeastNarrationForSpeech(normalizeBeastNarrationForSpeech(source)), normalizeBeastNarrationForSpeech(source));
  assert.equal(normalizeBeastNarrationForSpeech("MyBeastOSPlugin uses an apiary."), "MyBeastOSPlugin uses an apiary.");
  assert.equal(new Set(BEAST_PRONUNCIATION_MAP.map((entry) => entry.canonical.toLowerCase())).size, BEAST_PRONUNCIATION_MAP.length);
  assert.deepEqual(BEAST_PRONUNCIATION_MAP.find((entry) => entry.canonical === "BeastOS"), {
    canonical: "BeastOS", display: "BeastOS", spoken: "Beast O S",
  });
});

test("BMKT-007 defaults to sandbox and requires a substantial server-only key", () => {
  assert.equal(shotstackEnvironment({}), "stage");
  assert.equal(shotstackEnvironment({ SHOTSTACK_API_ENV: "v1" }), "v1");
  assert.equal(shotstackEnvironment({ SHOTSTACK_API_ENV: "unexpected" }), "stage");
  assert.equal(shotstackConfiguration({ SHOTSTACK_API_KEY: "short" }).configured, false);
  assert.equal(shotstackConfiguration({ SHOTSTACK_API_KEY: "x".repeat(40) }).configured, true);
});

test("BMKT-010 keeps energetic speed metadata internal and omits unsupported TTS speed", () => {
  const edit = buildShotstackEdit(manifest);
  const serialized = JSON.stringify(edit);
  assert.deepEqual(edit.output, { format: "mp4", aspectRatio: "9:16", fps: 25, size: { width: 1080, height: 1920 }, range: { start: 0, length: 45 } });
  assert.match(serialized, /rich-text/);
  assert.doesNotMatch(serialized, /rich-caption/);
  assert.match(serialized, /"type":"text-to-speech"/);
  assert.match(serialized, /"text":"What should you know/);
  assert.match(serialized, /"vertical":"middle"/);
  assert.doesNotMatch(serialized, /"vertical":"center"/);
  assert.doesNotMatch(serialized, /"preset":"fade"/);
  assert.match(serialized, /"preset":"fadeIn"/);
  assert.match(serialized, /"newscaster":false/);
  const tts = edit.timeline.tracks.flatMap((track) => track.clips).find((clip) => clip.alias === "bmkt-narration");
  assert.deepEqual(Object.keys((tts?.asset || {}) as Record<string, unknown>).sort(), ["language", "newscaster", "text", "type", "voice"]);
  assert.equal("speed" in ((tts?.asset || {}) as Record<string, unknown>), false);
  assert.equal(manifest.audioMix?.voiceDelivery?.style, "energetic_conversational");
  assert.equal(manifest.audioMix?.voiceDelivery?.speed, 1.16);
  assert.doesNotMatch(serialized, /youtube|destinations|webhook|callback/i);
  assert.doesNotMatch(serialized, /api[_-]?key|secret|token/i);
});

test("BMKT-011 provider payload uses current Edit schema and has no same-track overlap", () => {
  const edit = buildShotstackEdit(illustratedManifest());
  assert.equal(validateShotstackEdit(edit).valid, true);
  assert.equal(edit.timeline.tracks.some((track) => track.clips.some((clip, index) => index > 0 && clip.start === 0)), false);
  const narration = edit.timeline.tracks.flatMap((track) => track.clips).find((clip) => clip.alias === "bmkt-narration");
  assert.deepEqual(narration?.asset, { type: "text-to-speech", text: (narration?.asset as Record<string, unknown>).text, voice: "Matthew", language: "en-US", newscaster: false });
  assert.equal(edit.timeline.tracks.some((track) => track.clips.some((clip) => (clip.asset as Record<string, unknown>).type === "audio" && (clip.asset as Record<string, unknown>).voice)), false);
  assert.equal((edit.timeline.tracks.find((track) => track.clips.some((clip) => clip.alias === "bmkt-narration"))?.clips[0].asset as Record<string, unknown>).type, "text-to-speech");
  assert.equal(edit.timeline.tracks.filter((track) => track.clips.some((clip) => (clip.asset as Record<string, unknown>).type === "rich-text")).length >= 2, true);
});

test("BMKT-010 static presentation sends full-frame contain images without motion effects", () => {
  const source = illustratedManifest();
  const visualPlan = buildStaticContainVisualPlan({ ...source, visualPlan: buildVisualBeatPlan(source) });
  const edit = buildShotstackEdit({ ...source, visualPlan });
  const images = edit.timeline.tracks.flatMap((track) => track.clips).filter((clip) => (clip.asset as Record<string, unknown>).type === "image");
  assert.ok(images.length > 0);
  images.forEach((clip, index) => {
    assert.equal(clip.fit, "contain");
    assert.equal("effect" in clip, false);
    assert.equal(clip.width, 1080);
    assert.equal(clip.height, 1920);
    assert.deepEqual(clip.transition, { in: index === 0 ? "none" : "fadeFast", out: "fadeFast" });
  });
  assert.equal(validateShotstackEdit(edit).valid, true);
});

test("Revision 6 provider edit is static contain-only, schema-valid, and preserves energetic TTS", () => {
  const source = bindNewsAcceptance2Revision6Visuals(buildProductionManifest({
    jobId: "acceptance-2-r6-shotstack", revision: 6, settings: defaultVideoSeriesSettings,
    script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] },
  }));
  const edit = buildShotstackEdit(source);
  assert.equal(validateShotstackEdit(edit).valid, true);
  assert.equal(edit.output.range?.length, 61.5);
  const clips = edit.timeline.tracks.flatMap((track) => track.clips);
  const images = clips.filter((clip) => (clip.asset as Record<string, unknown>).type === "image");
  assert.equal(images.length, 12);
  assert.equal(images.every((clip) => clip.fit === "contain" && !Object.hasOwn(clip, "effect")), true);
  assert.equal(images.every((clip) => clip.transition && ["none", "fadeFast"].includes((clip.transition as Record<string, unknown>).in as string) && (clip.transition as Record<string, unknown>).out === "fadeFast"), true);
  const ids = source.visualPlan?.beats.map((beat) => beat.visualAssetId) || [];
  assert.equal(ids[0], "news-test-home");
  assert.equal(ids.at(-1), "news-test-home");
  assert.equal(ids.filter((id, index) => index > 0 && id === ids[index - 1]).length, 0);
  assert.equal(source.assets.some((asset) => asset.sourceType === "generated"), false);
  const narration = clips.find((clip) => clip.alias === "bmkt-narration");
  assert.deepEqual(narration?.asset, { type: "text-to-speech", text: (narration?.asset as Record<string, unknown>).text, voice: "Matthew", language: "en-US", newscaster: false });
  assert.equal("speed" in ((narration?.asset || {}) as Record<string, unknown>), false);
  assert.equal(source.audioMix?.voiceDelivery?.style, "energetic_conversational");
  assert.equal(source.audioMix?.voiceDelivery?.speed, 1.16);
  assert.equal(source.scenes.every((scene) => scene.captions.every((cue) => cue.text.split(/\s+/).length <= 6)), true);
});

test("Revision 7 emits no center narration overlay and separates screenshots with black fades", () => {
  const source = bindNewsAcceptance2Revision7Visuals(bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "acceptance-2-r7-shotstack", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } })));
  const edit = buildShotstackEdit(source);
  assert.equal(validateShotstackEdit(edit).valid, true);
  assert.equal(edit.timeline.background, "#000000");
  assert.equal(edit.timeline.tracks.some((track) => track.clips.some((clip) => clip.alias === "bmkt-narration")), true);
  const images = edit.timeline.tracks.flatMap((track) => track.clips).filter((clip) => (clip.asset as Record<string, unknown>).type === "image");
  assert.equal(images.length, 10);
  assert.equal(images.every((clip) => clip.fit === "contain" && !Object.hasOwn(clip, "effect")), true);
  assert.equal(images.every((clip) => (clip.transition as Record<string, unknown>).in === "none" || (clip.transition as Record<string, unknown>).in === "fadeFast"), true);
  assert.equal(images.filter((clip) => (clip.transition as Record<string, unknown>).in === "fadeFast" && (clip.transition as Record<string, unknown>).out === "fadeFast").length, 9);
  for (let index = 1; index < images.length; index += 1) assert.ok((images[index].start as number) > (images[index - 1].start as number) + (images[index - 1].length as number));
  assert.equal(edit.timeline.tracks.some((track) => track.clips.some((clip) => (clip.asset as Record<string, unknown>).type === "rich-text" && clip.width === Math.round(source.width * 0.82))), false);
  const evidence: NarrationTimingEvidence = { providerId: "shotstack", assetId: "tts-r7", assetUri: "https://cdn.shotstack.io/au/v1/audio-r7.mp3", sourceId: "source-r7", durationMs: 61_500, timingType: "phrase", cues: source.scenes.flatMap((scene) => scene.captions.map((cue) => ({ sceneId: scene.id, text: cue.text, startMs: cue.startMs, endMs: cue.endMs }))), verifiedAt: "2026-09-11T20:00:00.000Z", syncToleranceMs: 150, maxObservedDriftMs: 0 };
  const bound = bindNarrationTimingEvidence(source, evidence);
  const boundEdit = buildShotstackEdit(bound);
  assert.equal(validateShotstackEdit(boundEdit).valid, true);
  const boundNarration = boundEdit.timeline.tracks.flatMap((track) => track.clips).find((clip) => clip.alias === "bmkt-narration");
  assert.deepEqual(boundNarration?.asset, { type: "audio", src: "https://cdn.shotstack.io/au/v1/audio-r7.mp3" });
  assert.equal((boundNarration?.asset as Record<string, unknown>).type === "text-to-speech", false);
  assert.equal(estimateShotstackCredits(bound, "v1").speechCredits, 0);
  assert.equal(boundEdit.timeline.tracks.some((track) => track.clips.some((clip) => clip.alias !== "bmkt-cta" && clip.position === "center" && (clip.asset as Record<string, unknown>).type === "rich-text" && clip.width === Math.round(source.width * 0.82))), false);
});

test("BMKT-011 local schema validation catches custom fields and same-track overlap", () => {
  const edit = buildShotstackEdit(illustratedManifest());
  (edit.timeline.tracks[0].clips[0] as Record<string, unknown>).metadata = { internal: true };
  assert.equal(validateShotstackEdit(edit).errors.some((error) => /metadata is not supported/.test(error)), true);
  const cleanEdit = buildShotstackEdit(illustratedManifest());
  cleanEdit.timeline.tracks[0].clips.push({ ...cleanEdit.timeline.tracks[0].clips[0], start: 0, length: 1 });
  assert.equal(validateShotstackEdit(cleanEdit).errors.some((error) => /overlap/.test(error)), true);
});

test("BMKT-012 rejects the exact Revision 3 narration and CTA transition defects", () => {
  const badNarration = buildShotstackEdit(illustratedManifest());
  const narrationTrack = badNarration.timeline.tracks.find((track) => track.clips.some((clip) => clip.alias === "bmkt-narration"));
  const narrationAsset = narrationTrack?.clips.find((clip) => clip.alias === "bmkt-narration")?.asset as Record<string, unknown>;
  narrationAsset.voice = "Matthew";
  narrationAsset.type = "audio";
  narrationAsset.prompt = narrationAsset.text;
  delete narrationAsset.text;
  const narrationErrors = validateShotstackEdit(badNarration).errors;
  assert.equal(narrationErrors.some((error) => /asset\.voice is not supported/.test(error)), true);
  assert.equal(narrationErrors.some((error) => /asset must provide exactly one audio source/.test(error)), false);

  const badTransition = buildShotstackEdit(illustratedManifest());
  const ctaTrack = badTransition.timeline.tracks.find((track) => track.clips.some((clip) => clip.position === "center" && clip.transition));
  const cta = ctaTrack?.clips.find((clip) => clip.transition) as Record<string, unknown>;
  cta.transition = { in: "zoomFast", out: "fadeFast" };
  const transitionErrors = validateShotstackEdit(badTransition).errors;
  assert.equal(transitionErrors.some((error) => /transition\.in is not supported/.test(error)), true);
});

test("BMKT-007 normalizes pronunciation only at the TTS boundary", () => {
  const beastOSManifest = buildProductionManifest({
    jobId: "job-beastos", revision: 1,
    script: { hook: "What is beastos?", narration: ["BeastOS connects AI specialists."], cta: "Visit SEANGWORLD.COM.", estimatedSeconds: 30 },
    settings: { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 30, maximumRuntimeSeconds: 30 },
  });
  const edit = buildShotstackEdit(beastOSManifest);
  const tracks = edit.timeline.tracks;
  const tts = tracks.flatMap((track) => track.clips).find((clip) => clip.alias === "bmkt-narration")!;
  assert.match(JSON.stringify(tts), /Beast O S/);
  assert.doesNotMatch(JSON.stringify(tts), /BeastOS|beastos/);
  const visible = JSON.stringify(tracks.slice(0, 3));
  assert.match(visible, /BeastOS/);
  assert.doesNotMatch(visible, /Beast O S/);
});

test("BMKT-007 excludes internal control labels from every provider-facing text asset", () => {
  const controlled = buildProductionManifest({
    jobId: "job-control-labels", revision: 1,
    script: { hook: "SCENE 1: BeastOS", narration: ["NEXT: BeastOS connects AI specialists.", "TRANSITION — Visit SEANGWORLD.COM."], cta: "CONTINUE: Learn more.", estimatedSeconds: 30 },
    settings: { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 30, maximumRuntimeSeconds: 30 },
  });
  const edit = buildShotstackEdit(controlled);
  const textAssets = edit.timeline.tracks.flatMap((track) => track.clips).map((clip) => clip.asset).filter((asset): asset is Record<string, unknown> => Boolean(asset && typeof asset === "object"));
  for (const asset of textAssets) {
    if (typeof asset.text === "string") assert.doesNotMatch(asset.text, /^(?:NEXT|SCENE(?:\s+\d+)?|CONTINUE|TRANSITION|START HERE|CUT TO)\b\s*(?::|—|-)?/i);
  }
});

test("BMKT-007 marks Sandbox watermarks test-only and publication-ineligible", () => {
  assert.deepEqual(shotstackWatermarkPolicy("stage"), { publicationWatermarkEligible: false, testWatermarkExpected: true });
  assert.deepEqual(shotstackWatermarkPolicy("v1"), { publicationWatermarkEligible: true, testWatermarkExpected: false });
});

test("BMKT-007 estimates sandbox and Production credits before submission", () => {
  const sandbox = estimateShotstackCredits(manifest, "stage");
  const production = estimateShotstackCredits(manifest, "v1");
  assert.equal(sandbox.renderCredits, 0);
  assert.ok(sandbox.speechCredits > 0);
  assert.ok(production.renderCredits > 0);
  assert.ok(sandbox.estimatedTotal <= SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER);
  assert.ok(production.estimatedTotal <= SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER);
});

test("BMKT-007 submits with x-api-key but never returns or serializes the key", async () => {
  const key = "k".repeat(40);
  let observedHeader = "";
  const result = await submitShotstackRender({
    apiKey: key,
    environment: "stage",
    edit: buildShotstackEdit(manifest),
    fetcher: async (_input, init) => {
      observedHeader = String((init?.headers as Record<string, string>)["x-api-key"]);
      return new Response(JSON.stringify({ response: { id: "render-123", status: "queued" } }), { status: 201 });
    },
  });
  assert.equal(observedHeader, key);
  assert.deepEqual(result, { providerRequestId: "render-123", status: "submitted" });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(key));
});

test("BMKT-007 maps provider authentication failures to safe typed errors", async () => {
  await assert.rejects(
    submitShotstackRender({ apiKey: "k".repeat(40), environment: "stage", edit: buildShotstackEdit(manifest), fetcher: async () => new Response("raw provider secret detail", { status: 401 }) }),
    (error: unknown) => error instanceof ShotstackProviderError && error.category === "authentication" && !error.message.includes("raw provider"),
  );
});

test("Revision 7 timing preparation uses exact normalized Create and Ingest payloads", () => {
  const revision7 = bindNewsAcceptance2Revision7Visuals(bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "timing-payload", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } })));
  const payload = buildShotstackNarrationCreatePayload(revision7);
  assert.equal(payload.provider, "shotstack");
  assert.deepEqual(payload.options, { type: "text-to-speech", text: normalizeBeastNarrationForSpeech(revision7.scenes.map((scene) => scene.narration).join(" ")), voice: "Matthew", language: "en-US" });
  assert.deepEqual(buildShotstackTranscriptionPayload("https://cdn.shotstack.io/au/v1/r7-audio.mp3"), { url: "https://cdn.shotstack.io/au/v1/r7-audio.mp3", outputs: { transcription: { format: "srt" } } });
});

test("Revision 7 timing provider calls use Create and Ingest endpoints without composition", async () => {
  const revision7 = bindNewsAcceptance2Revision7Visuals(bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "timing-provider", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } })));
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => { calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null }); return new Response(JSON.stringify({ response: { id: "asset-r7", status: "queued" } }), { status: 201 }); };
  await createShotstackNarrationAsset({ apiKey: "k".repeat(40), environment: "v1", manifest: revision7, fetcher });
  await ingestShotstackNarration({ apiKey: "k".repeat(40), environment: "v1", audioUrl: "https://cdn.shotstack.io/au/v1/r7-audio.mp3", fetcher });
  assert.equal(calls[0].url, "https://api.shotstack.io/create/v1/assets/");
  assert.equal(calls[1].url, "https://api.shotstack.io/ingest/v1/sources");
  assert.equal((calls[0].body as Record<string, unknown>).provider, "shotstack");
  assert.deepEqual(calls[1].body, { url: "https://cdn.shotstack.io/au/v1/r7-audio.mp3", outputs: { transcription: { format: "srt" } } });
});

test("Revision 7 timing parsers and SRT mapping preserve exact bounded phrases", () => {
  const revision7 = bindNewsAcceptance2Revision7Visuals(bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "timing-srt", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } })));
  const srt = revision7.scenes.flatMap((scene) => scene.captions).map((cue, index) => `${index + 1}\n${String(Math.floor(cue.startMs / 3_600_000)).padStart(2, "0")}:${String(Math.floor(cue.startMs / 60_000) % 60).padStart(2, "0")}:${String(Math.floor(cue.startMs / 1_000) % 60).padStart(2, "0")},${String(cue.startMs % 1_000).padStart(3, "0")} --> ${String(Math.floor(cue.endMs / 3_600_000)).padStart(2, "0")}:${String(Math.floor(cue.endMs / 60_000) % 60).padStart(2, "0")}:${String(Math.floor(cue.endMs / 1_000) % 60).padStart(2, "0")},${String(cue.endMs % 1_000).padStart(3, "0")}\n${cue.text}`).join("\n\n");
  assert.equal(parseSrt(srt).length, revision7.scenes.reduce((count, scene) => count + scene.captions.length, 0));
  const evidence = narrationTimingEvidenceFromSrt({ manifest: revision7, providerId: "shotstack", assetId: "asset-r7", assetUri: "https://cdn.shotstack.io/au/v1/r7-audio.mp3", sourceId: "source-r7", durationMs: 61_500, srt, verifiedAt: "2026-09-12T00:00:00.000Z" });
  assert.equal(evidence.cues.every((cue) => cue.text.trim().split(/\s+/).length <= 6), true);
  assert.equal(evidence.maxObservedDriftMs, 0);
  assert.deepEqual(parseShotstackCreateAsset({ response: { id: "asset-r7", status: "done", url: "https://cdn.shotstack.io/au/v1/r7-audio.mp3" } }), { id: "asset-r7", status: "done", url: "https://cdn.shotstack.io/au/v1/r7-audio.mp3", providerStatus: "done" });
  assert.deepEqual(parseShotstackIngestSource({ data: { id: "source-r7", attributes: { status: "done", duration: 61.5, outputs: { transcription: { url: "https://cdn.shotstack.io/au/v1/r7.srt" } } } } }), { id: "source-r7", status: "done", transcriptionUrl: "https://cdn.shotstack.io/au/v1/r7.srt", durationMs: 61_500, providerStatus: "done" });
});

test("trusted Shotstack media URL policy accepts only CDN and service-owned Create/Ingest buckets", () => {
  const passing = [
    "https://cdn.shotstack.io/au/v1/audio.mp3",
    "https://shotstack-create-api-v1-assets.s3.amazonaws.com/audio.mp3",
    "https://shotstack-create-api-stage-assets.s3.us-east-1.amazonaws.com/audio.mp3",
    "https://shotstack-ingest-api-v1-sources.s3.ap-southeast-2.amazonaws.com/transcript.srt?signature=presigned",
    "https://shotstack-ingest-api-stage-sources.s3.eu-west-1.amazonaws.com/transcript.srt",
  ];
  const failing = [
    "https://evil.s3.amazonaws.com/audio.mp3",
    "https://shotstack-create-api-v1-assets.s3.amazonaws.com.evil.com/audio.mp3",
    "https://amazonaws.com/audio.mp3",
    "http://cdn.shotstack.io/audio.mp3",
    "https://user:password@cdn.shotstack.io/audio.mp3",
    "https://shotstack.io.evil.com/audio.mp3",
    "https://shotstack-assets.example.com/audio.mp3",
    "https://shotstack-create-api-v1-assets.s3.amazonaws.com.evil/audio.mp3",
  ];
  passing.forEach((url) => assert.equal(isTrustedShotstackMediaUrl(url), true, url));
  failing.forEach((url) => assert.equal(isTrustedShotstackMediaUrl(url), false, url));
});

test("Revision 7 timing evidence accepts a trusted Shotstack Create S3 narration URL", () => {
  const manifest = bindNewsAcceptance2Revision7Visuals(bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "timing-s3-evidence", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } })));
  const evidence: NarrationTimingEvidence = {
    providerId: "shotstack", assetId: "asset-s3", assetUri: "https://shotstack-create-api-v1-assets.s3.amazonaws.com/audio.mp3", sourceId: "source-s3", durationMs: 61_500, timingType: "phrase", verifiedAt: "2026-09-12T00:00:00.000Z", syncToleranceMs: 150, maxObservedDriftMs: 0,
    cues: manifest.scenes.flatMap((scene) => scene.captions.map((cue) => ({ sceneId: scene.id, text: cue.text, startMs: cue.startMs, endMs: cue.endMs }))),
  };
  assert.equal(validateNarrationTimingEvidence(manifest, evidence).valid, true);
});

test("BMKT-007 permits bounded credential and schema remediation before provider submission", () => {
  assert.equal(nextShotstackManualAttempt(null), 1);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 1, status: "failed", errorCategory: "authentication", providerRequestId: null }), 2);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 1, status: "failed", errorCategory: "configuration", providerRequestId: null }), 2);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 1, status: "failed", errorCategory: "provider", providerRequestId: null }), null);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 1, status: "submitted", errorCategory: null, providerRequestId: "render-1" }), null);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 2, status: "failed", errorCategory: "validation", providerRequestId: null }), 3);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 2, status: "failed", errorCategory: "authentication", providerRequestId: null }), null);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 2, status: "failed", errorCategory: "validation", providerRequestId: "render-2" }), null);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 3, status: "failed", errorCategory: "validation", providerRequestId: null }), 4);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 4, status: "failed", errorCategory: "validation", providerRequestId: null }), null);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 4, status: "succeeded", errorCategory: null, providerRequestId: "render-4" }), 5);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 5, status: "succeeded", errorCategory: null, providerRequestId: "render-5" }), 6);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 6, status: "succeeded", errorCategory: null, providerRequestId: "render-6" }), 7);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 7, status: "succeeded", errorCategory: null, providerRequestId: "render-7" }), null);
});

test("visual test recovery permits only one manual retry of a rejected first request", () => {
  const rejected = { attemptNumber: 1, status: "failed", errorCategory: "validation", providerRequestId: null };
  assert.equal(nextShotstackManualAttempt(rejected, true), 2);
  assert.equal(nextShotstackManualAttempt({ ...rejected, attemptNumber: 2 }, true), null);
  assert.equal(nextShotstackManualAttempt({ ...rejected, providerRequestId: "retained-render" }, true), null);
  assert.equal(nextShotstackManualAttempt({ ...rejected, errorCategory: "network" }, true), null);
  assert.equal(nextShotstackManualAttempt({ ...rejected, status: "submitted" }, true), null);
});

test("provider status remains diagnosable without exposing response bodies", async () => {
  for (const status of [400, 402, 422, 500]) {
    await assert.rejects(submitShotstackRender({ apiKey: "k".repeat(40), environment: "v1", edit: buildShotstackEdit(manifest),
      fetcher: async () => new Response("private provider response", { status }) }),
    (error: unknown) => error instanceof ShotstackProviderError && error.httpStatus === status
      && error.category === ([400, 422].includes(status) ? "validation" : "provider")
      && !JSON.stringify(error).includes("private provider response"));
  }
});

test("BMKT-011 preserves sanitized upstream validation diagnostics", async () => {
  let captured: unknown;
  await assert.rejects(
    submitShotstackRender({
      apiKey: "k".repeat(40), environment: "v1", edit: buildShotstackEdit(manifest),
      fetcher: async () => new Response(JSON.stringify({ error: { code: "invalid_clip", message: "Unsupported field token=do-not-persist", request_id: "provider-request-7", path: "timeline.tracks[4].clips[0].asset" }, secret: "must-not-persist" }), { status: 400 }),
    }),
    (error: unknown) => {
      captured = error;
      return error instanceof ShotstackProviderError && error.httpStatus === 400 && error.providerCode === "invalid_clip"
        && error.providerRequestId === "provider-request-7" && error.providerValidationPath === "timeline.tracks[4].clips[0].asset"
        && error.providerMessage?.includes("[redacted]") === true && !JSON.stringify(error.sanitizedResponseBody).includes("must-not-persist");
    },
  );
  assert.equal((captured as ShotstackProviderError).occurredAt.length > 0, true);
});

test("BMKT-007 inspects Edit then Serve and accepts only the Shotstack CDN", async () => {
  const responses = [
    new Response(JSON.stringify({ response: { status: "done" } }), { status: 200 }),
    new Response(JSON.stringify({ data: [{ attributes: { id: "asset-1", renderId: "render-1", filename: "render-1.mp4", url: "https://cdn.shotstack.io/au/stage/owner/render-1.mp4", status: "ready", filesize: 1200 } }] }), { status: 200 }),
  ];
  const result = await inspectShotstackRender({ apiKey: "k".repeat(40), environment: "stage", providerRequestId: "render-1", fetcher: async () => responses.shift()! });
  assert.equal(result.status, "succeeded");
  assert.equal(result.asset?.id, "asset-1");

  const hostile = [
    new Response(JSON.stringify({ response: { status: "done" } }), { status: 200 }),
    new Response(JSON.stringify({ data: [{ attributes: { id: "asset-2", renderId: "render-2", filename: "render-2.mp4", url: "https://evil.example/video.mp4", status: "ready" } }] }), { status: 200 }),
  ];
  await assert.rejects(inspectShotstackRender({ apiKey: "k".repeat(40), environment: "stage", providerRequestId: "render-2", fetcher: async () => hostile.shift()! }), ShotstackProviderError);
});

test("BMKT-007 route stays owner-scoped, idempotent, bounded, private, and unpublished", () => {
  const route = readFileSync("src/app/api/admin/beast-marketing/video/render/route.ts", "utf8");
  const panel = readFileSync("src/app/dashboard/admin/marketing/VideoGrowthEnginePanel.tsx", "utf8");
  assert.match(route, /profile\?\.role === "admin"/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(route, /idempotencyKey/);
  assert.match(route, /manualCredentialRemediation/);
  assert.match(route, /qualityRemediation/);
  assert.match(route, /narrationNormalization/);
  assert.match(route, /controlTokenRemediation/);
  assert.match(route, /shotstackWatermarkPolicy/);
  assert.match(route, /SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER/);
  assert.match(route, /upsert: false/);
  assert.match(route, /beast-marketing-media/);
  assert.match(route, /createSignedUrl/);
  assert.match(route, /youtubeDestination: false/);
  assert.doesNotMatch(route, /youtube\.googleapis|upload\/youtube|automaticRetry: true/i);
  assert.match(panel, /Generate internal Shotstack render/);
  assert.match(panel, /Generate pronunciation-validation render/);
  assert.match(panel, /Generate clean-output validation render/);
  assert.match(panel, /Sandbox watermarks are test-only/);
  assert.match(panel, /no automatic retry/i);
  assert.match(panel, /no YouTube destination/i);
});
