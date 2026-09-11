import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function fixture(options: { admin?: boolean; existing?: boolean; sourceMissing?: boolean; acceptance2?: boolean; failedAttempt?: boolean } = {}) {
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];
  let inserted: Record<string, unknown> | undefined;
  let updated: Record<string, unknown> | undefined;
  const original = { id: "source", series_id: "series", state: "ready", idempotency_key: "direct-youtube-first-news-walkthrough-20260910", topic: { title: "SEANGWORLD News" }, script: { hook: "What should you know about SEANGWORLD News?", narration: ["Headlines show source attribution and timing.", "Use Local View to choose a listed area.", "Browse by topic, state or city.", "Read the source to form your own view."], cta: "Visit SEANGWORLD News.", estimatedSeconds: 62 } };
  const acceptanceSource = {
    id: "candidate", owner_id: "owner", series_id: "series", state: "scripted", revision: 1, idempotency_key: "news-acceptance2-v1",
    topic: { title: "SEANGWORLD News — Acceptance Test #2", acceptanceTest: 2 },
    script: { hook: "See the story behind the headline.", narration: ["Start with the top stories.", "Move from World to USA and local coverage.", "Check sources and Fact Briefs.", "Visit SEANGWORLD News."], cta: "Visit SEANGWORLD News.", estimatedSeconds: 45 },
    production: { manifest: { schemaVersion: "bmkt-production-1", jobId: "candidate", revision: 1, runtimeMs: 45_000, aspectRatio: "9:16", width: 1080, height: 1920, visualStyle: "faceless_editorial", captionStyle: "high_contrast", presenterProfileId: null, presenterMode: "faceless", scenes: [{ id: "scene-1", startMs: 0, endMs: 45_000, narration: "A grounded product walkthrough.", visualBrief: "Public product capture", visualAssetId: "asset-1", transition: "cut", captions: [{ startMs: 0, endMs: 45_000, text: "A grounded product walkthrough." }] }], assets: [{ id: "asset-1", role: "product_capture", uri: "https://news.seangworld.com/marketing/visuals/acceptance2.png", mimeType: "image/png", sourceType: "first_party", providerId: null, license: "Owner-authorized public product capture", contentHash: `sha256:${"a".repeat(64)}`, createdAt: "2026-09-10T00:00:00Z", provenanceComplete: true }], providerBindings: [], retryPolicy: { maximumAttempts: 1, delaysSeconds: [] }, planState: "planned_provider_blocked", blockers: [], requireVisuals: true, visualPlan: { version: "bmkt-visual-plan-1", maxBeatDurationMs: 4_500, beats: Array.from({ length: 13 }, (_, index) => ({ id: `beat-${index + 1}`, sceneId: "scene-1", startMs: index * 3_000, endMs: (index + 1) * 3_000, visualAssetId: "asset-1", motion: "reveal", transition: "cut", fit: "cover", captionSafe: true })) }, audioMix: { voiceDelivery: { voice: "Matthew", language: "en-US", style: "energetic_conversational", newscaster: false } }, checksum: "fnv1a32:approved" }, shotstackCreditsConsumed: 0 },
    quality: { qualityScore: 100, runtimeSeconds: 45, visualBeatCount: 13, renderReady: false, ownerWorkflowDecision: "pending" },
    provenance: { visualTemplate: "news-acceptance2-v1", acceptanceTest: 2, activeCandidate: true, externalPublishingDisabled: true, youtubePublishingDisabled: true },
  };
  const latestAttempt = { id: "attempt-1", job_id: "candidate", attempt_number: 1, status: "failed", error_category: "validation", provider_request_id: null, evidence: { providerHttpStatus: 400 }, created_at: "2026-09-10T00:00:00.000Z", completed_at: "2026-09-10T00:00:01.000Z" };
  const from = (table: string) => {
    const filters: Record<string, unknown> = {}; queries.push({ table, filters });
    const result = () => {
      if (table === "profiles") return { error: null, data: { role: options.admin === false ? "member" : "admin" } };
      if (table.endsWith("video_series")) return { error: null, data: { settings: {} } };
      if (table.endsWith("video_attempts")) return { error: null, data: options.failedAttempt ? latestAttempt : null };
      if (inserted && !filters.idempotency_key) return { error: null, data: inserted };
      if (filters.idempotency_key) return { error: null, data: options.existing ? { id: "existing" } : null };
      if (options.acceptance2 && filters.id === "candidate") return { error: null, data: acceptanceSource };
      return { error: null, data: options.sourceMissing ? null : original };
    };
    let pendingUpdate: Record<string, unknown> | undefined;
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters[key] = value; if (key === "id" && pendingUpdate && options.acceptance2 && value === "candidate") Object.assign(acceptanceSource, pendingUpdate); return query; },
      order() { return query; },
      limit() { return query; },
      insert(value: Record<string, unknown>) { inserted = value; return query; },
      update(value: Record<string, unknown>) { updated = value; pendingUpdate = value; return query; },
      maybeSingle: async () => result(),
      single: async () => result(),
    };
    return query;
  };
  const client = { from, auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } };
  const exports: { POST?: (request: Request) => Promise<Response>; PATCH?: (request: Request) => Promise<Response> } = {};
  const code = ts.transpileModule(readFileSync("src/app/api/admin/beast-marketing/video/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(code, { exports, URL, structuredClone, require(name: string) {
    if (name === "next/server") return { NextResponse: { json: (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init) } };
    if (name === "node:crypto") return require(name);
    if (name.endsWith("/supabase/server")) return { createRouteClient: () => client };
    if (name.endsWith("/supabase/service")) return { createBeastFusionPublicationClient() { throw new Error("No service-role elevation allowed in this operation"); } };
    if (name.startsWith("@/lib/beastMarketing")) return require("../src/lib/" + name.split("/").pop());
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { post: exports.POST!, patch: exports.PATCH!, queries, inserted: () => inserted, updated: () => updated, original, acceptanceSource };
}
const request = (origin = "https://thebeast.seangworld.com", kind = "prepare_news_visual_test", id = "source") => new Request("https://thebeast.seangworld.com/api/admin/beast-marketing/video", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ kind, id }) });
const patchRequest = (payload: Record<string, unknown>, origin = "https://thebeast.seangworld.com") => new Request("https://thebeast.seangworld.com/api/admin/beast-marketing/video", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload) });

