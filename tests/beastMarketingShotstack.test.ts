import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultVideoSeriesSettings } from "../src/lib/beastMarketingVideo";
import { buildProductionManifest } from "../src/lib/beastMarketingProduction";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  ShotstackProviderError,
  buildShotstackEdit,
  estimateShotstackCredits,
  inspectShotstackRender,
  shotstackConfiguration,
  shotstackEnvironment,
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
  assert.match(serialized, /rich-caption/);
  assert.match(serialized, /text-to-speech/);
  assert.match(serialized, /alias:\/\/bmkt-narration/);
  assert.doesNotMatch(serialized, /youtube|destinations|webhook|callback/i);
  assert.doesNotMatch(serialized, /api[_-]?key|secret|token/i);
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
  assert.match(route, /SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER/);
  assert.match(route, /upsert: false/);
  assert.match(route, /beast-marketing-media/);
  assert.match(route, /createSignedUrl/);
  assert.match(route, /youtubeDestination: false/);
  assert.doesNotMatch(route, /youtube\.googleapis|upload\/youtube|automaticRetry: true/i);
  assert.match(panel, /Generate internal Shotstack render/);
  assert.match(panel, /no automatic retry/i);
  assert.match(panel, /no YouTube destination/i);
});
