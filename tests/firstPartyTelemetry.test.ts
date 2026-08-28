import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FIRST_PARTY_TELEMETRY_CONTRACT_VERSION,
  FIRST_PARTY_TELEMETRY_MINIMUM_COHORT,
  FIRST_PARTY_TELEMETRY_RAW_RETENTION_DAYS,
  firstPartyPerformanceBucket,
  firstPartyTelemetryDerivedEvents,
  firstPartyTelemetryEventNames,
  isFirstPartyTelemetrySnapshot,
  normalizeFirstPartyTelemetryRecord,
  prohibitedFirstPartyTelemetryFields,
  type FirstPartyTelemetrySnapshot,
} from "../src/lib/firstPartyTelemetry";
import {
  digitalStaffTelemetryRecord,
  firstPartyErrorCategoryFromDigitalStaff,
  firstPartyTelemetryEnvironment,
} from "../src/lib/server/firstPartyTelemetry";
import {
  buildSeangworldRecommendations,
  type SeangworldAnalyticsData,
} from "../src/lib/seangworldIntelligence";

const migration = readFileSync(
  "supabase/migrations/20260817000100_add_first_party_ecosystem_telemetry.sql",
  "utf8"
);

function snapshot(overrides: Partial<FirstPartyTelemetrySnapshot> = {}): FirstPartyTelemetrySnapshot {
  return {
    contractVersion: FIRST_PARTY_TELEMETRY_CONTRACT_VERSION,
    windowDays: 30,
    generatedAt: "2026-08-17T12:00:00.000Z",
    environment: "production",
    source: "canonical_records_and_bounded_events",
    historicalTreatment: "derived_from_canonical_records",
    rawEventRetentionDays: FIRST_PARTY_TELEMETRY_RAW_RETENTION_DAYS,
    minimumCohortSize: FIRST_PARTY_TELEMETRY_MINIMUM_COHORT,
    coverage: { firstActivityAt: null, lastActivityAt: null },
    members: { registered: 0, verified: 0, onboardingCompleted: 0, activated: 0, activationRate: null },
    ownerAdmin: { accounts: 1, meaningfulActions: 0 },
    activity: { dau: 0, wau: 0, mau: 0, meaningfulActions: 0 },
    retention: [1, 7, 30].map((day) => ({ day: day as 1 | 7 | 30, eligibleMembers: 0, returnedMembers: 0, rate: null, status: "insufficient_data" as const })),
    moduleAdoption: [],
    crossModuleAdoption: [],
    professionalUsage: [],
    reliability: { successfulOperations: 0, failures: 0, timeouts: 0, failureRate: null, errorCategories: [] },
    funnel: [
      { stage: "account_created", count: 0 },
      { stage: "email_verified", count: 0 },
      { stage: "onboarding_completed", count: 0 },
      { stage: "activated", count: 0 },
      { stage: "returned", count: 0 },
    ],
    ...overrides,
  };
}

function intelligenceData(firstPartyTelemetry: FirstPartyTelemetrySnapshot | null): SeangworldAnalyticsData {
  return {
    firstPartyTelemetry,
    visitors: null, users: null, sessions: null, views: null, engagementRate: null,
    impressions: null, clicks: null, ctr: null, averagePosition: null,
    countries: [], searchCountries: [], cities: [], devices: [], searchDevices: [],
    browsers: [], operatingSystems: [], trafficSources: [], qualifiedTraffic: [], entryPages: [], exitPages: [],
    topQueries: [], topLandingPages: [], searchLandingPages: [],
    searchOpportunities: [], searchOpportunityBaseline: null,
    searchTrends: [], historicalTrends: [],
    deviceEngagement: null,
  };
}

test("BA-TEL-001 defines a bounded meaningful event taxonomy", () => {
  for (const event of [
    "onboarding_completed", "bill_created", "debt_created", "payment_recorded",
    "education_activity_completed", "health_record_added", "goal_completed",
    "document_uploaded", "professional_turn_completed", "professional_turn_failed",
  ]) assert.ok(firstPartyTelemetryEventNames.includes(event as never));
  assert.ok(firstPartyTelemetryDerivedEvents.includes("account_created"));
  assert.ok(firstPartyTelemetryDerivedEvents.includes("email_verified"));
  assert.equal(new Set(firstPartyTelemetryEventNames).size, firstPartyTelemetryEventNames.length);
});

test("telemetry accepts only governed categorical fields", () => {
  assert.deepEqual(normalizeFirstPartyTelemetryRecord({
    eventName: "professional_turn_completed",
    moduleId: "money",
    professionalId: "money_coach",
    outcome: "success",
    performanceBucket: "3s_to_10s",
    modelRoute: "ordinary",
  }), {
    eventName: "professional_turn_completed",
    moduleId: "money",
    professionalId: "money_coach",
    outcome: "success",
    performanceBucket: "3s_to_10s",
    modelRoute: "ordinary",
  });
  assert.equal(normalizeFirstPartyTelemetryRecord({ eventName: "clicked_everything", moduleId: "money", outcome: "success" }), null);
  assert.equal(normalizeFirstPartyTelemetryRecord({ eventName: "goal_created", moduleId: "goals", outcome: "success", goalText: "private" }), null);
  assert.equal(normalizeFirstPartyTelemetryRecord({ eventName: "payment_recorded", moduleId: "money", outcome: "success", amount: 500 }), null);
});

