import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { parseCompanyCost } from "../src/lib/companyCosts";

function route(options: { user?: boolean; role?: string; count?: number; failSave?: boolean } = {}) {
  const calls: unknown[][] = [];
  const row = { id: "12345678-1234-4234-8234-123456789012", name: "Hosting", kind: "recurring", amount_cents: 1800, interval_months: 1, active: true, paid_on: null, notes: "" };
  const query = {
    select(...args: unknown[]) { calls.push(["select", ...args]); return query; },
    eq(...args: unknown[]) { calls.push(["eq", ...args]); return query; },
    order() { return query; },
    limit() { return Promise.resolve({ data: [row], count: options.count ?? 1, error: null }); },
    upsert(...args: unknown[]) { calls.push(["upsert", ...args]); return query; },
    single() { return Promise.resolve(options.failSave ? { data: null, error: {} } : { data: row, error: null }); },
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: options.user === false ? null : { id: "verified-owner" } }, error: null }) },
    from(table: string) {
      calls.push(["from", table]);
      return table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: options.role ?? "admin" }, error: null }) }) }) } : query;
    },
  };
  const exports: Record<string, (...args: unknown[]) => Promise<Response>> = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/company-costs/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, URL, Error, require: (name: string) => {
    if (name === "next/server") return { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } };
    if (name === "@/lib/supabase/server") return { createRouteClient: () => client };
    if (name === "@/lib/companyCosts") return { parseCompanyCost };
    throw new Error(`Unexpected import ${name}`);
  } });
  return { GET: exports.GET, POST: exports.POST, calls, row };
}
const post = (body: unknown, origin = "https://example.test") => new Request("https://example.test/api/admin/company-costs", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
test("company cost API denies nonowners before any ledger access", async () => {
  for (const options of [{ user: false }, { role: "member" }]) {
    const handler = route(options);
    const expected = options.user === false ? 401 : 403;
    assert.equal((await handler.GET()).status, expected);
    assert.equal((await handler.POST(post(handler.row))).status, expected);
    assert.equal(handler.calls.some((call) => call[1] === "beast_admin_company_costs"), false);
  }
});
test("company cost API rejects cross-origin writes and invalid input", async () => {
  const handler = route();
  assert.equal((await handler.POST(post(handler.row, "https://other.test"))).status, 403);
  assert.equal(handler.calls.length, 0);
  assert.equal((await handler.POST(post({ ...handler.row, amount_cents: -1 }))).status, 400);
  assert.equal(handler.calls.some((call) => call[0] === "upsert"), false);
});
test("company cost API fails closed on a truncated ledger", async () => {
  const handler = route({ count: 1001 });
  assert.equal((await handler.GET()).status, 503);
  assert.equal(handler.calls.some((call) => call[0] === "eq" && call[1] === "owner_id" && call[2] === "verified-owner"), true);
});
test("company cost API derives owner and preserves idempotent entry identity", async () => {
  const handler = route();
  const response = await handler.POST(post({ ...handler.row, owner_id: "attacker" }));
  assert.equal(response.status, 200);
  const mutation = handler.calls.find((call) => call[0] === "upsert")!;
  assert.equal((mutation[1] as Record<string, unknown>).owner_id, "verified-owner");
  assert.equal((mutation[1] as Record<string, unknown>).id, handler.row.id);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await route({ failSave: true }).POST(post(handler.row))).status, 503);
});
