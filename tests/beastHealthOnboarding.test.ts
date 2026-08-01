import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildHealthDiscoveryProgress,
  healthDiscoveryTopicIds,
  normalizeHealthDiscoveryState,
} from "../src/lib/health/discovery";
import type { HealthRecord, HealthRecordKind } from "../src/lib/health/foundation";

function record(
  recordType: HealthRecordKind,
  topic?: string,
  status: HealthRecord["status"] = "active"
): HealthRecord {
  return {
    id: `${recordType}-${topic || "record"}`,
    ownerId: "owner-1",
    recordType,
    title: "Owner-confirmed context",
    status,
    occurredOn: null,
    source: "Member-reported Health Advisor conversation",
    details: topic ? { topic } : {},
    notes: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
  };
}

test("BH-201 models every requested discovery topic without a questionnaire", () => {
  assert.equal(healthDiscoveryTopicIds.length, 14);
  assert.deepEqual(healthDiscoveryTopicIds, [
    "health-symptoms-needed",
    "health-conditions-needed",
    "health-medications-needed",
    "health-allergies-needed",
    "health-procedures-needed",
    "health-primary-care-needed",
    "health-specialists-needed",
    "health-insurance-needed",
    "health-emergency-contacts",
    "health-family-history-needed",
    "health-lifestyle-needed",
    "health-goals-needed",
    "health-appointments-needed",
    "health-vaccination-status-needed",
  ]);

  const workspace = readFileSync(
    "src/app/dashboard/health/HealthDiscoveryOnboarding.tsx",
    "utf8"
  );
  assert.match(workspace, /One question for now/);
  assert.match(workspace, /Skip for now/);
  assert.match(workspace, /Choose another area/);
  assert.match(workspace, /role="progressbar"/);
  assert.doesNotMatch(workspace, /<form/);
});

test("BH-201 derives completion from active health records and not skipped topics", () => {
  const state = normalizeHealthDiscoveryState({
    last_topic: "health-allergies-needed",
    skipped_topics: ["health-insurance-needed", "unknown-topic"],
  });
  const progress = buildHealthDiscoveryProgress(
    [
      record("medication"),
      record("profile", "health-allergies-needed"),
      record("condition", undefined, "archived"),
    ],
    state
  );

  assert.equal(progress.total, 13);
  assert.equal(progress.completed, 2);
  assert.equal(progress.percent, 15);
  assert.equal(
    progress.topics.find((topic) => topic.id === "health-insurance-needed")?.status,
    "skipped"
  );
  assert.equal(
    progress.topics.find((topic) => topic.id === "health-conditions-needed")?.status,
    "available"
  );
  assert.equal(progress.nextTopic?.id, "health-symptoms-needed");
});

test("BH-201 keeps planned BeastOS emergency contacts honest and outside completion", () => {
  const progress = buildHealthDiscoveryProgress([], {
    lastTopic: null,
    skippedTopics: [],
  });
  const emergency = progress.topics.find(
    (topic) => topic.id === "health-emergency-contacts"
  );
  assert.equal(emergency?.source, "beastos");
  assert.equal(emergency?.status, "unavailable");
  assert.equal(emergency?.href, "/dashboard/settings#emergency-contacts");
  assert.equal(progress.total, 13);
});

test("BH-201 persists only owner-scoped discovery workflow metadata", () => {
  const migration = readFileSync(
    "supabase/migrations/20260801000400_add_beast_health_discovery.sql",
    "utf8"
  );
  assert.match(migration, /owner_id uuid primary key references auth\.users\(id\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /profiles\.role = 'admin'/g);
  assert.match(migration, /last_topic text null/);
  assert.match(migration, /skipped_topics text\[\]/);
  assert.doesNotMatch(migration, /health_answer|clinical_details|medical_notes|diagnosis_text/i);
});

test("BH-201 routes discovery answers through the existing Health Advisor confirmation flow", () => {
  const advisor = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  const overview = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );
  assert.match(overview, /<HealthDiscoveryOnboarding/);
  assert.match(advisor, /health-primary-care-needed/);
  assert.match(advisor, /health-specialists-needed/);
  assert.match(advisor, /health-vaccination-status-needed/);
  assert.match(advisor, /provenance: "member_confirmed_conversation"/);
  assert.match(advisor, /\.from\("beast_health_records"\)/);
});
