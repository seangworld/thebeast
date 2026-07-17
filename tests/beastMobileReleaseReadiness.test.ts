import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileReleaseReadiness,
  buildMobileReleaseSmokeRoutes,
  mobilePerformanceBudget,
  mobileReleaseAnalyticsEvents,
  mobileReleaseGates,
} from "../src/lib/mobileReleaseReadiness";

test("BF-MOB-009 defines release-blocking mobile readiness gates", () => {
  assert.deepEqual(
    mobileReleaseGates.map((gate) => gate.id),
    [
      "route-smoke",
      "analytics-markers",
      "performance-budget",
      "responsive-widths",
      "source-owned-actions",
      "production-smoke-plan",
      "supabase-skip",
    ]
  );
  assert.equal(mobileReleaseGates.every((gate) => gate.releaseBlocking), true);
});

test("BF-MOB-009 keeps mobile analytics taxonomy PII-safe and source-owned", () => {
  assert.deepEqual(
    mobileReleaseAnalyticsEvents.map((event) => event.id),
    [
      "beast_mobile_nav_open",
      "beast_mobile_route_open",
      "beast_mobile_quick_action",
      "beast_mobile_runtime_state_visible",
    ]
  );
  assert.equal(mobileReleaseAnalyticsEvents.every((event) => event.piiSafe), true);
  assert.equal(mobileReleaseAnalyticsEvents.every((event) => event.sourceOwned), true);
});

test("BF-MOB-009 builds mobile smoke routes from permission-aware route inventory", () => {
  const ownerRoutes = buildMobileReleaseSmokeRoutes({
    subject: { role: "admin" },
  }).map((route) => route.href);
  const memberRoutes = buildMobileReleaseSmokeRoutes({
    subject: { role: "user" },
  }).map((route) => route.href);
  const viewAsMemberRoutes = buildMobileReleaseSmokeRoutes({
    subject: { role: "admin" },
    adminViewMode: "member",
  }).map((route) => route.href);

  assert.ok(ownerRoutes.includes("/dashboard/money"));
  assert.ok(ownerRoutes.includes("/dashboard/learning"));
  assert.ok(ownerRoutes.includes("/dashboard/health"));
  assert.ok(ownerRoutes.includes("/dashboard/home"));
  assert.equal(ownerRoutes.includes("/dashboard/admin"), false);
  assert.equal(memberRoutes.includes("/dashboard/admin"), false);
  assert.equal(viewAsMemberRoutes.includes("/dashboard/admin"), false);
});

test("BF-MOB-009 defines performance and responsive release budgets", () => {
  assert.deepEqual([...mobilePerformanceBudget.supportedWidths], [320, 375, 390, 430]);
  assert.equal(mobilePerformanceBudget.maxPageHorizontalOverflowPx, 0);
  assert.ok(mobilePerformanceBudget.maxFirstLoadKb <= 320);
  assert.ok(mobilePerformanceBudget.maxRouteResponseMs <= 2000);
});

test("BF-MOB-009 exposes reusable release readiness and smoke tooling", () => {
  const readiness = buildMobileReleaseReadiness({
    subject: { role: "admin" },
  });
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/mobile-release-smoke.mjs", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.equal(readiness.packageId, "BF-MOB-009");
  assert.equal(readiness.supabaseRequired, false);
  assert.ok(readiness.routes.some((route) => route.href === "/dashboard/today"));
  assert.equal(
    packageJson.scripts["mobile:release-smoke"],
    "node scripts/mobile-release-smoke.mjs"
  );
  assert.match(script, /MOBILE_SMOKE_BASE_URL/);
  assert.match(script, /\/dashboard\/money/);
  assert.match(layout, /data-mobile-release-readiness="bf-mob-009"/);
  assert.match(layout, /data-mobile-analytics-event="beast_mobile_route_open"/);
});
