import assert from "node:assert/strict";
import test from "node:test";
import { buildProductionManifest, type ProductionAsset, type ProductionManifest } from "../src/lib/beastMarketingProduction";
import { buildStaticContainVisualPlan, buildVisualBeatPlan, containDimensions, evaluateProductionQuality, resolveVisualAssetId, validateVisualAsset } from "../src/lib/beastMarketingQuality";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";

const asset = (id: string, topic: string): ProductionAsset => ({
  id, role: "visual", uri: `https://news.seangworld.com/marketing/visuals/${id}.jpg`, mimeType: "image/jpeg", sourceType: "first_party",
  providerId: null, license: "Owner-authorized public capture", contentHash: `sha256:${"a".repeat(64)}`,
  createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, topics: [topic], width: 1080, height: 1920,
});

function sixSceneManifest(assetIds: string[]): ProductionManifest {
  const durations = [3_000, 4_200, 4_200, 4_200, 4_200, 4_200];
  let cursor = 0;
  const scenes = assetIds.map((visualAssetId, index) => ({
    id: `scene-${index + 1}`, startMs: cursor, endMs: (cursor += durations[index]),
    narration: index === 0 ? "A clear opening hook starts this useful story now." : index === assetIds.length - 1 ? "Visit SEANGWORLD today for the complete story and more." : `Useful story beat ${index} gives viewers clear context and an actionable next step.`,
    visualBrief: index === 0 ? "Opening hook" : index === assetIds.length - 1 ? "Branded CTA end card" : "Supporting visual",
    visualAssetId, transition: index === 0 ? "cut" as const : "crossfade" as const,
    captions: [{ startMs: cursor - durations[index], endMs: cursor, text: index === 0 ? "A clear opening hook." : "Useful story beat." }],
  }));
  return {
    ...buildProductionManifest({ jobId: "quality-job", revision: 1, settings: { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 }, script: { hook: "A clear opening hook.", narration: ["Useful story beat 1.", "Useful story beat 2.", "Useful story beat 3.", "Useful story beat 4."], cta: "Visit SEANGWORLD today.", estimatedSeconds: 24 } }),
    runtimeMs: 24_000, scenes, assets: assetIds.map((id, index) => asset(id, index === 2 ? "health" : "news")), requireVisuals: true,
  };
}

test("BMKT-010 plans multiple bounded beats with deterministic motion and semantic asset fallback", () => {
  const manifest = sixSceneManifest(["one", "two", "three", "four", "five", "six"]);
  const plan = buildVisualBeatPlan(manifest, { maxBeatDurationMs: 2_000 });
  assert.equal(plan.version, "bmkt-visual-plan-1");
  assert.ok(plan.beats.length > manifest.scenes.length);
  assert.equal(plan.beats[0].motion, "reveal");
  assert.ok(plan.beats.every((beat) => beat.endMs - beat.startMs <= 2_000));
  const unbound = { ...manifest.scenes[2], narration: "Health story beat.", visualAssetId: undefined };
  assert.equal(resolveVisualAssetId(unbound, manifest.assets), "three");
});

test("BMKT-010 rotates ranked semantic candidates inside long scenes", () => {
  const manifest = sixSceneManifest(["one", "two", "three", "four", "five", "six"]);
  manifest.scenes[1] = { ...manifest.scenes[1], visualAssetId: undefined, visualBrief: "health story" };
  manifest.assets.push(asset("health-alt", "health"));
  const plan = buildVisualBeatPlan(manifest, { maxBeatDurationMs: 2_000 });
  const sceneBeats = plan.beats.filter((beat) => beat.sceneId === "scene-2");
  assert.ok(sceneBeats.length > 1);
  assert.notEqual(sceneBeats[0].visualAssetId, sceneBeats[1].visualAssetId);
});

test("BMKT-010 quality gate holds repetitive low-density plans before provider submission", () => {
  const manifest = sixSceneManifest(["one", "one", "one", "one", "one", "one"]);
  const report = evaluateProductionQuality(manifest, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 }, { plan: buildVisualBeatPlan(manifest, { maxBeatDurationMs: 4_500 }) });
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((item) => /variety/i.test(item)));
  assert.ok(report.blockers.some((item) => /adjacent/i.test(item)));
  assert.ok(report.metrics.maxStaticIntervalMs >= 24_000);
});

