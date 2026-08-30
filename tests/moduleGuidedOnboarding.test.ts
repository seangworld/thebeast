import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastEducationModuleGuidedTour,
  beastHealthGuidedTour,
  beastHomeGuidedTour,
  beastMoneyGuidedTour,
  createWhatsNewGuidedTour,
  guidedTourAnalyticsAction,
  resolveGuidedTourForPath,
  resolveGuidedToursForPath,
  shouldOfferGuidedTour,
} from "../src/lib/guidedOnboarding";

const moduleTours = [
  beastMoneyGuidedTour,
  beastHealthGuidedTour,
  beastEducationModuleGuidedTour,
  beastHomeGuidedTour,
] as const;

test("BO-UX-003 defines one versioned initial tour for each released major member module", () => {
  assert.deepEqual(
    moduleTours.map((tour) => tour.moduleId),
    ["money", "health", "learning", "home"]
  );
  for (const tour of moduleTours) {
    assert.equal(tour.experience, "initial");
    assert.equal(tour.offerMode, "automatic");
    assert.match(tour.version, /^\d+\.\d+\.\d+$/);
    assert.ok(tour.steps.length >= 4);
    assert.ok(tour.entryPath?.startsWith("/dashboard/"));
    assert.ok(tour.replayLabel?.startsWith("How to Use"));
  }
});

test("module tours teach released tasks without activating Coming Soon capabilities", () => {
  const copy = moduleTours
    .flatMap((tour) => tour.steps)
    .map((step) => `${step.title} ${step.description}`)
    .join(" ");
  assert.match(copy, /Bills/);
  assert.match(copy, /Health Advisor/);
  assert.match(copy, /Guidance Counselor/);
  assert.match(copy, /AI Tutor/);
  assert.match(copy, /Photo-to-Home-Inventory/);
  assert.doesNotMatch(copy, /Sentinel|Shield|AI Fitness Trainer|Connected Balances/);
});

test("route-aware selection follows the current eligible module and fails closed", () => {
  assert.equal(
    resolveGuidedTourForPath("/dashboard/money/dashboard", ["beastos", "money"])?.id,
    beastMoneyGuidedTour.id
  );
  assert.equal(
    resolveGuidedTourForPath("/dashboard/health", ["beastos", "health"])?.id,
    beastHealthGuidedTour.id
  );
  assert.equal(
    resolveGuidedTourForPath("/dashboard/education", ["beastos", "learning"])?.id,
    beastEducationModuleGuidedTour.id
  );
  assert.equal(
    resolveGuidedTourForPath("/dashboard/home", ["beastos", "home"])?.id,
    beastHomeGuidedTour.id
  );
  assert.equal(resolveGuidedTourForPath("/dashboard/money", ["beastos"]), null);
});

test("What's New is separately versioned and manual unless a material release opts in", () => {
  const whatsNew = createWhatsNewGuidedTour({
    id: "beastmoney-whats-new-example",
    version: "2.0.0",
    title: "What's New in BeastMoney",
    moduleId: "money",
    entryPath: "/dashboard/money/dashboard",
    steps: [{ id: "example", title: "A material release", description: "A targeted example." }],
  });
  assert.equal(whatsNew.experience, "whats_new");
  assert.equal(whatsNew.offerMode, "manual");
  assert.equal(shouldOfferGuidedTour(null, whatsNew), false);
  assert.notEqual(whatsNew.id, beastMoneyGuidedTour.id);
  assert.deepEqual(
    resolveGuidedToursForPath(
      "/dashboard/money/dashboard",
      ["beastos", "money"],
      [whatsNew]
    ).map((tour) => tour.id),
    [beastMoneyGuidedTour.id, whatsNew.id]
  );
});

test("incomplete offer/start state remains eligible until the member completes or skips", () => {
  const base = {
    version: beastMoneyGuidedTour.version,
    step: 0,
    updatedAt: "2026-08-30T00:00:00.000Z",
  } as const;
  assert.equal(shouldOfferGuidedTour({ ...base, status: "offered" }, beastMoneyGuidedTour), true);
  assert.equal(shouldOfferGuidedTour({ ...base, status: "started" }, beastMoneyGuidedTour), true);
  assert.equal(shouldOfferGuidedTour({ ...base, status: "completed" }, beastMoneyGuidedTour), false);
  assert.equal(shouldOfferGuidedTour({ ...base, status: "skipped" }, beastMoneyGuidedTour), false);
});

test("runtime mounts all route tours and safely resets/clamps state across definitions", () => {
  const component = readFileSync("src/app/components/GuidedTour.tsx", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  assert.match(component, /boundedStepIndex/);
  assert.match(component, /\[definition\.id\]/);
  assert.match(layout, /guidedTourDefinitions\.map/);
  assert.doesNotMatch(layout, /hidden min-\[390px\]/);
});

test("tour analytics identity is accepted in stable identifier form", () => {
  assert.equal(
    guidedTourAnalyticsAction("beastmoney-first-use"),
    "beastmoney_first_use"
  );
});

test("focus containment wraps backward navigation from the dialog container", () => {
  const component = readFileSync("src/app/components/GuidedTour.tsx", "utf8");
  assert.match(component, /document\.activeElement === dialogRef\.current/);
  assert.match(component, /event\.shiftKey \? lastControl : first/);
});

test("module entry surfaces expose responsive spotlight hooks and contextual replay", () => {
  const source = [
    readFileSync("src/app/dashboard/money/components/FinancialMissionControl.tsx", "utf8"),
    readFileSync("src/app/dashboard/health/BeastHealthWorkspace.tsx", "utf8"),
    readFileSync("src/app/dashboard/learning/BeastEducationExperience.tsx", "utf8"),
    readFileSync("src/app/dashboard/home/page.tsx", "utf8"),
  ].join("\n");
  for (const tour of moduleTours) {
    for (const step of tour.steps) {
      const hook = step.target?.match(/data-tour-step=\\?"([^"\\]+)\\?"/)?.[1];
      if (hook) assert.match(source, new RegExp(`data-tour-step=["']${hook}["']`));
    }
  }
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  assert.match(layout, /GuidedTourReplayButton/);
  assert.match(layout, /guidedTourDefinitions/);
  assert.match(layout, /\[&>button\]:w-full/);
});

test("privacy-bounded telemetry records tour lifecycle without member content", () => {
  const analytics = readFileSync("src/lib/analytics/productAnalytics.ts", "utf8");
  const client = readFileSync("src/lib/analytics/client.ts", "utf8");
  for (const event of [
    "onboarding_offered",
    "onboarding_started",
    "onboarding_completed",
    "onboarding_skipped",
    "onboarding_replayed",
    "whats_new_started",
    "whats_new_completed",
  ]) {
    assert.match(analytics, new RegExp(`"${event}"`));
  }
  assert.match(client, /action: string/);
  assert.doesNotMatch(client, /tourText|memberContent|financialContent|healthContent/);
});
