import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { privateYouTubeMetadata, YOUTUBE_MAX_BYTES } from "../src/lib/server/directYouTube";

function uploadRoute(options: { owner?: boolean; pause?: boolean; prior?: boolean; disconnected?: boolean } = {}) {
  const calls: string[] = [];
  const client = { from(table: string) {
    calls.push(table);
    const data = table.endsWith("connections") ? options.disconnected ? null : { channel_id: "channel" }
      : table.endsWith("uploads") ? options.prior ? { id: "receipt", status: "unconfirmed", video_id: null } : null
      : table.endsWith("controls") ? { pause_all_publishing: options.pause ?? true } : null;
    const query = { select() { return query; }, eq() { return query; }, maybeSingle: async () => ({ data, error: null }) };
    return query;
  } };
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/beast-marketing/youtube/upload/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, Date, Buffer, Blob, process: { env: {} }, require: (name: string) => {
    if (name === "node:crypto") return require(name);
    if (name.endsWith("/supabase/service")) return { createBeastFusionPublicationClient: () => client };
    if (name === "../owner") return {
      youtubeOwner: async () => options.owner === false ? null : { user: { id: "owner" }, client },
      youtubeJson: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
    };
    if (name.endsWith("/googleOAuth")) return { decryptGoogleRefreshToken() { throw new Error("Unexpected credential access"); } };
    if (name.endsWith("/directYouTube")) return { privateYouTubeMetadata, YOUTUBE_MAX_BYTES, youtubeToken() { throw new Error("Unexpected provider call"); } };
    throw new Error(`Unexpected module ${name}`);
  } });
  return { post: exports.POST!, calls };
}
const request = (origin = "https://thebeast.seangworld.com", overrides: Record<string, unknown> = {}) => new Request("https://thebeast.seangworld.com/api/admin/beast-marketing/youtube/upload", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ assetId: "12345678-1234-4234-8234-123456789012", confirmPrivateUpload: true, title: "Reviewed", description: "", madeForKids: false, containsSyntheticMedia: true, ...overrides }) });
test("private YouTube upload denies cross-origin and unauthenticated requests before storage access", async () => {
  const crossOrigin = uploadRoute();
  assert.equal((await crossOrigin.post(request("https://attacker.test"))).status, 403);
  assert.equal(crossOrigin.calls.length, 0);
  const anonymous = uploadRoute({ owner: false });
  assert.equal((await anonymous.post(request())).status, 403);
  assert.equal(anonymous.calls.length, 0);
});
test("private YouTube transfer requires explicit confirmation before reading credentials", async () => {
  const route = uploadRoute();
  assert.equal((await route.post(request(undefined, { confirmPrivateUpload: false }))).status, 400);
  assert.equal(route.calls.length, 0);
});
test("private YouTube upload fails closed on publishing pause and missing connection", async () => {
  for (const options of [{ pause: true }, { disconnected: true, pause: false }]) {
    const response = await uploadRoute(options).post(request());
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});
test("private YouTube upload retains an uncertain attempt without attempting another transfer", async () => {
  const route = uploadRoute({ prior: true, pause: false });
  const response = await route.post(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.reused, true);
  assert.equal(body.upload.status, "unconfirmed");
  assert.equal(route.calls.length, 4);
});

function preparedUpload(options: { tampered?: boolean; stale?: boolean; uncertain?: boolean } = {}) {
  const bytes = Buffer.from("0000ftyp12345678");
  const hash = require("node:crypto").createHash("sha256").update(bytes).digest("hex");
  const manifest = { jobId: "job", revision: 1, checksum: "manifest", aspectRatio: "9:16", runtimeMs: 60000 };
  const asset = { id: "12345678-1234-4234-8234-123456789012", job_id: "job", role: "final_video", status: "available", mime_type: "video/mp4", size_bytes: bytes.length, storage_path: "owner/video.mp4", content_hash: options.tampered ? "0".repeat(64) : hash, license_reference: "licensed", duration_ms: 60000, provenance: { publicationWatermarkEligible: true, manifestChecksum: "manifest" } };
  const job = { id: "job", state: "ready", revision: 1, quality: { renderReady: true, ownerWorkflowDecision: "approved", ownerApprovalSource: "manual" }, production: { manifest } };
  const calls: string[] = [];
  const writes: Record<string, unknown>[] = [];
  let jobReads = 0;
  const client = {
    storage: { from: () => ({ download: async () => ({ data: new Blob([bytes]), error: null }) }) },
    from(table: string) {
      const query = {
        select() { return query; }, eq() { return query; },
        insert(row: Record<string, unknown>) { calls.push("claim"); writes.push(row); return query; },
        update(row: Record<string, unknown>) { calls.push("receipt"); writes.push(row); return query; },
        single: async () => ({ data: { id: "receipt" }, error: null }),
        then(resolve: (value: unknown) => void) { resolve({ error: null }); },
        maybeSingle: async () => ({ error: null, data: table.endsWith("connections") ? { channel_id: "channel", connected_at: "connected" }
          : table.endsWith("controls") ? { pause_all_publishing: false }
          : table.endsWith("assets") ? asset
          : table.endsWith("jobs") ? (++jobReads > 1 && options.stale ? { ...job, revision: 2 } : job) : null }),
      };
      return query;
    },
  };
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/beast-marketing/youtube/upload/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, Date, Buffer, Blob, process: { env: {} }, require: (name: string) => {
    if (name === "node:crypto") return require(name);
    if (name.endsWith("/supabase/service")) return { createBeastFusionPublicationClient: () => client };
    if (name === "../owner") return { youtubeOwner: async () => ({ user: { id: "owner" }, client }), youtubeJson: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status }) };
    if (name.endsWith("/googleOAuth")) return { decryptGoogleRefreshToken: () => "refresh" };
    if (name.endsWith("/directYouTube")) return {
      privateYouTubeMetadata, YOUTUBE_MAX_BYTES,
      youtubeToken: async () => { calls.push("token"); return { access_token: "access" }; },
      verifySeangworldChannel: async () => ({ id: "channel" }),
      uploadPrivateYouTubeVideo: async (_token: string, media: Blob, metadata: ReturnType<typeof privateYouTubeMetadata>) => {
        calls.push("transfer");
        assert.equal(media.size, bytes.length);
        assert.equal(metadata.status.privacyStatus, "private");
        if (options.uncertain) throw new Error("timeout");
        return "12345678901";
      },
    };
    throw new Error(`Unexpected module ${name}`);
  } });
  return { post: exports.POST!, calls, writes };
}
test("private YouTube upload rejects tampered bytes before requesting a token or claiming", async () => {
  const route = preparedUpload({ tampered: true });
  assert.equal((await route.post(request())).status, 503);
  assert.deepEqual(route.calls, []);
});
test("private YouTube upload rejects a revision changed during preflight before claiming", async () => {
  const route = preparedUpload({ stale: true });
  assert.equal((await route.post(request())).status, 503);
  assert.deepEqual(route.calls, ["token"]);
});
test("private YouTube upload claims before transferring and records private metadata and receipt", async () => {
  const route = preparedUpload();
  const response = await route.post(request());
  assert.equal(response.status, 200);
  assert.deepEqual(route.calls, ["token", "claim", "transfer", "receipt"]);
  assert.equal(route.writes[0].owner_id, "owner");
  assert.match(String(route.writes[0].content_hash), /^[a-f0-9]{64}$/);
  assert.equal((route.writes[0].metadata as ReturnType<typeof privateYouTubeMetadata>).status.privacyStatus, "private");
  assert.equal(route.writes[1].status, "uploaded_private");
  assert.equal((await response.json()).publicPublishing, false);
});
test("private YouTube ambiguous transfer is recorded unconfirmed with no second transfer", async () => {
  const route = preparedUpload({ uncertain: true });
  assert.equal((await route.post(request())).status, 503);
  assert.deepEqual(route.calls, ["token", "claim", "transfer", "receipt"]);
  assert.equal(route.writes[1].status, "unconfirmed");
});
