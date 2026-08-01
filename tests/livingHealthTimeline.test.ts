import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { HealthRecord, HealthRecordKind } from "../src/lib/health/foundation";
import {
  buildLivingHealthTimeline,
  classifyLivingHealthEvent,
  filterLivingHealthTimeline,
  findLivingTimelineDateTarget,
} from "../src/lib/health/livingTimeline";

function record(input: {
  id: string;
  recordType: HealthRecordKind;
  title: string;
  occurredOn: string;
  status?: HealthRecord["status"];
  source?: string | null;
  details?: HealthRecord["details"];
}): HealthRecord {
  return {
    id: input.id,
    ownerId: "owner-1",
    recordType: input.recordType,
    title: input.title,
    status: input.status || "active",
    occurredOn: input.occurredOn,
    source: input.source === undefined ? "Owner-confirmed source" : input.source,
    details: input.details || {},
    notes: null,
    createdAt: `${input.occurredOn}T12:00:00.000Z`,
    updatedAt: `${input.occurredOn}T12:00:00.000Z`,
  };
}

const storyRecords: HealthRecord[] = [
  record({ id: "condition-1", recordType: "condition", title: "Saved condition", occurredOn: "2026-01-01" }),
  record({ id: "medication-1", recordType: "medication", title: "Saved medication", occurredOn: "2026-01-02" }),
  record({ id: "procedure-1", recordType: "procedure", title: "Saved procedure", occurredOn: "2026-01-03" }),
  record({ id: "symptom-1", recordType: "profile", title: "Saved symptom", occurredOn: "2026-01-04", details: { topic: "health-symptoms-needed" } }),
  record({ id: "appointment-1", recordType: "appointment", title: "Upcoming visit", occurredOn: "2026-01-05" }),
  record({ id: "hospital-1", recordType: "procedure", title: "Hospital admission", occurredOn: "2026-01-06" }),
  record({ id: "lab-1", recordType: "document", title: "Laboratory result", occurredOn: "2026-01-07", details: { topic: "health-lab-records-needed" } }),
  record({ id: "vaccination-1", recordType: "profile", title: "Vaccination record", occurredOn: "2026-01-08", details: { topic: "health-vaccination-status-needed" } }),
  record({ id: "document-1", recordType: "document", title: "Care document", occurredOn: "2026-01-09" }),
  record({ id: "provider-1", recordType: "provider", title: "Primary Care Practice", occurredOn: "2026-01-10" }),
  record({
    id: "visit-1",
    recordType: "appointment",
    title: "Primary Care Practice follow-up",
    occurredOn: "2026-01-11",
    status: "historical",
    details: {
      provider_id: "provider-1",
      condition_id: "condition-1",
      document_id: "document-1",
      conversation_id: "conversation-123",
    },
  }),
  record({ id: "goal-1", recordType: "profile", title: "Health goal", occurredOn: "2026-01-12", details: { topic: "health-goals-needed" } }),
  record({ id: "lifestyle-1", recordType: "lifestyle", title: "Lifestyle milestone", occurredOn: "2026-01-13" }),
  record({ id: "conclusion-1", recordType: "profile", title: "Physician conclusion", occurredOn: "2026-01-14", details: { topic: "health-clinician-outcomes-needed" } }),
];

test("BH-203 classifies every required living health story event", () => {
  const timeline = buildLivingHealthTimeline(storyRecords);
  const types = new Set(timeline.map((event) => event.eventType));
  for (const type of [
    "condition",
    "medication",
    "procedure",
    "symptom",
    "appointment",
    "hospitalization",
    "lab_result",
    "vaccination",
    "document",
    "provider_visit",
    "health_goal",
    "lifestyle_milestone",
    "physician_conclusion",
  ]) {
    assert.equal(types.has(type as never), true, type);
  }
  assert.equal(
    classifyLivingHealthEvent(storyRecords.find((item) => item.id === "provider-1")!),
    "provider_record"
  );
});

test("BH-203 preserves source and explicit record document provider and conversation links", () => {
  const timeline = buildLivingHealthTimeline(storyRecords);
  const visit = timeline.find((event) => event.id === "visit-1");
  assert.equal(visit?.dateKey, "2026-01-11");
  assert.equal(visit?.source, "Owner-confirmed source");
  assert.deepEqual(
    visit?.linkedRecords.map((link) => link.id).sort(),
    ["condition-1", "provider-1", "visit-1"]
  );
  assert.deepEqual(visit?.documents.map((link) => link.id), ["document-1"]);
  assert.deepEqual(visit?.providers.map((link) => link.id), ["provider-1"]);
  assert.deepEqual(visit?.conditions.map((link) => link.id), ["condition-1"]);
  assert.deepEqual(visit?.conversationReferences, ["conversation-123"]);
  assert.match(visit?.primaryRecord.href || "", /appointments#health-record-visit-1/);
});

test("BH-203 searches filters and finds exact or closest dates without inventing events", () => {
  const timeline = buildLivingHealthTimeline(storyRecords);
  assert.deepEqual(
    filterLivingHealthTimeline(timeline, { query: "primary care", eventType: "provider_visit" }).map((event) => event.id),
    ["visit-1"]
  );
  assert.equal(findLivingTimelineDateTarget(timeline, "2026-01-07")?.id, "lab-1");
  assert.equal(findLivingTimelineDateTarget(timeline, "2026-01-15")?.id, "conclusion-1");
  assert.equal(findLivingTimelineDateTarget([], "2026-01-15"), null);
});

test("BH-203 provides responsive accessible timeline controls and honest empty relationships", () => {
  const workspace = readFileSync(
    "src/app/dashboard/health/LivingHealthTimeline.tsx",
    "utf8"
  );
  const healthWorkspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );
  const advisor = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  for (const label of [
    "Search health story",
    "Show only",
    "Go to date",
    "Go to doctor or specialist",
    "Go to condition",
    "Related records",
    "Health documents",
    "Doctors and specialists",
    "Health Advisor conversations",
  ]) {
    assert.match(workspace, new RegExp(label));
  }
  assert.match(workspace, /None linked/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /focus-visible:outline/);
  assert.match(workspace, /min-w-0/);
  assert.doesNotMatch(workspace, /overflow-x-hidden/);
  assert.match(healthWorkspace, /<LivingHealthTimeline/);
  assert.match(advisor, /conversation_id: activeConversationId \|\| null/);
});
