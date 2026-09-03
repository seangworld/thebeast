import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";
import { buildProductionManifest } from "../src/lib/beastMarketingProduction";
import {
  BEAST_PRONUNCIATION_MAP,
  normalizeBeastDisplayNames,
  normalizeBeastNarrationForSpeech,
  normalizeBeastNarrationSegmentsForSpeech,
} from "../src/lib/beastMarketingNarration";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  SHOTSTACK_APP_SCREENSHOT_BASE_URL,
  SHOTSTACK_NARRATOR,
  ShotstackProviderError,
  buildShotstackNarration,
  buildShotstackEdit,
  estimateShotstackCredits,
  inspectShotstackRender,
  nextShotstackManualAttempt,
  shotstackConfiguration,
  shotstackEnvironment,
  shotstackWatermarkPolicy,
  shotstackVisualAssetBaseUrl,
  submitShotstackRender,
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

test("BMKT-007 builds current Shotstack faceless composition without a destination", () => {
  const edit = buildShotstackEdit(manifest);
  const serialized = JSON.stringify(edit);
  assert.deepEqual(edit.output, { format: "mp4", size: { width: 1080, height: 1920 } });
  assert.match(serialized, /rich-text/);
  assert.doesNotMatch(serialized, /rich-caption/);
  assert.match(serialized, /alias:\/\/bmkt-narration-1/);
  assert.match(serialized, /text-to-speech/);
  assert.match(serialized, /"vertical":"middle"/);
  assert.doesNotMatch(serialized, /"vertical":"center"/);
  assert.doesNotMatch(serialized, /"preset":"fade"/);
  assert.match(serialized, /"type":"image"/);
  assert.match(serialized, /marketing\/video-growth\/ai-specialists-mobile\.png/);
  assert.match(serialized, /"effect":"(?:zoomInFast|slideLeftFast|zoomOutFast|slideUpFast|slideRightFast|slideDownFast)"/);
  assert.deepEqual(SHOTSTACK_NARRATOR, { voice: "Joey", language: "en-US", newscaster: false, speed: 1 });
  assert.match(serialized, /"voice":"Joey"/);
  assert.match(serialized, /"newscaster":false/);
  assert.doesNotMatch(serialized, /youtube|destinations|webhook|callback/i);
  assert.doesNotMatch(serialized, /api[_-]?key|secret|token/i);
});

test("BMKT-007 uses an immutable HTTPS source for public app screenshots", () => {
  assert.match(SHOTSTACK_APP_SCREENSHOT_BASE_URL, /^https:\/\/raw\.githubusercontent\.com\/seangworld\/thebeast\/[a-f0-9]{40}\/public\/$/);
  assert.equal(shotstackVisualAssetBaseUrl("https://assets.example/app-screens"), "https://assets.example/app-screens/");
  assert.throws(() => shotstackVisualAssetBaseUrl("http://unsafe.example"), ShotstackProviderError);
});

test("BMKT-007 chooses privacy-safe app screenshots that match scene subjects", () => {
  const subjectManifest = structuredClone(manifest);
  subjectManifest.scenes[0].narration = "BeastMoney helps organize bills.";
  subjectManifest.scenes[1].narration = "The AI Tutor supports learning.";
  subjectManifest.scenes[2].narration = "BeastHealth organizes health context.";
  const edit = buildShotstackEdit(subjectManifest, { visualAssetBaseUrl: "https://assets.example/public/" });
  const serialized = JSON.stringify(edit);
  for (const asset of ["money-coach-mobile.png", "tutor-mobile.png", "health-advisor-mobile.png"]) assert.match(serialized, new RegExp(asset.replace(".", "\\.")));
  assert.doesNotMatch(serialized, /dashboard|owner|member-record|token|secret/i);
});

test("BMKT-007 normalizes pronunciation only at the TTS boundary", () => {
  const beastOSManifest = buildProductionManifest({
    jobId: "job-beastos", revision: 1,
    script: { hook: "What is beastos?", narration: ["BeastOS connects AI specialists."], cta: "Visit SEANGWORLD.COM.", estimatedSeconds: 30 },
    settings: { ...defaultVideoSeriesSettings, minimumRuntimeSeconds: 30, maximumRuntimeSeconds: 30 },
  });
  const edit = buildShotstackEdit(beastOSManifest);
  const tracks = edit.timeline.tracks;
  const tts = tracks.flatMap((track) => track.clips).find((clip) => clip.alias === "bmkt-narration-1")!;
  assert.match(JSON.stringify(tts), /Beast O S/);
  assert.doesNotMatch(JSON.stringify(tts), /BeastOS|beastos/);
  const visible = JSON.stringify(tracks.flatMap((track) => track.clips).filter((clip) => (clip.asset as Record<string, unknown>)?.type !== "text-to-speech"));
  assert.match(visible, /BeastOS/);
  assert.doesNotMatch(visible, /Beast O S/);
});