test("BMKT-010 quality gate accepts varied, paced, provenance-backed plans", () => {
  const manifest = sixSceneManifest(["one", "two", "three", "four", "five", "six"]);
  const report = evaluateProductionQuality(manifest, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 }, { plan: buildVisualBeatPlan(manifest, { maxBeatDurationMs: 4_500 }) });
  assert.equal(report.ready, true);
  assert.equal(report.metrics.uniqueVisualRatio, 1);
  assert.equal(report.metrics.adjacentVisualRepeats, 0);
  assert.ok(report.metrics.ctaDurationMs >= 4_000);
});

test("BMKT-010 generated and licensed visuals require an authorized provider or license", () => {
  const generated = asset("generated", "news");
  generated.sourceType = "generated"; generated.providerId = "existing-image-provider"; generated.authorized = true;
  assert.equal(validateVisualAsset(generated).valid, true);
  generated.authorized = false;
  assert.equal(validateVisualAsset(generated).valid, false);
  const licensed = asset("licensed", "news");
  licensed.sourceType = "licensed"; licensed.providerId = "existing-media-provider"; licensed.authorized = true; licensed.license = "License reference";
  assert.equal(validateVisualAsset(licensed).valid, true);
});

test("BMKT-010 voice gate rejects flat delivery and accepts energetic conversational controls", () => {
  const manifest = sixSceneManifest(["one", "two", "three", "four", "five", "six"]);
  const plan = buildVisualBeatPlan(manifest, { maxBeatDurationMs: 4_500 });
  const flat = { ...manifest, audioMix: { voiceDelivery: { voice: "Matthew", language: "en-US", style: "calm_explainer" as const, speed: 0.9, newscaster: true, pauseMs: 40, emphasisTerms: [] } } };
  assert.equal(evaluateProductionQuality(flat, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 }, { plan }).ready, false);
  const energetic = { ...manifest, audioMix: { voiceDelivery: { voice: "Matthew", language: "en-US", style: "energetic_conversational" as const, speed: 1.16, newscaster: false, pauseMs: 140, emphasisTerms: ["opening", "story"] } } };
  const report = evaluateProductionQuality(energetic, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 }, { plan });
  assert.equal(report.metrics.voiceStyle, "energetic_conversational");
  assert.equal(report.metrics.voiceEmphasisCount, 2);
  assert.equal(report.blockers.some((item) => /voice delivery speed|newscaster|voice pauses|emphasis/i.test(item)), false);
});

test("BMKT-010 visual presentation remediation preserves complete screenshots with static holds", () => {
  const manifest = sixSceneManifest(["one", "two", "three", "four", "five", "six"]);
  const sourcePlan = buildVisualBeatPlan(manifest, { maxBeatDurationMs: 4_500 });
  const remediated = buildStaticContainVisualPlan({ ...manifest, visualPlan: sourcePlan });
  assert.deepEqual(remediated.beats.map((beat) => beat.visualAssetId), sourcePlan.beats.map((beat) => beat.visualAssetId));
  assert.deepEqual(remediated.beats.map((beat) => [beat.startMs, beat.endMs]), sourcePlan.beats.map((beat) => [beat.startMs, beat.endMs]));
  assert.ok(remediated.beats.every((beat) => beat.motion === "static" && beat.fit === "contain" && beat.captionSafe));
  assert.equal(remediated.beats[0].transition, "cut");
  assert.ok(remediated.beats.slice(1).every((beat) => beat.transition === "crossfade"));
  const report = evaluateProductionQuality({ ...manifest, visualPlan: remediated }, { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 24, maximumRuntimeSeconds: 24 });
  assert.equal(report.ready, true);
});

test("BMKT-010 contain bounds preserve News capture aspect ratios", () => {
  assert.deepEqual(containDimensions(1537, 1196), { width: 1080, height: 840, scale: 1080 / 1537 });
  assert.deepEqual(containDimensions(1348, 926), { width: 1080, height: 742, scale: 1080 / 1348 });
  assert.deepEqual(containDimensions(1537, 283), { width: 1080, height: 199, scale: 1080 / 1537 });
});