test("visual preparation denies non-admin and foreign-origin requests before job access", async () => {
  for (const [options, origin] of [[{ admin: false }, "https://thebeast.seangworld.com"], [{}, "https://evil.example"]] as const) {
    const f = fixture(options); assert.equal((await f.post(request(origin))).status, 403);
    assert.equal(f.queries.filter((q) => q.table.endsWith("jobs")).length, 0);
  }
});
test("visual preparation creates a separate owner-scoped unapproved, unscheduled test", async () => {
  const f = fixture(); const original = JSON.stringify(f.original);
  const response = await f.post(request()); assert.equal(response.status, 201, await response.clone().text());
  const job = f.inserted()!;
  assert.equal(job.owner_id, "owner"); assert.notEqual(job.id, "source");
  assert.equal(job.state, "scripted"); assert.equal(job.idempotency_key, "news-visual-test-v1");
  assert.equal((job.quality as Record<string, unknown>).renderReady, false);
  assert.equal((job.quality as Record<string, unknown>).ownerWorkflowDecision, "pending");
  assert.equal(job.scheduled_for, undefined); assert.equal(job.published_identity, undefined);
  assert.equal(JSON.stringify(f.original), original);
  assert.equal((await response.json()).shotstackCreditsConsumed, 0);
  for (const query of f.queries.filter((q) => q.table !== "profiles" && Object.keys(q.filters).length)) assert.equal(query.filters.owner_id, "owner");
});
test("visual preparation returns the retained test without generating another", async () => {
  const f = fixture({ existing: true }); const response = await f.post(request());
  assert.equal(response.status, 200); assert.equal((await response.json()).duplicatePrevented, true);
  assert.equal(f.inserted(), undefined);
});
test("visual preparation cannot clone an unavailable source", async () => {
  const f = fixture({ sourceMissing: true }); assert.equal((await f.post(request())).status, 409);
  assert.equal(f.inserted(), undefined);
});

