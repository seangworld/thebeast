import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bindNarrationTimingEvidence, buildProductionManifest, fingerprintProductionManifest, validateProductionManifest, type NarrationTimingEvidence } from "../src/lib/beastMarketingProduction";
import { bindNewsAcceptance2Revision6Visuals, bindNewsAcceptance2Revision7Visuals, bindNewsAcceptance2Visuals, bindNewsTestVisuals, newsAcceptance2Captures, newsTestCaptures, newsAcceptance2Revision6Script, newsAcceptance2Script } from "../src/lib/beastMarketingNewsVisualTest";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";
import { evaluateProductionQuality } from "../src/lib/beastMarketingQuality";

const source = () => buildProductionManifest({ jobId: "new-test-job", revision: 1, settings: defaultVideoSeriesSettings,
  script: { hook: "What should you know about SEANGWORLD News?", narration: ["Headlines show the source and timing information before you open each story.", "Use Local View to choose a covered area such as Elizabeth City.", "Choose a topic or browse states and cities to find coverage.", "Open the source reporting to read the full story and form your own view."], cta: "Visit SEANGWORLD News.", estimatedSeconds: 62 } });

test("News test binds all six scenes, retains narration, and changes the exact plan fingerprint", () => {
  const original = source(); const before = JSON.stringify(original);
  const bound = bindNewsTestVisuals(original);
  assert.equal(JSON.stringify(original), before);
  assert.equal(bound.requireVisuals, true);
  assert.equal(bound.brandLabel, "SEANGWORLD NEWS");
  assert.equal(bound.scenes.filter((scene) => scene.visualAssetId).length, 6);
  assert.deepEqual(bound.scenes.map((scene) => scene.narration), original.scenes.map((scene) => scene.narration));
  assert.notEqual(bound.checksum, original.checksum);
  assert.equal(fingerprintProductionManifest(bound).checksum, bound.checksum);
  assert.equal(bound.runtimeMs, 62000);
});

test("News test captions preserve all words with bounded contiguous phrase timing", () => {
  for (const scene of bindNewsTestVisuals(source()).scenes) {
    assert.equal(scene.captions.map((cue) => cue.text).join(" "), scene.narration);
    assert.equal(scene.captions[0].startMs, scene.startMs);
    assert.equal(scene.captions.at(-1)?.endMs, scene.endMs);
    scene.captions.forEach((cue, index) => {
      assert.ok(cue.text.split(/\s+/).length <= 6);
      assert.ok(cue.endMs > cue.startMs);
      if (index) assert.equal(cue.startMs, scene.captions[index - 1].endMs);
    });
  }
});

test("bundled News captures match recorded SHA-256 bytes and JPEG signatures", () => {
  for (const asset of newsTestCaptures) {
    const bytes = readFileSync(`public${new URL(asset.uri!).pathname}`);
    assert.equal(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, asset.contentHash);
    assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff");
  }
});

test("Acceptance Test #2 captures match supplied SHA-256 bytes, use PNG signatures, and exclude the privacy capture", () => {
  assert.equal(newsAcceptance2Captures.length, 8);
  assert.equal(newsAcceptance2Captures.some((asset) => asset.id.includes("privacy")), false);
  for (const asset of newsAcceptance2Captures) {
    const bytes = readFileSync(`public${new URL(asset.uri!).pathname}`);
    assert.equal(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, asset.contentHash);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(asset.sourceType, "first_party");
    assert.equal(asset.authorized, true);
    assert.equal(asset.provenanceComplete, true);
  }
});

test("Acceptance Test #2 binds a 45-second varied visual plan with no adjacent repeats", () => {
  const candidate = bindNewsAcceptance2Visuals(buildProductionManifest({ jobId: "acceptance-2", revision: 1, settings: defaultVideoSeriesSettings,
    script: { ...newsAcceptance2Script, narration: [...newsAcceptance2Script.narration] } }));
  assert.equal(candidate.runtimeMs, 45_000);
  assert.equal(candidate.visualPlan?.beats.length, 13);
  const ids = candidate.visualPlan?.beats.map((beat) => beat.visualAssetId) || [];
  assert.equal(new Set(ids).size, 10);
  assert.equal(ids.filter((id, index) => index > 0 && id === ids[index - 1]).length, 0);
  assert.equal(candidate.assets.length, newsTestCaptures.length + newsAcceptance2Captures.length);
  const quality = evaluateProductionQuality(candidate, defaultVideoSeriesSettings);
  assert.equal(quality.ready, true);
  assert.ok(quality.score >= 90);
  assert.deepEqual(quality.blockers, []);
  assert.deepEqual(quality.warnings, []);
});

test("News-specific visuals cannot be silently used on unrelated scripts or layouts", () => {
  const wrong = source(); wrong.scenes[0].narration = "Try a banking technique.";
  assert.throws(() => bindNewsTestVisuals(wrong));
  assert.throws(() => bindNewsTestVisuals({ ...source(), aspectRatio: "16:9" }));
  assert.throws(() => bindNewsTestVisuals({ ...source(), scenes: source().scenes.slice(1) }));
});

