import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  AGENCY_PRODUCTION_ORIGIN,
  AGENCY_PRODUCTION_SUPABASE_REF,
  agencyWriteOwner,
  evaluateAgencyWritePolicy,
  type AgencyWriteEnvironment,
  type AgencyWriteInput,
} from "../src/lib/server/agency/auth";

// Synthetic review fixtures. No actual private development project or key.
const hostname = "agency-review-deployment-fixture.vercel.app";
const previewOrigin = `https://${hostname}`;
const isolatedUrl = "https://abcdefghijklmnopqrst.supabase.co";
const previewEnv: AgencyWriteEnvironment = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "agency-review",
  VERCEL_URL: hostname, AGENCY_PREVIEW_WRITES_ENABLED: "true",
  AGENCY_PREVIEW_TARGET_ENV: "agency-review", AGENCY_PREVIEW_SUPABASE_URL: isolatedUrl,
};
const input: AgencyWriteInput = {
  method: "POST", origin: previewOrigin,
  requestUrl: `${previewOrigin}/api/admin/agency`, effectiveSupabaseUrl: isolatedUrl,
};
const productionEnv: AgencyWriteEnvironment = { VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" };
const deny = (request: Partial<AgencyWriteInput> = {}, env: Partial<AgencyWriteEnvironment> = {}) => {
  assert.equal(evaluateAgencyWritePolicy({ ...input, ...request }, { ...previewEnv, ...env }).allowed, false);
};

test("pure policy: production preserves its exact Origin rule without preview configuration", () => {
  for (const env of [productionEnv, { VERCEL_ENV: "production" }]) {
    assert.deepEqual(evaluateAgencyWritePolicy({ ...input, origin: AGENCY_PRODUCTION_ORIGIN }, env), {
      allowed: true, target: "production", origin: AGENCY_PRODUCTION_ORIGIN,
    });
    for (const origin of [previewOrigin, null, "null", `${AGENCY_PRODUCTION_ORIGIN}/`, "https://evil.test"]) {
      assert.equal(evaluateAgencyWritePolicy({ ...input, origin }, env).allowed, false);
    }
  }
});

test("pure policy: production cannot acquire a preview Origin through inherited flags", () => {
  deny({}, { ...previewEnv, VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" });
  deny({ origin: AGENCY_PRODUCTION_ORIGIN }, { VERCEL_ENV: "production", VERCEL_TARGET_ENV: "agency-review" });
});

test("pure policy: exact isolated custom target admits only its platform deployment Origin", () => {
  assert.deepEqual(evaluateAgencyWritePolicy(input, previewEnv), { allowed: true, target: "isolated_preview", origin: previewOrigin });
});

test("pure policy: non-POST methods never enter either authorization branch", () => {
  for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS", "post", ""]) {
    deny({ method });
    assert.equal(evaluateAgencyWritePolicy({ ...input, method, origin: AGENCY_PRODUCTION_ORIGIN }, productionEnv).allowed, false);
  }
});

test("pure policy: default Preview and Development reject even a forged production Origin", () => {
  for (const target of ["preview", "development", "production", "other-custom", "", undefined]) {
    for (const origin of [previewOrigin, AGENCY_PRODUCTION_ORIGIN]) {
      deny({ origin }, { VERCEL_TARGET_ENV: target });
    }
  }
  for (const target of ["preview", "development", "production"]) {
    deny({}, { AGENCY_PREVIEW_TARGET_ENV: target, VERCEL_TARGET_ENV: target });
  }
});

test("pure policy: missing or contradictory platform metadata fails closed", () => {
  for (const VERCEL of [undefined, "", "0", "true", " 1"]) deny({}, { VERCEL });
  for (const VERCEL_ENV of [undefined, "", "development", "Preview", "preview "]) deny({}, { VERCEL_ENV });
  assert.equal(evaluateAgencyWritePolicy(input, {}).allowed, false);
});

test("pure policy: custom target is an exact approved canonical slug", () => {
  for (const target of [undefined, "", "Agency-review", " agency-review", "agency-review ", "agency-review\n", "agency/review", "*", "a".repeat(64)]) {
    deny({}, { AGENCY_PREVIEW_TARGET_ENV: target, VERCEL_TARGET_ENV: target });
  }
  deny({}, { VERCEL_TARGET_ENV: "agency-review-other" });
});

test("pure policy: opt-in accepts only the explicit literal true", () => {
  for (const AGENCY_PREVIEW_WRITES_ENABLED of [undefined, "", "false", "1", "TRUE", " true", "true "]) deny({}, { AGENCY_PREVIEW_WRITES_ENABLED });
});

test("pure policy: VERCEL_URL must be one canonical generated hostname", () => {
  for (const value of [undefined, "", `https://${hostname}`, `http://${hostname}`, `${hostname}:443`, `${hostname}:8443`, `${hostname}/`,
    `${hostname}/path`, `${hostname}?q=1`, `${hostname}#x`, `user@${hostname}`, `${hostname}.`, `*.vercel.app`, hostname.toUpperCase(),
    ` ${hostname}`, `${hostname} `, `${hostname}\n`, `${hostname},other.vercel.app`, "evil.test", `${hostname}.evil.test`,
    "nested.preview.vercel.app", "-invalid.vercel.app", "invalid-.vercel.app", `${"a".repeat(64)}.vercel.app`, "xn--bad_thing.vercel.app",
    "localhost", "127.0.0.1", "[::1]", "agency%2dreview.vercel.app", "agency\\review.vercel.app"]) {
    assert.deepEqual(evaluateAgencyWritePolicy(input, { ...previewEnv, VERCEL_URL: value }), { allowed: false, reason: "hostname" });
  }
});

test("pure policy: raw Origin comparison rejects every non-exact representation", () => {
  for (const origin of [null, "", "null", `${previewOrigin}/`, `${previewOrigin}/path`, `${previewOrigin}?q=1`, `${previewOrigin}#x`,
    `${previewOrigin}:443`, `${previewOrigin}:8443`, `http://${hostname}`, `https://user@${hostname}`, `https://${hostname}.`,
    previewOrigin.toUpperCase(), ` ${previewOrigin}`, `${previewOrigin} `, `${previewOrigin}\n`, `${previewOrigin}, https://evil.test`,
    `${previewOrigin} https://evil.test`, "https://sibling-deployment.vercel.app", `${previewOrigin}.evil.test`, AGENCY_PRODUCTION_ORIGIN]) {
    deny({ origin });
  }
});

test("pure policy: request destination must have the same exact parsed origin", () => {
  for (const requestUrl of ["not a URL", "", "//example.com/path", `http://${hostname}/api/admin/agency`,
    "https://sibling-deployment.vercel.app/api/admin/agency", `${previewOrigin}:8443/api/admin/agency`,
    `${AGENCY_PRODUCTION_ORIGIN}/api/admin/agency`, `https://user:pass@${hostname}/api/admin/agency`,
    ` ${previewOrigin}/api/admin/agency`, `${previewOrigin}/api/admin/agency `]) deny({ requestUrl });
  assert.equal(evaluateAgencyWritePolicy({ ...input, requestUrl: `${previewOrigin}/api/admin/agency/plans?view=private` }, previewEnv).allowed, true);
});

test("pure policy: expected preview URL must be canonical and cannot name production", () => {
  const productionUrl = `https://${AGENCY_PRODUCTION_SUPABASE_REF}.supabase.co`;
  for (const url of [undefined, "", productionUrl, `http://abcdefghijklmnopqrst.supabase.co`, `${isolatedUrl}/`, `${isolatedUrl}:443`,
    `${isolatedUrl}/rest/v1`, `${isolatedUrl}?x=1`, `${isolatedUrl}#x`, `https://user@abcdefghijklmnopqrst.supabase.co`,
    isolatedUrl.toUpperCase(), `${isolatedUrl}.evil.test`, "https://*.supabase.co", ` ${isolatedUrl}`, `${isolatedUrl}\n`, "https://short.supabase.co"]) {
    deny({ effectiveSupabaseUrl: url }, { AGENCY_PREVIEW_SUPABASE_URL: url });
  }
});

test("pure policy: effective client URL must match the isolated project pin", () => {
  for (const effectiveSupabaseUrl of [undefined, "", `https://${AGENCY_PRODUCTION_SUPABASE_REF}.supabase.co`,
    "https://zyxwvutsrqponmlkjihg.supabase.co", `${isolatedUrl}/`, `${isolatedUrl} `]) deny({ effectiveSupabaseUrl });
});

test("pure policy: a changed platform deployment host needs matching request and Origin", () => {
  const newOrigin = "https://agency-new-deployment-fixture.vercel.app";
  const env = { ...previewEnv, VERCEL_URL: "agency-new-deployment-fixture.vercel.app" };
  assert.equal(evaluateAgencyWritePolicy(input, env).allowed, false);
  assert.equal(evaluateAgencyWritePolicy({ ...input, origin: newOrigin, requestUrl: `${newOrigin}/api/admin/agency` }, env).allowed, true);
});

function request(origin: string = previewOrigin, url = input.requestUrl, extraHeaders: Record<string, string> = {}) {
  return new Request(url, { method: "POST", headers: { origin, ...extraHeaders } });
}

test("mock wrapper: production delegates the unchanged request to socialOwner", async () => {
  const req = request(AGENCY_PRODUCTION_ORIGIN, `${AGENCY_PRODUCTION_ORIGIN}/api/admin/agency`);
  const seen: Array<Request | undefined> = [];
  const owner = { id: "synthetic-owner" };
  assert.equal(await agencyWriteOwner(req, { env: productionEnv,
    getEffectiveSupabaseUrl: () => { throw new Error("production must not use preview configuration"); },
    socialOwner: async (value) => { seen.push(value); return owner; },
  }), owner);
  assert.deepEqual(seen, [req]);
});

test("mock wrapper: isolated preview delegates authentication only after passing policy", async () => {
  const seen: Array<Request | undefined> = [];
  const owner = { id: "synthetic-owner" };
  assert.equal(await agencyWriteOwner(request(), { env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl,
    socialOwner: async (value) => { seen.push(value); return owner; },
  }), owner);
  assert.deepEqual(seen, [undefined]);
});

test("mock wrapper: rejected requests never call auth or reach a simulated mutation", async () => {
  let authCalls = 0;
  let mutations = 0;
  for (const [req, env] of [
    [request("https://evil.test"), previewEnv],
    [request(AGENCY_PRODUCTION_ORIGIN), { ...previewEnv, VERCEL_TARGET_ENV: "preview" }],
    [request(), { ...previewEnv, AGENCY_PREVIEW_WRITES_ENABLED: undefined }],
    [request(), { ...previewEnv, AGENCY_PREVIEW_SUPABASE_URL: `https://${AGENCY_PRODUCTION_SUPABASE_REF}.supabase.co` }],
  ] as const) {
    const owner = await agencyWriteOwner(req, { env, getEffectiveSupabaseUrl: () => isolatedUrl,
      socialOwner: async () => { authCalls++; return { id: "synthetic-owner" }; },
    });
    if (owner) mutations++;
    assert.equal(owner, null);
  }
  assert.equal(authCalls, 0);
  assert.equal(mutations, 0);
});

test("mock wrapper: Host and forwarded headers cannot authorize a foreign Origin or URL", async () => {
  let authCalls = 0;
  for (const req of [
    request("https://evil.test", input.requestUrl, { host: hostname, "x-forwarded-host": hostname, forwarded: `host=${hostname};proto=https` }),
    request(previewOrigin, "https://evil.test/api/admin/agency", { host: hostname, "x-forwarded-host": hostname, "x-forwarded-proto": "https" }),
  ]) {
    assert.equal(await agencyWriteOwner(req, { env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl,
      socialOwner: async () => { authCalls++; return {}; },
    }), null);
  }
  assert.equal(authCalls, 0);
});

test("mock wrapper: missing Origin and unavailable configuration fail closed before auth", async () => {
  let authCalls = 0;
  const socialOwner = async () => { authCalls++; return {}; };
  assert.equal(await agencyWriteOwner(new Request(input.requestUrl, { method: "POST" }), {
    env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl, socialOwner,
  }), null);
  assert.equal(await agencyWriteOwner(request(), {
    env: previewEnv, getEffectiveSupabaseUrl: () => { throw new Error("not configured"); }, socialOwner,
  }), null);
  assert.equal(authCalls, 0);
});

test("mock wrapper: authentication denial stays denied after a valid origin", async () => {
  assert.equal(await agencyWriteOwner(request(), {
    env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl, socialOwner: async () => null,
  }), null);
});

test("mock wrapper: existing authentication errors are not converted into success", async () => {
  await assert.rejects(agencyWriteOwner(request(), {
    env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl, socialOwner: async () => { throw new Error("auth unavailable"); },
  }), /auth unavailable/);
});

// Execute the unchanged production authentication implementation; mock only its
// external Supabase transport, not its getUser/profile-role authorization logic.
function realSocialOwnerFixture(options: { user?: { id: string } | null; authError?: boolean; role?: string | null; profileError?: boolean } = {}) {
  let authCalls = 0;
  let profileCalls = 0;
  const selectedIds: string[] = [];
  const client = {
    auth: { getUser: async () => { authCalls++; return { data: { user: options.user === undefined ? { id: "synthetic-admin" } : options.user }, error: options.authError ? {} : null }; } },
    from: (table: string) => {
      assert.equal(table, "profiles");
      profileCalls++;
      return { select: (fields: string) => {
        assert.equal(fields, "role");
        return { eq: (key: string, id: string) => {
          assert.equal(key, "id"); selectedIds.push(id);
          return { maybeSingle: async () => ({ data: options.role === null ? null : { role: options.role ?? "admin" }, error: options.profileError ? {} : null }) };
        } };
      } };
    },
  };
  const exports: { socialOwner?: (request?: Request) => Promise<{ id: string } | null> } = {};
  const source = ts.transpileModule(readFileSync("src/lib/server/social/auth.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, Buffer, process: { env: {} }, require: (name: string) => {
    if (name === "node:crypto") return require("node:crypto");
    if (name === "next/server") return { NextResponse: { json: Response.json } };
    if (name === "@/lib/supabase/server") return { createRouteClient: () => client };
    throw new Error(`Unexpected authentication import ${name}`);
  } });
  return { socialOwner: exports.socialOwner!, authCalls: () => authCalls, profileCalls: () => profileCalls, selectedIds };
}
for (const [label, options] of [
  ["anonymous session", { user: null }],
  ["session verification error", { authError: true }],
  ["non-admin role", { role: "member" }],
  ["missing profile", { role: null }],
  ["profile verification error", { profileError: true }],
] as const) {
  test(`real auth implementation: valid preview origin still rejects ${label}`, async () => {
    const fixture = realSocialOwnerFixture(options);
    assert.equal(await agencyWriteOwner(request(), { env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl, socialOwner: fixture.socialOwner }), null);
    assert.equal(fixture.authCalls(), 1);
  });
}
test("real auth implementation: approved preview retains verified-user profile scoping", async () => {
  const fixture = realSocialOwnerFixture();
  const owner = await agencyWriteOwner(request(), { env: previewEnv, getEffectiveSupabaseUrl: () => isolatedUrl, socialOwner: fixture.socialOwner });
  assert.equal(owner?.id, "synthetic-admin");
  assert.deepEqual(fixture.selectedIds, ["synthetic-admin"]);
  assert.equal(fixture.profileCalls(), 1);
});
