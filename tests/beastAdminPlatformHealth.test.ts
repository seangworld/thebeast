import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminPlatformHealthStatusLabels,
  beastAdminPlatformServiceIds,
  buildBeastAdminPlatformHealthSnapshot,
  getBeastAdminPlatformHealthCounts,
  normalizeBeastAdminPlatformHealthSnapshot,
  type BeastAdminPlatformHealthSignal,
} from "../src/lib/beastAdminPlatformHealth";

function service(
  id: BeastAdminPlatformHealthSignal["id"],
  status: BeastAdminPlatformHealthSignal["status"] = "operational"
): BeastAdminPlatformHealthSignal {
  return {
    id,
    status,
    summary: `${id} ${status}`,
    evidence: `Evidence for ${id}.`,
    source: status === "unknown" ? "not_connected" : "live_probe",
    checkedAt: "2026-07-26T15:00:00.000Z",
    latencyMs: status === "unknown" ? null : 25,
  };
}

test("BA-109 monitors every requested platform service", () => {
  assert.deepEqual(beastAdminPlatformServiceIds, [
    "authentication",
    "database",
    "api",
    "storage",
    "email",
    "ai",
    "performance",
    "background_jobs",
  ]);
});

test("BA-109 derives errors and warnings only from service evidence", () => {
  const snapshot = buildBeastAdminPlatformHealthSnapshot({
    services: beastAdminPlatformServiceIds.map((id) =>
      service(
        id,
        id === "storage"
          ? "critical"
          : id === "ai"
            ? "warning"
            : id === "background_jobs"
              ? "unknown"
              : "operational"
      )
    ),
    generatedAt: "2026-07-26T15:00:00.000Z",
  });

  assert.equal(snapshot.overallStatus, "critical");
  assert.deepEqual(
    snapshot.errors.map((issue) => issue.serviceId),
    ["storage"]
  );
  assert.deepEqual(
    snapshot.warnings.map((issue) => issue.serviceId),
    ["ai"]
  );
  assert.deepEqual(getBeastAdminPlatformHealthCounts(snapshot), {
    operational: 5,
    warning: 1,
    critical: 1,
    unknown: 1,
  });
  assert.deepEqual(normalizeBeastAdminPlatformHealthSnapshot(snapshot), snapshot);
});

test("BA-117 treats missing monitoring as a gap instead of a warning or error", () => {
  const snapshot = buildBeastAdminPlatformHealthSnapshot({
    services: beastAdminPlatformServiceIds.map((id) =>
      service(id, ["email", "ai", "background_jobs"].includes(id)
        ? "unknown"
        : "operational")
    ),
    generatedAt: "2026-07-26T15:00:00.000Z",
  });

  assert.equal(snapshot.overallStatus, "unknown");
  assert.deepEqual(snapshot.errors, []);
  assert.deepEqual(snapshot.warnings, []);
  assert.equal(getBeastAdminPlatformHealthCounts(snapshot).unknown, 3);
  assert.equal(
    beastAdminPlatformHealthStatusLabels.unknown,
    "Monitoring gap"
  );
});

test("BA-109 refuses incomplete or duplicated platform snapshots", () => {
  assert.throws(
    () =>
      buildBeastAdminPlatformHealthSnapshot({
        services: beastAdminPlatformServiceIds
          .slice(0, -1)
          .map((id) => service(id)),
      }),
    /one signal for every monitored service/
  );
  assert.equal(
    normalizeBeastAdminPlatformHealthSnapshot({
      ...buildBeastAdminPlatformHealthSnapshot({
        services: beastAdminPlatformServiceIds.map((id) => service(id)),
      }),
      services: [
        service("authentication"),
        service("authentication"),
        ...beastAdminPlatformServiceIds
          .slice(2)
          .map((id) => service(id)),
      ],
    }),
    null
  );
});

test("BA-109 health API is owner-authorized, read-only, and evidence bounded", () => {
  const route = readFileSync(
    "src/app/api/admin/platform-health/route.ts",
    "utf8"
  );

  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /\.from\("profiles"\)/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /BeastAdmin owner access required/);
  assert.match(route, /\.from\("beast-documents"\)[\s\S]*\.list\(user\.id/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(
    route,
    /Email delivery monitoring has not been configured for this environment/
  );
  assert.match(
    route,
    /An AI provider has not been configured for this environment/
  );
  assert.match(
    route,
    /Background job monitoring has not been configured/
  );
  assert.match(route, /id: "ai",[\s\S]*status: "unknown"/);
  assert.match(route, /request sample, not an uptime claim/i);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /api\.openai\.com|chat\/completions/);
  assert.doesNotMatch(route, /sendEmail|signInWithOtp/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route, /\.download\(/);
});

test("BA-117 presents four honest states and expandable future monitoring", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/platform-health/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/platform-health/BeastAdminPlatformHealthWorkspace.tsx",
    "utf8"
  );
  const adminDashboard = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const model = readFileSync(
    "src/lib/beastAdminPlatformHealth.ts",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /Platform Health/);
  assert.match(page, /BeastAdminShell/);
  assert.match(workspace, /\/api\/admin\/platform-health/);
  assert.match(model, /authentication: "Authentication"/);
  assert.match(model, /database: "Database"/);
  assert.match(model, /api: "API"/);
  assert.match(model, /storage: "Storage"/);
  assert.match(model, /email: "Email"/);
  assert.match(model, /ai: "AI"/);
  assert.match(model, /performance: "Performance"/);
  assert.match(model, /background_jobs: "Background jobs"/);
  assert.match(workspace, /Errors/);
  assert.match(workspace, /Warnings/);
  assert.match(workspace, /Monitoring Gaps/);
  assert.match(workspace, /Operational status philosophy/);
  assert.match(workspace, /Verified healthy/);
  assert.match(workspace, /No owner-approved monitoring source exists/);
  assert.match(workspace, /Refresh now/);
  assert.match(workspace, /60_000/);
  assert.match(workspace, /Last successful probe/);
  assert.match(workspace, /Services checked/);
  assert.match(workspace, /Probe duration/);
  assert.match(workspace, /Average latency/);
  assert.match(workspace, /Latency trend/);
  assert.match(workspace, /Historical sampling/);
  assert.match(workspace, /Availability trend/);
  assert.match(workspace, /Scheduler/);
  assert.match(workspace, /Queue/);
  assert.match(workspace, /Workers/);
  assert.match(workspace, /Last successful execution/);
  assert.match(workspace, /Next scheduled execution/);
  assert.match(workspace, /Future approved sources such as Vercel, Supabase/);
  assert.match(workspace, /OpenAI,\s+Anthropic, email, background jobs, storage, or search/);
  assert.match(workspace, /last successful snapshot remains visible/i);
  assert.match(
    workspace,
    /does not\s+replace a centralized historical error feed/i
  );
  assert.doesNotMatch(workspace, /["']Unknown["']/);
  assert.match(workspace, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(workspace, /min-w-0/);
  assert.doesNotMatch(workspace, /overflow-x-hidden|w-screen/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(adminDashboard, /\/dashboard\/admin\/platform-health/);
  assert.match(navigation, /Platform Health/);
});