test("Acceptance Test #2 Revision 6 is a 61.5-second static contain cut with synchronized captions", () => {
  const planned = buildProductionManifest({ jobId: "acceptance-2-r6", revision: 6, settings: defaultVideoSeriesSettings,
    script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } });
  const candidate = bindNewsAcceptance2Revision6Visuals(planned);
  assert.equal(candidate.runtimeMs, 61_500);
  assert.equal(candidate.visualPlan?.beats.length, 12);
  const beats = candidate.visualPlan?.beats || [];
  assert.equal(beats[0].visualAssetId, "news-test-home");
  assert.equal(beats.at(-1)?.visualAssetId, "news-test-home");
  assert.equal(beats.filter((beat, index) => index > 0 && beat.visualAssetId === beats[index - 1].visualAssetId).length, 0);
  assert.equal(beats.every((beat) => beat.motion === "static" && beat.fit === "contain"), true);
  assert.equal(beats.every((beat) => beat.transition === "cut" || beat.transition === "crossfade"), true);
  assert.equal(beats.every((beat) => candidate.assets.find((asset) => asset.id === beat.visualAssetId)?.sourceType === "first_party"), true);
  assert.equal(beats.some((beat) => beat.visualAssetId === "privacy-policy-exclude-from-test"), false);
  for (const scene of candidate.scenes) {
    assert.ok(scene.captions.length > 0);
    scene.captions.forEach((cue, index) => {
      assert.ok(cue.startMs >= scene.startMs && cue.endMs <= scene.endMs && cue.endMs > cue.startMs);
      assert.ok(cue.text.split(/\s+/).length <= 6);
      if (index) assert.equal(cue.startMs, scene.captions[index - 1].endMs);
    });
  }
  assert.equal(candidate.monetizationOriented, true);
  assert.equal(candidate.syncVerificationRequired, true);
  assert.equal(candidate.syncMethod, "narration_derived_calibrated");
  const quality = evaluateProductionQuality(candidate, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 60, maximumRuntimeSeconds: 61.5 });
  assert.equal(quality.ready, true);
  assert.equal(quality.score, 100);
  assert.deepEqual(quality.blockers, []);
  assert.equal(quality.metrics.maxStaticIntervalMs, 5_500);
  assert.equal(quality.metrics.hookBeatDurationMs, 1_500);
  assert.equal(quality.metrics.ctaDurationMs, 5_500);
  assert.equal(quality.metrics.plannedNarrationWpm, 134.6);
});

test("monetization candidates fail closed below the 60-second runtime floor", () => {
  const candidate = bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "acceptance-2-r6-gate", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } }));
  const short = { ...candidate, runtimeMs: 59_999, scenes: candidate.scenes.map((scene, index, scenes) => index === scenes.length - 1 ? { ...scene, endMs: 59_999 } : scene) };
  const validation = validateProductionManifest(short, defaultVideoSeriesSettings);
  assert.equal(validation.errors.some((error) => /Monetization-oriented candidates require a runtime of at least 60 seconds/.test(error)), true);
});

test("Acceptance Test #2 Revision 7 requires and binds actual narration timing evidence", () => {
  const source = bindNewsAcceptance2Revision6Visuals(buildProductionManifest({ jobId: "acceptance-2-r7", revision: 6, settings: defaultVideoSeriesSettings, script: { ...newsAcceptance2Revision6Script, narration: [...newsAcceptance2Revision6Script.narration] } }));
  const candidate = bindNewsAcceptance2Revision7Visuals(source);
  assert.equal(candidate.runtimeMs, 61_500);
  assert.equal(candidate.timingEvidenceRequired, true);
  assert.equal(candidate.visualCadenceProfile, "slow_static");
  assert.equal(candidate.narrationTimingEvidence, undefined);
  const qualityBefore = evaluateProductionQuality(candidate, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 60, maximumRuntimeSeconds: 61.5 });
  assert.equal(qualityBefore.ready, false);
  assert.match(qualityBefore.blockers.join(" "), /Actual narration timing evidence is required/);
  const evidence: NarrationTimingEvidence = {
    providerId: "shotstack", assetId: "tts-acceptance-2-r7", assetUri: "https://cdn.shotstack.io/au/v1/audio-r7.mp3", sourceId: "source-r7", durationMs: 61_500, timingType: "phrase", verifiedAt: "2026-09-11T20:00:00.000Z", syncToleranceMs: 150, maxObservedDriftMs: 0,
    cues: candidate.scenes.flatMap((scene) => scene.captions.map((cue) => ({ sceneId: scene.id, text: cue.text, startMs: cue.startMs, endMs: cue.endMs }))),
  };
  const bound = bindNarrationTimingEvidence(candidate, evidence);
  assert.equal(bound.syncVerificationRequired, false);
  assert.equal(bound.syncMethod, "provider_word_timestamps");
  assert.deepEqual(bound.narrationTimingEvidence, evidence);
  const qualityAfter = evaluateProductionQuality(bound, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 60, maximumRuntimeSeconds: 61.5 });
  assert.equal(qualityAfter.ready, true);
  assert.equal(qualityAfter.metrics.timingEvidenceBound, true);
  assert.equal(qualityAfter.metrics.maxObservedDriftMs, 0);
  assert.equal(qualityAfter.metrics.syncToleranceMs, 150);
  assert.equal(qualityAfter.metrics.staticIntervalLimitMs, 7_500);
});
