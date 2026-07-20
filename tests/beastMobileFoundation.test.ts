import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  beastMobileBreakpointPx,
  beastMobileSupportedWidths,
  buildMobileCoreRoutes,
  buildMobileModuleCards,
  buildMobileNavigation,
} from "../src/lib/mobileFoundation";
import type { PlatformIntelligence } from "../src/lib/platform/types";

const mobileIntelligence: PlatformIntelligence = {
  recommendations: [],
  notifications: [],
  activities: [],
  timelineEvents: [],
  moduleSummaries: [
    {
      module: "money",
      label: "Money",
      status: "live",
      health: "stable",
      alerts: 1,
      recommendations: 2,
      activityCount: 3,
      summary: "Money daily actions are ready.",
      href: "/dashboard/money",
    },
    {
      module: "learning",
      label: "Learning",
      status: "ready",
      health: "stable",
      alerts: 0,
      recommendations: 1,
      activityCount: 1,
      summary: "Mentor quick action is ready.",
      href: "/dashboard/learning",
    },
    {
      module: "health",
      label: "Health",
      status: "coming_soon",
      health: "pending",
      alerts: 0,
      recommendations: 0,
      activityCount: 0,
      summary: "Owner-only health foundation.",
      href: "/dashboard/health",
    },
    {
      module: "admin",
      label: "Admin",
      status: "ready",
      health: "stable",
      alerts: 0,
      recommendations: 0,
      activityCount: 0,
      summary: "Owner operations.",
      href: "/dashboard/admin",
    },
  ],
};

test("BF-MOB-002 builds mobile primary navigation without desktop sidebar density", () => {
  const navigation = buildMobileNavigation({ isOwner: true });

  assert.deepEqual(
    navigation.primary.map((item) => item.label),
    ["Today", "Money", "Calendar", "AI", "More"]
  );
  assert.equal(navigation.primary.length, 5);
  assert.ok(navigation.more.some((item) => item.label === "Notifications"));
  assert.ok(navigation.more.some((item) => item.label === "Quick Uploads"));
  assert.ok(navigation.more.some((item) => item.label === "Shared AI"));
});

test("BF-MOB-002 preserves desktop navigation while adding a mobile shell", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");

  assert.match(layout, /hidden w-20 .* md:block lg:w-72/);
  assert.match(layout, /aria-label="Mobile navigation"/);
  assert.match(layout, /pb-\[calc\(env\(safe-area-inset-bottom\)\+8px\)\]/);
  assert.match(dashboard, /data-beast-mobile-shell="home"/);
  assert.match(dashboard, /className="hidden space-y-8 md:block"/);
  assert.match(css, /width: 100%;/);
  assert.match(css, /min-width: 0;/);
  assert.doesNotMatch(css, /overflow-x: (?:clip|hidden)/);
});

test("BF-MOB-002 keeps module visibility permission-aware including View As Member", () => {
  const memberCards = buildMobileModuleCards({
    subject: { role: "user" },
    intelligence: mobileIntelligence,
  });
  const ownerCards = buildMobileModuleCards({
    subject: { role: "admin" },
    intelligence: mobileIntelligence,
  });
  const viewAsMemberCards = buildMobileModuleCards({
    subject: { role: "admin" },
    adminViewMode: "member",
    intelligence: mobileIntelligence,
  });

  assert.deepEqual(memberCards.map((card) => card.module), ["money", "learning"]);
  assert.deepEqual(ownerCards.map((card) => card.module), [
    "money",
    "learning",
    "health",
  ]);
  assert.deepEqual(viewAsMemberCards.map((card) => card.module), [
    "money",
    "learning",
  ]);
  assert.equal(ownerCards.some((card) => card.module === "admin"), false);
});

test("BF-MOB-002 defines core mobile routes and supported phone widths", () => {
  const routes = buildMobileCoreRoutes({
    subject: { role: "admin" },
    adminViewMode: "member",
  });

  assert.equal(beastMobileBreakpointPx, 768);
  assert.deepEqual([...beastMobileSupportedWidths], [320, 375, 390, 430]);
  assert.ok(routes.some((route) => route.href === "/dashboard/today"));
  assert.ok(routes.some((route) => route.href === "/dashboard/notifications"));
  assert.ok(routes.some((route) => route.href === "/dashboard/calendar"));
  assert.ok(routes.some((route) => route.href === "/dashboard/search"));
  assert.ok(routes.some((route) => route.href === "/dashboard/search#shared-ai"));
  assert.ok(routes.some((route) => route.href === "/dashboard/uploads"));
  assert.ok(routes.some((route) => route.href === "/dashboard/goals"));
  assert.equal(routes.some((route) => route.href === "/dashboard/admin"), false);
});