test("BMKT-007 makes legacy template narration conversational without changing facts", () => {
  const legacy = structuredClone(manifest);
  legacy.scenes[0].narration = "What should you know about BeastOS before you act?";
  legacy.scenes.at(-1)!.narration = "For the relevant tools and current details, visit SEANGWORLD.COM.";
  const edit = buildShotstackEdit(legacy);
  const tts = edit.timeline.tracks.flatMap((track) => track.clips).filter((clip) => String(clip.alias || "").startsWith("bmkt-narration-"));
  const spoken = tts.map((clip) => String((clip.asset as Record<string, unknown>).text)).join(" ");
  assert.match(spoken, /^Here is the useful part about Beast O S\./);
  assert.match(spoken, /Want to see the tools for yourself\? Visit Sean G World dot com\.$/);
  assert.match(spoken, /verify the result before relying on it/);
  assert.doesNotMatch(spoken, /before you act|relevant tools and current details/i);
});

test("BMKT-007 turns the BeastOS specialist proof into a short marketing spot", () => {
  const specialistManifest = buildProductionManifest({
    jobId: "job-specialist-spot", revision: 1,
    script: {
      hook: "What should you know about BeastOS before you act?",
      narration: [
        "The Money Coach explains authorized financial records, forecasts, and tradeoffs.",
        "The Guidance Counselor connects learner goals and progress to grounded directions.",
        "The AI Tutor explains schoolwork and guides practice.",
        "The Health Advisor organizes authorized health information and appointment questions.",
      ],
      cta: "Visit The Beast AI Specialists.", estimatedSeconds: 63,
    },
    settings: defaultVideoSeriesSettings,
  });
  const spoken = buildShotstackNarration(specialistManifest);
  assert.ok(spoken.split(/\s+/).length < 85);
  assert.match(spoken, /^What if your tools actually knew their lane\?/);
  assert.match(spoken, /No hidden authority\. No fake certainty\./);
  assert.doesNotMatch(spoken, /before you act|published assessments|environment-bound/i);
  const edit = buildShotstackEdit(specialistManifest);
  const clips = edit.timeline.tracks.flatMap((track) => track.clips);
  const captions = clips.filter((clip) => (clip.asset as Record<string, unknown>)?.type === "rich-text" && String((clip.asset as Record<string, unknown>).text) !== "BeastOS  ·  THE BEAST");
  assert.equal(captions.length, 9);
  assert.equal(captions[0].start, "alias://bmkt-narration-1");
  assert.equal(captions[0].length, "alias://bmkt-narration-1");
  assert.match(JSON.stringify(captions), /Meet BeastOS\./);
  assert.equal(edit.output.range, undefined);
  assert.match(JSON.stringify(edit), /BeastOS  ·  THE BEAST/);
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

test("BMKT-007 strips spoken control labels at every legacy manifest scene boundary", () => {
  const legacyManifest = structuredClone(manifest);
  legacyManifest.scenes[0].narration = "START HERE: BeastOS connects focused tools.";
  legacyManifest.scenes[1].narration = "NEXT: BeastMoney supports financial organization.";
  legacyManifest.scenes[2].narration = "SCENE 3 — CONTINUE: Visit SEANGWORLD.COM.";
  legacyManifest.scenes[3].narration = "TRANSITION: Learn more at SEANGWORLD.";
  const speech = normalizeBeastNarrationSegmentsForSpeech(legacyManifest.scenes.map((scene) => scene.narration));
  assert.equal(speech, "Beast O S connects focused tools. Beast Money supports financial organization. Visit Sean G World dot com. Learn more at Sean G World.");
  assert.doesNotMatch(speech, /\b(?:NEXT|SCENE|CONTINUE|TRANSITION|START HERE|CUT TO)\b/i);
  const edit = buildShotstackEdit(legacyManifest);
  const tts = edit.timeline.tracks.flatMap((track) => track.clips).filter((clip) => String(clip.alias || "").startsWith("bmkt-narration-"));
  assert.equal(tts.map((clip) => String((clip.asset as Record<string, unknown>).text)).join(" "), speech);
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
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 7, status: "succeeded", errorCategory: null, providerRequestId: "render-7" }), 8);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 8, status: "succeeded", errorCategory: null, providerRequestId: "render-8" }), 9);
  assert.equal(nextShotstackManualAttempt({ attemptNumber: 9, status: "succeeded", errorCategory: null, providerRequestId: "render-9" }), null);
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
  assert.match(route, /spokenControlTokenRemediation/);
  assert.match(route, /creativeTimingRemediation/);
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
  assert.match(panel, /Generate spoken-label correction render/);
  assert.match(panel, /Generate dynamic marketing correction/);
  assert.match(panel, /Sandbox watermarks are test-only/);
  assert.match(panel, /no automatic retry/i);
  assert.match(panel, /no YouTube destination/i);
});
