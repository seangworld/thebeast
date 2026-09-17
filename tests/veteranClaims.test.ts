import test from "node:test";
import assert from "node:assert/strict";
import { buildClaimGuidance, draftClaimStatement, emptyVeteranClaim, validateVeteranClaim, veteranClaimFromRow } from "../src/lib/health/veteranClaims";
import { loadVeteranClaims, saveVeteranClaim } from "../src/lib/health/veteranClaimsPersistence";
const valid = () => ({ ...emptyVeteranClaim("claim-1"), title: "Example issue" });
test("claim validation rejects impossible dates, oversized notes and unknown evidence states", () => {
  const claim = valid(); assert.equal(validateVeteranClaim(claim), null);
  claim.nextActionDate = "2026-02-30"; assert.match(validateVeteranClaim(claim)!, /valid follow-up date/);
  claim.nextActionDate = ""; claim.details.timeline = "a".repeat(6001); assert.match(validateVeteranClaim(claim)!, /6,000/);
});
test("supplemental guidance follows evidence statuses without claiming sufficiency", () => {
  const claim = valid(); claim.claimType = "supplemental";
  assert.match(buildClaimGuidance(claim).lane, /new and relevant/);
  assert.ok(buildClaimGuidance(claim).gaps.includes("Decision letter and reasons"));
  claim.details.evidence.decision.status = "have";
  assert.equal(buildClaimGuidance(claim).gaps.includes("Decision letter and reasons"), false);
  assert.ok(buildClaimGuidance(claim).gaps.includes("New and relevant evidence"));
});
test("statement draft preserves entered notes and leaves missing facts as placeholders", () => {
  const claim = valid(); claim.details.impactNotes = "I miss a walk about twice each week.";
  const draft = draftClaimStatement(claim);
  assert.ok(draft.includes(claim.details.impactNotes)); assert.match(draft, /Add your factual account/);
  assert.equal(draft.includes("service-connected"), false); assert.equal(draft.includes("100%"), false);
});
test("saved rows round trip evidence, notes, dates and version", () => {
  const claim = valid(); claim.details.evidence.medical = { status: "requested", reference: "Clinic, Sep 5" };
  const saved = veteranClaimFromRow({ id: claim.id, title: claim.title, claim_type: "increase", stage: "gathering", details: claim.details, revision: 3, next_action_date: "2026-10-01" });
  assert.deepEqual(saved.details, claim.details); assert.equal(saved.revision, 3); assert.equal(saved.claimType, "increase");
});
function clientFixture(mode: "success" | "conflict" | "failure" | "signedout" = "success") {
  const filters: unknown[][] = []; let payload: Record<string, unknown> = {}; let action = "";
  const query = { select() { return query; }, order() { return query; }, limit() { return Promise.resolve({ data: [], error: null }); },
    eq(key: string, value: unknown) { filters.push([key,value]); return query; },
    insert(value: Record<string, unknown>) { action = "insert"; payload = value; return query; },
    update(value: Record<string, unknown>) { action = "update"; payload = value; return query; },
    maybeSingle() { return Promise.resolve({ data: mode === "conflict" ? null : { ...payload, id: "claim-1", owner_id: "signed-in-owner" }, error: mode === "failure" ? { message: "DB failed" } : null }); },
  };
  const client = { auth: { getUser: async () => ({ data: { user: mode === "signedout" ? null : { id: "signed-in-owner" } }, error: null }) }, from: () => query } as unknown as Parameters<typeof saveVeteranClaim>[0];
  return { client, filters, payload: () => payload, action: () => action };
}
test("new claims use the authenticated owner and confirm the inserted row", async () => {
  const f = clientFixture(); const saved = await saveVeteranClaim(f.client, valid());
  assert.equal(f.payload().owner_id, "signed-in-owner"); assert.equal(f.action(), "insert"); assert.equal(saved.revision, 1);
});
test("updates require both ownership and matching revision", async () => {
  const f = clientFixture(); await saveVeteranClaim(f.client, { ...valid(), revision: 4 });
  assert.deepEqual(f.filters, [["id", "claim-1"], ["owner_id", "signed-in-owner"], ["revision", 4]]);
  assert.equal(f.payload().revision, 5);
});
test("conflicts and failed saves never report success", async () => {
  await assert.rejects(saveVeteranClaim(clientFixture("conflict").client, { ...valid(), revision: 2 }), /another session/);
  await assert.rejects(saveVeteranClaim(clientFixture("failure").client, valid()), /Could not confirm/);
  const f = clientFixture("signedout"); await assert.rejects(saveVeteranClaim(f.client, valid()), /Sign in again/); assert.equal(f.action(), "");
});
test("claim reads are scoped to the signed-in owner", async () => {
  const f = clientFixture(); assert.deepEqual(await loadVeteranClaims(f.client), []); assert.deepEqual(f.filters, [["owner_id", "signed-in-owner"]]);
});