test("Acceptance Test #2 preparation persists the exact approved candidate without spending credits", async () => {
  const f = fixture(); const response = await f.post(request("https://thebeast.seangworld.com", "prepare_news_acceptance2"));
  assert.equal(response.status, 201, await response.clone().text());
  const job = f.inserted()!;
  assert.equal(job.idempotency_key, "news-acceptance2-v1");
  assert.equal(job.state, "scripted");
  assert.equal((job.topic as Record<string, unknown>).title, "SEANGWORLD News — Acceptance Test #2");
  assert.equal((job.topic as Record<string, unknown>).acceptanceTest, 2);
  assert.equal((job.provenance as Record<string, unknown>).visualTemplate, "news-acceptance2-v1");
  assert.equal((job.provenance as Record<string, unknown>).externalPublishingDisabled, true);
  assert.equal((job.provenance as Record<string, unknown>).youtubePublishingDisabled, true);
  assert.equal((job.quality as Record<string, unknown>).qualityScore, 100);
  assert.equal((job.quality as Record<string, unknown>).runtimeSeconds, 45);
  assert.equal((job.quality as Record<string, unknown>).visualBeatCount, 13);
  assert.equal(((job.production as Record<string, unknown>).estimatedCredits as Record<string, unknown>).estimatedTotal, 1.5);
  assert.equal((job.production as Record<string, unknown>).shotstackCreditsConsumed, 0);
  assert.equal((await response.json()).shotstackCreditsConsumed, 0);
});

test("Acceptance Test #2 preparation is idempotent and never creates a second candidate", async () => {
  const f = fixture({ existing: true }); const response = await f.post(request("https://thebeast.seangworld.com", "prepare_news_acceptance2"));
  assert.equal(response.status, 200); assert.equal((await response.json()).duplicatePrevented, true);
  assert.equal(f.inserted(), undefined);
});

test("Acceptance Test #2 creates an owner-authorized corrected revision without spending credits", async () => {
  const f = fixture({ acceptance2: true, failedAttempt: true });
  const response = await f.post(request("https://thebeast.seangworld.com", "create_corrected_revision", "candidate"));
  assert.equal(response.status, 201, await response.clone().text());
  const job = f.inserted()!;
  assert.equal(job.state, "scripted");
  assert.equal(job.idempotency_key, "news-acceptance2-v1-r2");
  assert.equal(job.revision, 2);
  assert.equal((job.topic as Record<string, unknown>).title, "SEANGWORLD News — Acceptance Test #2 — Revision 2");
  const production = job.production as Record<string, any>;
  assert.equal(production.manifest.revision, 2);
  assert.equal(production.manifest.jobId, job.id);
  assert.equal(production.manifest.runtimeMs, 45_000);
  assert.equal(production.manifest.visualPlan.beats.length, 13);
  assert.equal(production.shotstackCreditsConsumed, 0);
  assert.equal(production.technicalRetry.authorizedByOwner, true);
  assert.equal(production.technicalRetry.maximumAttempts, 1);
  assert.equal(production.technicalRetry.attemptsConsumed, 0);
  assert.match(production.technicalRetry.correction, /documented text-to-speech narration asset/);
  assert.equal(production.technicalRetry.adapterVersion, "0.12.0");
  assert.equal(production.technicalRetry.sourceAttemptId, "attempt-1");
  const provenance = job.provenance as Record<string, unknown>;
  assert.equal(provenance.activeCandidate, true);
  assert.equal(provenance.technicalRetryAuthorized, true);
  assert.equal(provenance.technicalRetryMaximumAttempts, 1);
  assert.equal(provenance.externalPublishingDisabled, true);
  assert.equal(provenance.youtubePublishingDisabled, true);
  assert.equal((job.quality as Record<string, unknown>).qualityScore, 100);
  assert.equal((job.quality as Record<string, unknown>).runtimeSeconds, 45);
  assert.equal((job.quality as Record<string, unknown>).visualBeatCount, 13);
  assert.equal(f.acceptanceSource.state, "failed");
  assert.equal((f.acceptanceSource.provenance as Record<string, unknown>).superseded, true);
  assert.equal((f.acceptanceSource.provenance as Record<string, unknown>).supersededByJobId, job.id);
  assert.equal((await response.json()).shotstackCreditsConsumed, 0);
});

