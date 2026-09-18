import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { operationsLinks, isOwnerWorkspacePath, isOperationsLinkActive } from "../src/lib/operationsNavigation";
import { beastAdminNavigation, buildOwnerNavigationForPersona } from "../src/lib/moduleNavigation";
import { canAccessBeastAdmin } from "../src/lib/beastAdmin";
import * as configuration from "../src/lib/supabase/config";
import * as authExperience from "../src/lib/auth/experience";

test("SEANGWORLD HQ destinations exist and business controls leave BeastAdmin", async () => {
  for (const item of operationsLinks) assert.ok(existsSync(`src/app${item.href}/page.tsx`), item.href);
  assert.equal(new Set(operationsLinks.map((item) => item.href)).size, operationsLinks.length);
  assert.ok(operationsLinks.some((item) => item.href === "/dashboard/operations/publishing"));
  assert.ok(operationsLinks.some((item) => item.href === "/dashboard/operations/production"));
  for (const item of beastAdminNavigation.children || []) assert.doesNotMatch(item.href, /\/(marketing|empire|company|intelligence|news|ads)(\/|$)/);
  const config = require("../../next.config.js");
  const redirects = (await config.redirects()) as { source: string; destination: string; permanent: boolean }[];
  const moved = redirects.filter((item) => item.destination.startsWith("/dashboard/operations"));
  assert.equal(moved.length, 15);
  for (const item of moved) {
    assert.ok(existsSync(`src/app${item.destination}/page.tsx`), item.destination);
    assert.equal(item.permanent, false);
    assert.ok(!redirects.some((other) => other.source === item.destination), "No redirect chains");
  }
});

function operationPageFiles(directory = "src/app/dashboard/operations"): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return operationPageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

test("SEANGWORLD HQ owns its route shell and BeastFusion placement", () => {
  const pages = operationPageFiles();
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.doesNotMatch(source, /BeastAdminShell/, page);
    assert.doesNotMatch(source, /export\s+\{\s*default\s*\}\s+from\s+["']@\/app\/dashboard\/admin/, page);
  }

  assert.ok(operationsLinks.some((item) => item.href === "/dashboard/operations/fusion"));
  assert.ok(!(beastAdminNavigation.children || []).some((item) => item.href === "/dashboard/admin/fusion"));

  const shell = readFileSync("src/app/dashboard/operations/OperationsWorkspaceShell.tsx", "utf8");
  assert.match(shell, /SEANGWORLD HQ · Owner Only/);
  assert.match(shell, /Keep business decisions, publishing, revenue, and cross-system orchestration here/);

  const adminAnalytics = readFileSync("src/app/dashboard/admin/analytics/page.tsx", "utf8");
  assert.doesNotMatch(adminAnalytics, /SeangworldIntelligenceWorkspace|BeastAdminNewsOperationsWorkspace/);
});

test("SEANGWORLD HQ access follows the owner persona and matches path boundaries", () => {
  for (const role of ["member", "beta", null, undefined]) assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: canAccessBeastAdmin({ role }) }), []);
  assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: canAccessBeastAdmin({ role: "admin", adminViewMode: "member" }) }), []);
  assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: true }).map((item) => item.label), ["SEANGWORLD HQ", "BeastAdmin"]);
  for (const path of ["/dashboard/operations", "/dashboard/operations/publishing", "/dashboard/admin/members"]) assert.equal(isOwnerWorkspacePath(path), true);
  for (const path of ["/dashboard/money", "/dashboard/operations-extra", "/dashboard/administrator"]) assert.equal(isOwnerWorkspacePath(path), false);
  assert.equal(isOperationsLinkActive("/dashboard/operations/publishing", "/dashboard/operations"), false);
  assert.equal(isOperationsLinkActive("/dashboard/operations/marketing/video-growth", "/dashboard/operations/marketing"), true);
});

function middlewareFor({ role = "admin", signedIn = true, profileError = false, missingProfile = false }: { role?: string; signedIn?: boolean; profileError?: boolean; missingProfile?: boolean } = {}) {
  const calls: string[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "verified-owner", user_metadata: { role: "admin" } } : null }, error: null }) },
    rpc: async () => ({ data: true, error: null }),
    from(table: string) {
      calls.push(table);
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: missingProfile ? null : { role }, error: profileError ? { message: "offline" } : null }) }) }) };
    },
  };
  const exports: { middleware?: (request: NextRequest) => Promise<NextResponse> } = {};
  const compiled = ts.transpileModule(readFileSync("src/middleware.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(compiled, { exports, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://operations-test.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-public-key-000000" } }, require: (name: string) => {
    if (name === "next/server") return { NextResponse };
    if (name === "@supabase/ssr") return { createServerClient: () => client };
    if (name === "@/lib/supabase/config") return configuration;
    if (name === "@/lib/auth/experience") return authExperience;
    if (name === "@/lib/moduleRegistry" || name === "@/lib/memberAgeEntitlements") return {};
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { run: exports.middleware!, calls };
}

test("Operations server enforcement allows owners and denies members, missing roles, and anonymous requests", async () => {
  for (const path of ["/dashboard/operations", "/dashboard/operations/publishing", "/dashboard/operations/finances"]) {
    const request = new NextRequest(`https://beast.test${path}`);
    assert.equal((await middlewareFor().run(request)).status, 200);
    for (const options of [{ role: "member" }, { role: "owner" }, { missingProfile: true }]) {
      const response = await middlewareFor(options).run(request);
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location")!).pathname, "/dashboard");
    }
    const anonymous = await middlewareFor({ signedIn: false }).run(request);
    assert.equal(anonymous.status, 307);
    assert.equal(new URL(anonymous.headers.get("location")!).pathname, "/login");
    const unavailable = await middlewareFor({ profileError: true }).run(request);
    assert.equal(unavailable.status, 503);
    assert.match(unavailable.headers.get("cache-control")!, /no-store/);
  }
});
