import { fingerprintProductionManifest, type ProductionAsset, type ProductionManifest, type VisualPlan } from "./beastMarketingProduction";
import { buildShotstackEdit } from "./beastMarketingShotstack";
import { buildVisualBeatPlan } from "./beastMarketingQuality";

// Real public product captures, not invented interfaces or private admin screens.
// SHA-256 is verified against the bundled bytes by the release tests.
export const newsTestCaptures: ProductionAsset[] = [
  { id: "news-test-home", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-test-home-20260910.jpg", mimeType: "image/jpeg", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD product walkthrough capture", contentHash: "sha256:1e33d06877069f173c87e15694f6d75c623eea515690a27925a56ae54a236cee", createdAt: "2026-09-10T01:07:00Z", provenanceComplete: true },
  { id: "news-test-local", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-test-local-20260910.jpg", mimeType: "image/jpeg", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD product walkthrough capture", contentHash: "sha256:0e07cfdfa198b76f4c4c11a47b3615766d773db55fd8bae227acbcac83ba09d6", createdAt: "2026-09-10T01:26:00Z", provenanceComplete: true },
];

// Owner-supplied public News interface captures for Acceptance Test #2. The
// paths are immutable first-party assets; no private BeastAdmin screens are
// included. Hashes below are checked against the committed bytes in tests.
export const newsAcceptance2Captures: ProductionAsset[] = [
  { id: "news-acceptance2-home-top-story", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-home-top-story-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:36e632879e2d3e98e02ab1603363a8aa76a27ab98643aed75c2fc70df08ecf77", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["home", "top story", "headlines", "source", "timestamp"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-world-view", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-world-view-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:1bc32753566a16d537bcadfc3fa82a074daa93b01e9d8c7954b2f40fc8a95ff3", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["world", "global", "headlines", "coverage"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-usa-hampton-roads", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-usa-hampton-roads-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:bea472e7ddb656e17bfcb96ad67823be1cf800b6284ed05c7f09aef852a19a0c", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["USA", "Hampton Roads", "local", "headlines"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-politics-view", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-politics-view-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:0494581cb909139d50cb7bf86c285dc6b651298964b876fb5a99c46ee8a49f57", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["politics", "state", "Chesapeake", "topic", "local"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-scotus", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-scotus-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:c116c8450a83e0b4fe6df226cdb2ae5ce43c34173c198e4515a23805fb7a0de6", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["SCOTUS", "court", "source reporting", "Fact Brief"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-military", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-military-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:86a67f8127cabe89eb50273e2dff6fca135586c6d177ba64d796bd454475aba6", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["military", "topic", "USA", "official sources"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-methodology", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-methodology-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:8d28d56fb8225778f00fdf4f058e4037cabba4286a6562fb440985acc627b0e7", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["methodology", "trust", "evidence", "Fact Brief", "sources"], width: 1537, height: 1196, focalPoint: { x: 0.5, y: 0.5 } },
  { id: "news-acceptance2-coverage-sources", role: "product_capture", uri: "https://thebeast.seangworld.com/marketing/visuals/news-acceptance2-coverage-sources-20260910.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public SEANGWORLD News interface capture", contentHash: "sha256:eb95f3031f8bfea6883f99bdde4fab0b4edaacc9028adbc2a1faa12d53aff5a3", createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true, authorized: true, topics: ["coverage", "sources", "geography", "source attribution"], width: 1537, height: 283, focalPoint: { x: 0.5, y: 0.5 } },
];

const phraseCaptions = (text: string, startMs: number, endMs: number) => {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const cues = [] as ProductionManifest["scenes"][number]["captions"];
  for (let offset = 0; offset < tokens.length; offset += 6) {
    const end = Math.min(tokens.length, offset + 6);
    cues.push({ text: tokens.slice(offset, end).join(" "), startMs: startMs + Math.round((endMs - startMs) * offset / tokens.length), endMs: startMs + Math.round((endMs - startMs) * end / tokens.length) });
  }
  return cues;
};

/** Revised 45-second walkthrough script used only for zero-cost Acceptance Test #2 preparation. */
export const newsAcceptance2Script = {
  hook: "What can SEANGWORLD News show you before you open a story?",
  narration: [
    "See current headlines with source names, timestamps, and clear links before you open any story, so the context is clear.",
    "Switch Local View to Elizabeth City and keep local coverage beside the wider report, in one glance, side by side.",
    "Browse World, USA, state, city, and topic views to narrow the coverage you need without losing context, fast.",
    "Open source reporting and Fact Brief areas to review context, method, and what is known before deciding what matters, clearly.",
  ],
  cta: "Visit SEANGWORLD News for fact-focused coverage, clear sourcing, no opinion, and no fluff, every day.",
  estimatedSeconds: 45,
} as const;

/** Build the expanded, provenance-bound candidate without contacting any provider. */
export function bindNewsAcceptance2Visuals(source: ProductionManifest): ProductionManifest {
  if (source.scenes.length !== 6 || source.runtimeMs !== 45_000 || source.aspectRatio !== "9:16") throw new Error("Acceptance Test #2 requires the revised 45-second, six-scene 9:16 News walkthrough.");
  const assets = [...newsTestCaptures, ...newsAcceptance2Captures].map((asset) => ({ ...asset }));
  const sceneDurations = [1_500, 9_000, 10_000, 9_000, 10_000, 5_500];
  const sceneIds = assets.map((asset) => asset.id);
  const assignments = [sceneIds[2], sceneIds[2], sceneIds[4], sceneIds[1], sceneIds[6], sceneIds[2]];
  let cursor = 0;
  const scenes = source.scenes.map((scene, index) => {
    const startMs = cursor;
    const endMs = cursor + sceneDurations[index];
    cursor = endMs;
    return { ...scene, startMs, endMs, visualAssetId: assignments[index], captions: phraseCaptions(scene.narration, startMs, endMs) };
  });
  const base = fingerprintProductionManifest({ ...source, scenes, assets, requireVisuals: true, brandLabel: "SEANGWORLD NEWS" });
  return fingerprintProductionManifest({ ...base, visualPlan: buildNewsAcceptance2VisualPlan(base) });
}

/** Use the general planner for timing/motion, then bind the semantic editorial sequence. */
export function buildNewsAcceptance2VisualPlan(manifest: ProductionManifest): VisualPlan {
  const plannerInput = { ...manifest, scenes: manifest.scenes.map((scene) => ({ ...scene, visualAssetId: undefined })) };
  const plan = buildVisualBeatPlan(plannerInput, { maxBeatDurationMs: 4_500 });
  const sequence = ["news-test-home", "news-acceptance2-home-top-story", "news-acceptance2-coverage-sources", "news-acceptance2-usa-hampton-roads", "news-test-local", "news-acceptance2-politics-view", "news-acceptance2-world-view", "news-acceptance2-military", "news-acceptance2-scotus", "news-acceptance2-methodology", "news-acceptance2-coverage-sources", "news-acceptance2-home-top-story", "news-test-home"];
  if (plan.beats.length !== sequence.length) throw new Error("Acceptance Test #2 visual plan requires thirteen deterministic beats.");
  return { ...plan, beats: plan.beats.map((beat, index) => ({ ...beat, visualAssetId: sequence[index], captionSafe: true })) };
}

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
