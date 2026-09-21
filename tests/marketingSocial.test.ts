import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import * as social from "../src/lib/marketingSocial";
import { socialTrafficEvidence } from "../src/lib/marketingSocialTraffic";
import type { SeangworldProviderSnapshot } from "../src/lib/seangworldIntelligence";

const id = "12345678-1234-4234-8234-123456789012";
const content: social.SocialContent = { text: "A new guide is ready.", destination: "https://seangworld.com/guides", mediaType: "none", mediaUrl: "", campaignId: "" };
const post = { id, channel: "facebook_page", content, revision: 1, approved_revision: 1, connection_id: "account", status: "scheduled", scheduled_at: "2026-01-01T00:00:00Z", provider_container_id: null };

test("social drafts reject foreign links and private or arbitrary media", () => {
  for (const destination of ["https://evil.test/", "https://seangworld.com.evil.test/", "javascript:alert(1)", "https://user@seangworld.com/"]) assert.throws(() => social.validateSocialContent({ ...content, destination }, "facebook_page"));
  for (const mediaUrl of ["http://127.0.0.1/photo.jpg", "https://seangworld.com/api/private.jpg", "https://project.supabase.co/storage/v1/object/sign/docs/file.jpg?token=secret"]) assert.throws(() => social.validateSocialContent({ ...content, mediaType: "image", mediaUrl }, "facebook_page", "https://project.supabase.co"));
  assert.equal(social.allowedSocialMedia("https://project.supabase.co/storage/v1/object/public/beast-marketing-social/owner/photo.jpg", "https://project.supabase.co"), true);
});
test("Instagram requires media and JPEG for direct image publication", () => {
  assert.throws(() => social.validateSocialContent(content, "instagram"), /image or video/);
  assert.throws(() => social.validateDirectPost({ ...content, mediaType: "image", mediaUrl: "https://seangworld.com/images/a.png" }, "instagram"), /JPEG/);
  assert.doesNotThrow(() => social.validateDirectPost({ ...content, mediaType: "image", mediaUrl: "https://seangworld.com/images/a.jpg" }, "instagram"));
});
test("personal Facebook cannot enter direct publishing and X media uses manual sharing", () => {
  assert.throws(() => social.validateDirectPost(content, "facebook_personal"), /manual/);
  assert.throws(() => social.validateDirectPost({ ...content, mediaType: "video" }, "x"), /manually/);
  assert.throws(() => social.validateDirectPost({ ...content, text: "界".repeat(150) }, "x"), /Shorten/);
});
test("tracking uses exact stable post and campaign identities, including News", () => {
  const tracked = new URL(social.trackedSocialUrl({ ...content, destination: "https://news.seangworld.com/?utm_source=old" }, "facebook_personal", id));
  assert.equal(tracked.searchParams.get("utm_source"), "facebook");
  assert.equal(tracked.searchParams.get("utm_content"), id);
  assert.equal(tracked.searchParams.get("utm_id"), id);
  assert.equal(social.socialShareUrl({ id, channel: "facebook_personal", content }).includes("sharer.php"), true);
});
test("traffic never treats missing, stale, or ambiguous analytics as zero", () => {
  const p = post as unknown as social.SocialPost;
  assert.equal(socialTrafficEvidence(p).sessions, null);
  const link = new URL(social.trackedSocialUrl(content, "facebook_page", id));
  const provider = { id: "ga4", status: "configured", connectionStatus: "connected", lastSuccessfulSynchronizationAt: new Date().toISOString(), data: { qualifiedTrafficWindow: { scopeId: "seangworld", current: { startDate: "2026-09-13", endDate: "2026-09-19" } }, qualifiedTraffic: [{ source: "facebook", medium: "organic_social", campaignName: id, campaignId: id, landingPage: link.pathname + link.search, sessions: 4, engagedSessions: 2, qualifiedActions: null }] } } as unknown as SeangworldProviderSnapshot;
  assert.equal(socialTrafficEvidence(p, provider).sessions, 4);
  assert.equal(socialTrafficEvidence(p, { ...provider, lastSuccessfulSynchronizationAt: "2020-01-01" }).sessions, null);
  provider.data!.qualifiedTraffic!.push(provider.data!.qualifiedTraffic![0]);
  assert.equal(socialTrafficEvidence(p, provider).sessions, null);
});

