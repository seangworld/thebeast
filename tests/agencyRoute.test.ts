import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as preparation from "../src/lib/agencyPreparation";
import { isUuid } from "../src/lib/marketingSocial";

const ownerId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";
const payload = { action: "bind", presenterProfileId: profileId, connectionId, channel: "instagram" };
const origin = "https://thebeast.seangworld.com";
const post = (body: unknown = payload, requestOrigin = origin) => new Request(`${origin}/api/admin/agency`, {
  method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

type Row = Record<string, unknown>;
function fixture(options: { authorized?: boolean; unavailable?: string; profile?: Row | null; connection?: Row | null } = {}) {
  const calls: Array<{ table: string; operation: string; filters: Array<[string, unknown]>; fields: string; values?: Row }> = [];
  const rows: Record<string, Row[]> = {
    beast_marketing_presenter_profiles: [{ id: profileId, owner_id: ownerId, presenter_type: "future_character", name: "Private character", active: false, allowed_topics: ["Lifestyle"], provenance: {}, ...options.profile }],
    beast_marketing_social_connections: [{ id: connectionId, owner_id: ownerId, channel: "instagram", account_id: "private-provider-account", label: "@private", connected_at: "2026-01-01T00:00:00Z", expires_at: null, disconnected_at: null, credentials: { token: "never_return_this" }, ...options.connection }],
    beast_marketing_agency_bindings: [],
  };
  if (options.profile === null) rows.beast_marketing_presenter_profiles = [];
  if (options.connection === null) rows.beast_marketing_social_connections = [];
  let serviceClients = 0;
  const client = { from(table: string) {
    let single = false;
    const call = { table, operation: "select", filters: [] as Array<[string, unknown]>, fields: "*", values: undefined as Row | undefined };
    const query = {
      select(fields: string) { call.fields = fields; return query; },
      eq(key: string, value: unknown) { call.filters.push([key, value]); return query; },
      is(key: string, value: unknown) { call.filters.push([key, value]); return query; },
      order() { return query; },
      maybeSingle() { single = true; return query; },
      insert(values: Row) { call.operation = "insert"; call.values = values; return query; },
      then(resolve: (value: unknown) => unknown) {
        calls.push(call);
        if (table === options.unavailable) return Promise.resolve({ data: null, error: { code: "unavailable" } }).then(resolve);
        if (call.operation === "insert") {
          const values = call.values!;
          const duplicate = rows[table].some(row => row.owner_id === values.owner_id && (row.connection_id === values.connection_id || row.presenter_profile_id === values.presenter_profile_id && row.channel === values.channel));
          if (!duplicate) rows[table].push({ ...values });
          return Promise.resolve({ data: null, error: duplicate ? { code: "23505" } : null }).then(resolve);
        }
        const matches = rows[table].filter(row => call.filters.every(([key, value]) => row[key] === value)).map(row => call.fields === "*" ? row : Object.fromEntries(call.fields.split(",").map(key => [key, row[key]])));
        return Promise.resolve({ data: single ? matches[0] ?? null : matches, error: null }).then(resolve);
      },
    };
    return query;
  } };
  const exports: Record<string, (...args: unknown[]) => Promise<Response>> = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/agency/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, Date, Error, require: (name: string) => {
    if (name === "@/lib/supabase/service") return { createBeastFusionPublicationClient: () => { serviceClients++; return client; } };
    if (name === "@/lib/server/social/auth") return {
      socialOwner: async (request?: Request) => options.authorized === false || request && request.headers.get("origin") !== origin ? null : { id: ownerId, client },
      socialJson: (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
    };
    if (name === "@/lib/agencyPreparation") return preparation;
    if (name === "@/lib/marketingSocial") return { isUuid };
    throw new Error(`Unexpected import ${name}`);
  } });
  return { GET: exports.GET, POST: exports.POST, calls, rows, serviceClients: () => serviceClients };
}

test("agency API does not access setup tables when owner verification fails", async () => {
  const f = fixture({ authorized: false });
  assert.equal((await f.GET()).status, 403);
  assert.equal((await f.POST(post())).status, 403);
  assert.equal(f.serviceClients(), 0);
  assert.deepEqual(f.calls, []);
});
test("agency API passes the write request through origin authorization", async () => {
  const f = fixture();
  assert.equal((await f.POST(post(payload, "https://other.test"))).status, 403);
  assert.equal(f.serviceClients(), 0);
});
test("agency GET scopes queries to the verified owner and excludes private credentials", async () => {
  const f = fixture();
  const response = await f.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const text = await response.text();
  for (const secret of ["never_return_this", "private-provider-account", "owner_id", "credentials"]) assert.equal(text.includes(secret), false);
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(call => call.filters.some(([key, value]) => key === "owner_id" && value === ownerId)));
  assert.ok(f.calls.every(call => !call.fields.includes("credentials")));
});
test("agency GET fails closed when any setup table is unavailable", async () => {
  for (const unavailable of ["beast_marketing_presenter_profiles", "beast_marketing_social_connections", "beast_marketing_agency_bindings"]) {
    assert.equal((await fixture({ unavailable }).GET()).status, 503);
  }
});
test("agency POST rejects invalid inputs before creating a service client", async () => {
  for (const body of [null, {}, { ...payload, presenterProfileId: "invalid" }, { ...payload, connectionId: "invalid" }, { ...payload, channel: "facebook_personal" }, { ...payload, action: "publish" }]) {
    const f = fixture();
    assert.equal((await f.POST(post(body))).status, 400);
    assert.equal(f.serviceClients(), 0);
  }
});
test("agency POST rejects foreign, missing, wrong-channel, disconnected and expired accounts", async () => {
  for (const options of [
    { profile: null }, { profile: { owner_id: "another-owner" } }, { profile: { presenter_type: "faceless" } },
    { connection: null }, { connection: { owner_id: "another-owner" } }, { connection: { channel: "x" } },
    { connection: { disconnected_at: "2026-01-01T00:00:00Z" } }, { connection: { expires_at: "2020-01-01T00:00:00Z" } },
    { connection: { expires_at: "invalid" } },
  ]) {
    const f = fixture(options);
    assert.equal((await f.POST(post())).status, 409, JSON.stringify(options));
    assert.equal(f.calls.some(call => call.operation === "insert"), false);
  }
});
test("agency POST rejects empty account IDs and invalid or future connection times", async () => {
  for (const connection of [{ account_id: "" }, { account_id: "   " }, { connected_at: "invalid" }, { connected_at: "2099-01-01T00:00:00Z" }]) {
    const f = fixture({ connection });
    assert.equal((await f.POST(post())).status, 409, JSON.stringify(connection));
    assert.equal(f.calls.some(call => call.operation === "insert"), false);
  }
});
test("agency binding derives the owner and never changes an existing mapping on repeat", async () => {
  const f = fixture();
  const response = await f.POST(post({ ...payload, owner_id: "attacker", publishingAuthorized: true }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).publishingAuthorized, false);
  assert.deepEqual(JSON.parse(JSON.stringify(f.rows.beast_marketing_agency_bindings)), [{ owner_id: ownerId, presenter_profile_id: profileId, connection_id: connectionId, channel: "instagram" }]);
  assert.equal((await f.POST(post())).status, 409);
  assert.equal(f.rows.beast_marketing_agency_bindings.length, 1);
  assert.ok(f.calls.filter(call => call.operation === "insert").every(call => call.table === "beast_marketing_agency_bindings"));
});
