import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildProductionManifest, fingerprintProductionManifest } from "../src/lib/beastMarketingProduction";
import { bindNewsTestVisuals, newsTestCaptures } from "../src/lib/beastMarketingNewsVisualTest";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";

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

test("News-specific visuals cannot be silently used on unrelated scripts or layouts", () => {
  const wrong = source(); wrong.scenes[0].narration = "Try a banking technique.";
  assert.throws(() => bindNewsTestVisuals(wrong));
  assert.throws(() => bindNewsTestVisuals({ ...source(), aspectRatio: "16:9" }));
  assert.throws(() => bindNewsTestVisuals({ ...source(), scenes: source().scenes.slice(1) }));
});
