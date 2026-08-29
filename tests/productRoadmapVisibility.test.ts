import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getProductRoadmapItem,
  getProductRoadmapItemForAudience,
  getProductRoadmapItemsForAudience,
  hasValidDevelopmentTruth,
  isUnavailableRoadmapStatus,
  productRoadmapItems,
  productRoadmapStatuses,
  productRoadmapStatusLabels,
} from "../src/lib/productRoadmapVisibility";

test("BO-UX-002 exposes one reusable and honest availability model", () => {
  assert.deepEqual(productRoadmapStatuses, [
    "available",
    "preview_beta",
    "in_development",
    "coming_soon",
  ]);
  assert.deepEqual(Object.values(productRoadmapStatusLabels), [
    "Available",
    "Preview / Beta",
    "In Development",
    "Coming Soon",
  ]);

  for (const item of productRoadmapItems) {
    assert.ok(item.summary.length > 20);
    assert.ok(item.problem.length > 20);
    assert.ok(item.sourcePackage);
    assert.ok(item.sourceReference);
    assert.equal(hasValidDevelopmentTruth(item), true);
    if (isUnavailableRoadmapStatus(item.status)) {
      assert.match(item.availability, /not available|cannot be used|cannot be connected/i);
      assert.equal(item.currentHref, undefined);
    }
  }
});

test("BO-UX-002 includes only the four owner-approved upcoming capabilities", () => {
  const comingSoon = productRoadmapItems
    .filter((item) => item.status === "coming_soon")
    .map((item) => item.capability)
    .sort();

  assert.deepEqual(comingSoon, [
    "AI Fitness Trainer",
    "BeastHome Sentinel",
    "BeastHome Shield",
    "Connected Balances",
  ]);
  assert.equal(productRoadmapItems.some((item) => item.status === "in_development"), false);
});

test("Connected Balances remains read-only, unavailable, and non-transactional", () => {
  const balances = getProductRoadmapItem("connected-balances");
  assert.ok(balances);
  assert.equal(balances.status, "coming_soon");
  assert.match(balances.summary, /read-only/i);
  assert.match(balances.availability, /No institution can be connected/i);

  const detail = readFileSync(
    "src/app/components/ProductRoadmapVisibility.tsx",
    "utf8"
  );
  assert.match(detail, /does not include transactions/);
  assert.match(detail, /payment initiation/);
  assert.match(detail, /money movement/);
  assert.match(detail, /write access/);
});

test("public, member, module, and owner Product Roadmap surfaces stay presentation-only", () => {
  const publicPage = readFileSync("src/app/coming-soon/page.tsx", "utf8");
  const publicDetail = readFileSync("src/app/coming-soon/[slug]/page.tsx", "utf8");
  const memberPage = readFileSync("src/app/dashboard/roadmap/page.tsx", "utf8");
  const memberDetail = readFileSync("src/app/dashboard/roadmap/[slug]/page.tsx", "utf8");
  const adminModules = readFileSync("src/app/dashboard/admin/modules/page.tsx", "utf8");

  assert.match(publicPage, /robots: \{ index: false/);
  assert.match(publicPage, /not a promise of a date or working functionality/);
  assert.match(publicDetail, /generateStaticParams/);
  assert.match(memberPage, /cannot activate or execute/);
  assert.match(memberDetail, /ProductRoadmapDetail/);
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const moneyNavigation = readFileSync("src/lib/moneyNavigation.ts", "utf8");
  assert.doesNotMatch(navigation, /· Coming Soon/);
  assert.doesNotMatch(moneyNavigation, /Connected Balances · Coming Soon/);
  assert.match(adminModules, /Presentation-only BO-UX-002 allowlist/);
  assert.match(adminModules, /cannot edit status, authorize work/);

  const publicItems = getProductRoadmapItemsForAudience("public");
  const memberItems = getProductRoadmapItemsForAudience("member");
  assert.ok(publicItems.every((item) => item.audiences.includes("public")));
  assert.ok(memberItems.every((item) => item.audiences.includes("member")));
  assert.equal(getProductRoadmapItemForAudience("home-sentinel", "public")?.slug, "home-sentinel");

  assert.match(publicDetail, /getProductRoadmapItemForAudience\(\(await params\)\.slug, "public"\)/);
  assert.match(memberDetail, /getProductRoadmapItemForAudience\(\(await params\)\.slug, "member"\)/);
});

test("BeastHealth dashboard carries its coming-soon preview without changing record workspaces", () => {
  const healthWorkspace = readFileSync("src/app/dashboard/health/BeastHealthWorkspace.tsx", "utf8");
  const overviewStart = healthWorkspace.indexOf("export function HealthOverviewWorkspace");
  const timelineStart = healthWorkspace.indexOf("export function HealthTimelineWorkspace");
  const overview = healthWorkspace.slice(overviewStart, timelineStart);
  const recordWorkspace = healthWorkspace.slice(0, overviewStart);
  assert.match(overview, /ProductRoadmapModulePreview product="BeastHealth"/);
  assert.doesNotMatch(recordWorkspace, /ProductRoadmapModulePreview product="BeastHealth"/);
});

test("Product Roadmap cards include responsive layouts and usable detail links", () => {
  const component = readFileSync(
    "src/app/components/ProductRoadmapVisibility.tsx",
    "utf8"
  );
  assert.match(component, /md:grid-cols-2/);
  assert.match(component, /xl:grid-cols-3/);
  assert.match(component, /min-h-11/);
  assert.match(component, /Preview capability/);
  assert.match(component, /Current availability/);
});