function fixture(options: { paused?: boolean; admin?: boolean; loseClaim?: boolean; uncertain?: boolean; failReceipt?: boolean; reject?: boolean; processing?: string; revoke?: boolean } = {}) {
  const row: Record<string, unknown> = { ...post, ...(options.processing ? { channel: "instagram", status: "processing", provider_container_id: "123", content: { ...content, mediaType: "image", mediaUrl: "https://seangworld.com/images/photo.jpg" } } : {}) };
  let writes = 0;
  let claimCount = 0;
  const client = { from(table: string) {
    let operation = "select"; let values: Record<string, unknown> = {}; const filters: Array<[string, unknown]> = [];
    const chain = {
      select() { return chain; }, eq(k: string, v: unknown) { filters.push([k, v]); return chain; }, is() { return chain; }, maybeSingle() { return chain; },
      update(v: Record<string, unknown>) { operation = "update"; values = v; return chain; },
      then(resolve: (v: unknown) => unknown) {
        let data: unknown = null; let error: unknown = null;
        if (table === "profiles") data = { role: options.admin === false ? "member" : "admin" };
        if (table.endsWith("controls")) data = { paused: options.paused === true || (options.revoke === true && claimCount > 0), x_paid_enabled: false };
        if (table.endsWith("connections")) data = { id: "account", account_id: "42", connected_at: "now", credentials: {} };
        if (table.endsWith("posts")) {
          if (operation === "select") data = { ...row };
          else if (values.status === "published" && options.failReceipt) error = { code: "unavailable" };
          else if (!filters.every(([k,v]) => k === "owner_id" || row[k] === v) || (values.status === "publishing" && options.loseClaim)) data = null;
          else { if (values.status === "publishing") claimCount++; Object.assign(row, values); data = { id }; }
        }
        return Promise.resolve({ data, error }).then(resolve);
      },
    };
    return chain;
  } };
  class Failure extends Error { constructor(message: string, public uncertain = false) { super(message); } }
  const code = transpileModule(readFileSync("src/lib/server/social/publish.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 } }).outputText;
  const fixtureModule = { exports: {} as { publishSocialPost: (owner: string, id: string) => Promise<{ status: string }> } };
  new Function("require", "module", "exports", code)((name: string) => {
    if (name === "@/lib/supabase/service") return { createBeastFusionPublicationClient: () => client };
    if (name === "@/lib/marketingSocial") return social;
    if (name === "./auth") return { unseal: () => ({ access_token: "fixture" }), seal: () => ({}) };
    if (name === "./providers") return { ProviderFailure: Failure, createSocialPublication: async () => { writes++; if (options.uncertain) throw new Failure("Unknown response", true); if (options.reject) throw new Failure("Rejected", false); return { postId: "99" }; }, metaRequest: async (_path: string, _token: string, _params: unknown, write = false) => { if (write) { writes++; return { id: "99" }; } return { status_code: options.processing }; } };
    throw new Error(name);
  }, fixtureModule, fixtureModule.exports);
  return { run: () => fixtureModule.exports.publishSocialPost("owner", id), writes: () => writes, row };
}
test("paused/non-admin publishers issue no external writes", async () => {
  for (const options of [{ paused: true }, { admin: false }]) { const f = fixture(options); await assert.rejects(f.run()); assert.equal(f.writes(), 0); }
});
test("only the claim winner publishes, and published posts do not resend", async () => {
  const lost = fixture({ loseClaim: true }); assert.equal((await lost.run()).status, "already_claimed"); assert.equal(lost.writes(), 0);
  const f = fixture(); assert.equal((await f.run()).status, "published"); await f.run(); assert.equal(f.writes(), 1);
});
test("concurrent publisher calls issue one provider write", async () => {
  const f = fixture(); await Promise.all([f.run(), f.run()]); assert.equal(f.writes(), 1);
});
test("pause after claim is checked before external publication", async () => {
  const f = fixture({ revoke: true }); assert.equal((await f.run()).status, "failed"); assert.equal(f.writes(), 0);
});
test("ambiguous writes and failed receipt storage become unconfirmed without retry", async () => {
  for (const options of [{ uncertain: true }, { failReceipt: true }]) { const f = fixture(options); assert.equal((await f.run()).status, "unconfirmed"); await f.run(); assert.equal(f.writes(), 1); }
});
test("explicit rejection is visible and never auto-retried", async () => {
  const f = fixture({ reject: true }); assert.equal((await f.run()).status, "failed"); await f.run(); assert.equal(f.writes(), 1);
});
test("Instagram waits for processing; only a finished container publishes", async () => {
  const pending = fixture({ processing: "IN_PROGRESS" }); assert.equal((await pending.run()).status, "processing"); assert.equal(pending.writes(), 0);
  const done = fixture({ processing: "FINISHED" }); assert.equal((await done.run()).status, "published"); assert.equal(done.writes(), 1);
  const failed = fixture({ processing: "ERROR" }); assert.equal((await failed.run()).status, "failed"); assert.equal(failed.writes(), 0);
});