test("Acceptance Test #2 Revision 6 creates the synchronized 61.5-second candidate without spending credits", async () => {
  const f = fixture({ acceptance2: true });
  f.acceptanceSource.revision = 5;
  (f.acceptanceSource.provenance as Record<string, unknown>).visualPresentationRevision = true;
  (f.acceptanceSource.quality as Record<string, unknown>).renderReady = true;
  const response = await f.post(request("https://thebeast.seangworld.com", "create_revision6_sync_runtime", "candidate"));
  assert.equal(response.status, 201, await response.clone().text());
  const job = f.inserted()!;
  assert.equal(job.revision, 6);
  assert.equal((job.topic as Record<string, unknown>).title, "SEANGWORLD News — Acceptance Test #2 — Revision 6");
  const production = job.production as Record<string, any>;
  assert.equal(production.manifest.runtimeMs, 61_500);
  assert.equal(production.manifest.visualPlan.beats.length, 12);
  assert.equal(production.manifest.visualPlan.beats[0].visualAssetId, "news-test-home");
  assert.equal(production.manifest.visualPlan.beats.at(-1).visualAssetId, "news-test-home");
  assert.equal(production.manifest.monetizationOriented, true);
  assert.equal(production.manifest.syncVerificationRequired, true);
  assert.equal(production.shotstackCreditsConsumed, 0);
  assert.equal(production.estimatedCredits.estimatedTotal, 2);
  assert.equal((job.provenance as Record<string, unknown>).externalPublishingDisabled, true);
  assert.equal((job.provenance as Record<string, unknown>).youtubePublishingDisabled, true);
  assert.equal(f.acceptanceSource.state, "failed");
  assert.equal((f.acceptanceSource.provenance as Record<string, unknown>).superseded, true);
  assert.equal((await response.json()).shotstackCreditsConsumed, 0);
});

test("corrected revision recovery requires a retained provider validation failure", async () => {
  const f = fixture({ acceptance2: true });
  const response = await f.post(request("https://thebeast.seangworld.com", "create_corrected_revision", "candidate"));
  assert.equal(response.status, 409);
  assert.equal(f.inserted(), undefined);
});

test("Owner Review persists the Revision 4 creative-quality detail fields", async () => {
  const f = fixture();
  const response = await f.patch(patchRequest({ kind: "owner_review", id: "source", decision: "needs_changes", grade: "B", technicalResult: "PASS", creativeResult: "REVISION REQUIRED", voiceReview: "ACCEPTED", pacingReview: "ACCEPTED", visualFramingReview: "NEEDS REVISION", motionTreatmentReview: "NEEDS REVISION" }));
  assert.equal(response.status, 200, await response.clone().text());
  const quality = (f.updated()?.quality || {}) as Record<string, unknown>;
  assert.deepEqual({ ownerQualityGrade: quality.ownerQualityGrade, technicalResult: quality.technicalResult, creativeResult: quality.creativeResult, voiceReview: quality.voiceReview, pacingReview: quality.pacingReview, visualFramingReview: quality.visualFramingReview, motionTreatmentReview: quality.motionTreatmentReview }, { ownerQualityGrade: "B", technicalResult: "PASS", creativeResult: "REVISION REQUIRED", voiceReview: "ACCEPTED", pacingReview: "ACCEPTED", visualFramingReview: "NEEDS REVISION", motionTreatmentReview: "NEEDS REVISION" });
});
