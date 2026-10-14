import assert from "node:assert/strict";
import test from "node:test";
import { buildAgencySnapshot, type AgencyProfile, type AgencyConnection, type AgencyBinding } from "../src/lib/agencyPreparation";
const now = "2026-10-12T04:00:00.000Z";
const profile = (id = "one", owner_id = "owner"): AgencyProfile => ({ id, owner_id, name: "Private character", presenter_type: "future_character", active: false, allowed_topics: ["Lifestyle"], provenance: {} });
const connection = (overrides: Partial<AgencyConnection> = {}): AgencyConnection => ({ id: "c1", owner_id: "owner", channel: "instagram", account_id: "account1", label: "@private", connected_at: "2026-10-11T00:00:00Z", expires_at: null, disconnected_at: null, ...overrides });
const binding = (overrides: Partial<AgencyBinding> = {}): AgencyBinding => ({ owner_id: "owner", presenter_profile_id: "one", connection_id: "c1", channel: "instagram", ...overrides });
const snapshot = (connections: AgencyConnection[] = [], bindings: AgencyBinding[] = [], profiles: AgencyProfile[] = [profile()]) => buildAgencySnapshot({ ownerId: "owner", now, profiles, connections, bindings });

test("empty account setup stays inactive with null metrics", () => {
  const result = snapshot();
  assert.equal(result.agencyAutomaticPublishingEnabled, false);
  assert.equal(result.agencyDmResponsesEnabled, false);
  assert.equal(result.agencyAdditionalSpendingAuthorizedUsd, 0);
  assert.equal(result.creators[0].platforms.length, 3);
  assert.ok(result.creators[0].platforms.every(p => p.state === "not_connected"));
  assert.ok(Object.values(result.creators[0].metrics).every(value => value === null));
});
test("only explicit owner-matched binding connects a character", () => {
  assert.equal(snapshot([connection()]).creators[0].platforms[0].state, "not_connected");
  const result = snapshot([connection()], [binding()]);
  assert.equal(result.creators[0].platforms[0].state, "connected_unverified");
  assert.equal(result.creators[0].platforms[0].reportingVerified, false);
  assert.equal(result.availableConnections.length, 0);
});
test("profiles and connections belonging to another owner never leak", () => {
  const result = snapshot([connection({ owner_id: "other" })], [binding()], [profile(), profile("other", "other")]);
  assert.equal(result.creators.length, 1);
  assert.equal(result.creators[0].platforms[0].state, "unavailable");
  assert.equal(result.availableConnections.length, 0);
  assert.equal(JSON.stringify(result).includes("@private"), false);
});
test("wrong channel, revoked, malformed, and future connections fail closed", () => {
  for (const overrides of [{ channel: "x" }, { disconnected_at: now }, { connected_at: "bad" }, { connected_at: "2030-01-01" }, { account_id: "" }]) {
    assert.equal(snapshot([connection(overrides)], [binding()]).creators[0].platforms[0].state, "unavailable");
  }
});
test("expired or malformed expiry never appears connected", () => {
  for (const expires_at of [now, "2020-01-01", "invalid"]) {
    const result = snapshot([connection({ expires_at })], [binding()]);
    assert.equal(result.creators[0].platforms[0].state, "expired");
    assert.equal(result.availableConnections.length, 0);
  }
});
test("two independent brands cannot silently share an account", () => {
  const result = snapshot([connection()], [binding(), binding({ presenter_profile_id: "two" })], [profile(), profile("two")]);
  assert.ok(result.creators.every(c => c.platforms[0].state === "binding_conflict"));
});
test("duplicate bindings and duplicate connections fail closed", () => {
  assert.equal(snapshot([connection()], [binding(), binding()]).creators[0].platforms[0].state, "binding_conflict");
  assert.equal(snapshot([connection(), connection()], [binding()]).creators[0].platforms[0].state, "binding_conflict");
});
test("foreign bindings do not connect or reserve owned accounts", () => {
  const result = snapshot([connection()], [binding({ owner_id: "other" })]);
  assert.equal(result.creators[0].platforms[0].state, "not_connected");
  assert.equal(result.availableConnections.length, 1);
});
test("snapshot excludes credentials and owner IDs", () => {
  const secretConnection = { ...connection(), credentials: { secret: "never_return_this" } };
  const result = JSON.stringify(snapshot([secretConnection], [binding()]));
  assert.equal(result.includes("never_return_this"), false);
  assert.equal(result.includes("owner_id"), false);
  assert.equal(result.includes("account_id"), false);
});
test("no profiles is an honest empty state", () => assert.deepEqual(snapshot([], [], []).creators, []));
test("requires explicit owner and valid time", () => {
  assert.throws(() => buildAgencySnapshot({ ownerId: "", now, profiles: [], connections: [], bindings: [] }));
  assert.throws(() => buildAgencySnapshot({ ownerId: "owner", now: "bad", profiles: [], connections: [], bindings: [] }));
});

test("invalid account identifiers never appear as selectable connections", () => {
  for (const account_id of ["", " "]) assert.equal(snapshot([connection({ account_id })]).availableConnections.length, 0);
});