test("privacy contract explicitly prohibits sensitive identity and domain contents", () => {
  for (const field of [
    "name", "email", "address", "phone", "prompt", "response", "content",
    "goal_text", "filename", "diagnosis", "medication", "lab_value", "balance",
    "debt_amount", "bill_amount", "income_amount", "provider_token", "auth_secret",
  ]) assert.ok(prohibitedFirstPartyTelemetryFields.includes(field as never));
  const tableDefinition = migration.match(/create table if not exists public\.beast_telemetry_events \([\s\S]*?\n\);/)?.[0] || "";
  assert.ok(tableDefinition);
  assert.doesNotMatch(tableDefinition, /\bjsonb\b|\bpayload\b|\bcontent\b|\bmessage\b|\bamount\b|\bemail\b|\bname\s+text/);
});

test("environment and Digital Staff classification stay categorical", () => {
  assert.equal(firstPartyTelemetryEnvironment({ VERCEL_ENV: "production" }), "production");
  assert.equal(firstPartyTelemetryEnvironment({ VERCEL_ENV: "preview" }), "preview");
  assert.equal(firstPartyTelemetryEnvironment({ NODE_ENV: "test" }), "test");
  assert.equal(firstPartyPerformanceBucket(999), "under_1s");
  assert.equal(firstPartyPerformanceBucket(10_000), "over_10s");
  assert.equal(firstPartyErrorCategoryFromDigitalStaff("provider_timeout"), "timeout");
  assert.deepEqual(digitalStaffTelemetryRecord({ professionalId: "beasthealth.health-advisor", status: "completed", latencyMs: 4_000, model: "gpt-5" }), {
    eventName: "professional_turn_completed",
    moduleId: "health",
    professionalId: "health_advisor",
    outcome: "success",
    errorCategory: null,
    performanceBucket: "3s_to_10s",
    modelRoute: "strong",
  });
});

test("migration is append-only, server-write-only, owner-aggregate-only, and indexed", () => {
  assert.match(migration, /alter table public\.beast_telemetry_events enable row level security/);
  assert.match(migration, /revoke all on table public\.beast_telemetry_events from authenticated/);
  assert.match(migration, /grant insert on table public\.beast_telemetry_events to service_role/);
  assert.match(migration, /prevent_beast_telemetry_event_update/);
  assert.match(migration, /revoke all on function public\.record_beast_telemetry_event[\s\S]*from authenticated/);
  assert.match(migration, /if not public\.is_profile_admin\(\)/);
  assert.match(migration, /where profile\.role = 'user'/);
  assert.match(migration, /where event\.role = 'admin'/);
  assert.match(migration, /beast_telemetry_events_actor_time_idx/);
  assert.match(migration, /beast_telemetry_events_expiry_idx/);
  assert.match(migration, /interval '180 days'/);
  assert.match(migration, /minimum_cohort integer := 5/);
});

test("aggregate contract contains no member identity and validates the hybrid source", () => {
  const value = snapshot();
  assert.equal(isFirstPartyTelemetrySnapshot(value), true);
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /"ownerId"|"memberId"|"userId"|"email"|"name"/);
  assert.equal(value.source, "canonical_records_and_bounded_events");
  assert.equal(value.historicalTreatment, "derived_from_canonical_records");
});

test("small cohorts suppress retention and cross-module percentages", () => {
  assert.match(migration, /when retention\.eligible < minimum_cohort then null/);
  assert.match(migration, /when totals\.activated < minimum_cohort then null/);
  const value = snapshot();
  assert.ok(value.retention.every((row) => row.status === "insufficient_data" && row.rate === null));
});

test("first-party deterministic recommendations require verified thresholds", () => {
  const tooSmall = snapshot({
    members: { registered: 4, verified: 4, onboardingCompleted: 4, activated: 1, activationRate: 0.25 },
  });
  assert.deepEqual(buildSeangworldRecommendations(intelligenceData(tooSmall), "current vs prior"), []);

  const enough = snapshot({
    members: { registered: 10, verified: 9, onboardingCompleted: 10, activated: 4, activationRate: 0.4 },
    retention: [
      { day: 1, eligibleMembers: 6, returnedMembers: 3, rate: 0.5, status: "available" },
      { day: 7, eligibleMembers: 6, returnedMembers: 1, rate: 1 / 6, status: "available" },
      { day: 30, eligibleMembers: 0, returnedMembers: 0, rate: null, status: "insufficient_data" },
    ],
    reliability: { successfulOperations: 8, failures: 2, timeouts: 1, failureRate: 0.2, errorCategories: [{ category: "timeout", count: 1 }] },
  });
  assert.deepEqual(
    buildSeangworldRecommendations(intelligenceData(enough), "current vs prior").map((item) => item.id),
    ["low_member_activation", "low_d7_retention", "reliability_failures"]
  );
});

test("member instrumentation is non-blocking and Intelligence remains owner-only", () => {
  const onboarding = readFileSync("src/app/dashboard/onboarding/page.tsx", "utf8");
  const runtime = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  const telemetryRoute = readFileSync("src/app/api/telemetry/events/route.ts", "utf8");
  const intelligenceRoute = readFileSync("src/app/api/admin/seangworld-intelligence/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/intelligence/FirstPartyTelemetryPanels.tsx", "utf8");
  assert.match(onboarding, /void sendFirstPartyTelemetry/);
  assert.match(runtime, /void recordServerFirstPartyTelemetry/);
  assert.match(telemetryRoute, /Authentication required/);
  assert.match(telemetryRoute, /primary action remains complete/);
  assert.match(intelligenceRoute, /profile\?\.role !== "admin"/);
  for (const label of ["Registered members", "Verified members", "Activated members", "DAU", "WAU", "MAU", "Day 7", "Owner\/Admin", "Digital Professional usage", "Reliability and data governance", "Cohort too small"]) assert.match(workspace, new RegExp(label));
  assert.doesNotMatch(workspace, /member\.id|data\.(?:memberId|actorId|ownerId|email)|actorId|ownerId/);
});
