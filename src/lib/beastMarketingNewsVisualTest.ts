import { fingerprintProductionManifest, type ProductionAsset, type ProductionManifest } from "./beastMarketingProduction";
import { buildShotstackEdit } from "./beastMarketingShotstack";

// Real public product captures, not invented interfaces or private admin screens.
// SHA-256 is verified against the bundled bytes by the release tests.
export const newsTestCaptures: ProductionAsset[] = [
  { id: "news-test-home", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-test-home-20260910.jpg", mimeType: "image/jpeg", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD product walkthrough capture", contentHash: "sha256:1e33d06877069f173c87e15694f6d75c623eea515690a27925a56ae54a236cee", createdAt: "2026-09-10T01:07:00Z", provenanceComplete: true },
  { id: "news-test-local", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-test-local-20260910.jpg", mimeType: "image/jpeg", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD product walkthrough capture", contentHash: "sha256:0e07cfdfa198b76f4c4c11a47b3615766d773db55fd8bae227acbcac83ba09d6", createdAt: "2026-09-10T01:26:00Z", provenanceComplete: true },
];

/** Explicit one-off walkthrough template, never a generic visual auto-selector. */
export function bindNewsTestVisuals(source: ProductionManifest): ProductionManifest {
  if (source.scenes.length !== 6 || source.aspectRatio !== "9:16"
    || !/SEANGWORLD News/i.test(source.scenes[0].narration)
    || !/Local View/i.test(source.scenes[2].narration)) {
    throw new Error("The News visual test requires the six-scene News walkthrough script.");
  }
  const assignments = [0, 1, 1, 1, 1, 0];
  const scenes = source.scenes.map((scene, index) => {
    const tokens = scene.narration.trim().split(/\s+/);
    const captions = [];
    for (let offset = 0; offset < tokens.length; offset += 6) {
      const end = Math.min(offset + 6, tokens.length);
      captions.push({
        text: tokens.slice(offset, end).join(" "),
        startMs: scene.startMs + Math.round((scene.endMs - scene.startMs) * offset / tokens.length),
        endMs: scene.startMs + Math.round((scene.endMs - scene.startMs) * end / tokens.length),
      });
    }
    return { ...scene, visualAssetId: newsTestCaptures[assignments[index]].id, captions };
  });
  const result = fingerprintProductionManifest({ ...source, scenes, assets: newsTestCaptures.map((asset) => ({ ...asset })), requireVisuals: true, brandLabel: "SEANGWORLD NEWS" });
  buildShotstackEdit(result); // Local validation only; no provider request or charge.
  return result;
}
