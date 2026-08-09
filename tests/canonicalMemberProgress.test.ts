import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCanonicalEducationUnderstanding } from "../src/lib/education/canonicalUnderstanding";
import { buildHealthDiscoveryProgress } from "../src/lib/health/discovery";
import { buildHealthOverview, buildHealthTimeline, type HealthRecord, type HealthRecordKind } from "../src/lib/health/foundation";
import { buildHealthAdvisorUnderstanding } from "../src/lib/health/understanding";

function health(kind: HealthRecordKind, title: string, details: HealthRecord["details"] = {}, occurredOn: string | null = null): HealthRecord {
  return { id: `${kind}-${title}`, ownerId: "owner-1", recordType: kind, title, status: "active", occurredOn, source: "Member-reported Health Advisor conversation", details, notes: null, createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" };
}

test("BH-207 requires meaningful canonical coverage instead of row existence", () => {
  const generic = buildHealthDiscoveryProgress([health("medication", "Current medications", { context: "Conversation captured." })], { lastTopic: null, skippedTopics: [] });
  assert.equal(generic.categories.find((item) => item.id === "medications")?.percent, 0);

  const medications = ["One", "Two", "Three", "Four", "Five"].map((name) => health("medication", name, { medicationName: name }));
  const itemized = buildHealthDiscoveryProgress(medications, { lastTopic: null, skippedTopics: [] });
  assert.equal(itemized.categories.find((item) => item.id === "medications")?.percent, 60);
  assert.notEqual(itemized.categories.find((item) => item.id === "medications")?.percent, 100);
});

test("BH-207 accepts an explicit negative and presents useful known context", () => {
  const negative = health("profile", "No known allergies", { topic: "health-allergies-needed", context: "I have no known allergies." });
  const progress = buildHealthDiscoveryProgress([negative], { lastTopic: null, skippedTopics: [] });
  assert.equal(progress.topics.find((item) => item.id === "health-allergies-needed")?.status, "complete");
  const known = buildHealthAdvisorUnderstanding({ records: [negative] }).whatIKnow.find((item) => item.area === "allergies");
  assert.match(known?.value || "", /No known allergies.*confirmed by member/i);
  assert.doesNotMatch(known?.value || "", /health-allergies-needed|[0-9a-f]{8}-[0-9a-f-]{27,}/i);
});

test("BH-207 asks entity-specific unanswered questions and does not repeat answered fields", () => {
  const medication = health("medication", "Example medicine", { medicationName: "Example medicine", frequency: "Daily" });
  const procedure = health("procedure", "Example procedure", { procedureName: "Example procedure" });
  const understanding = buildHealthAdvisorUnderstanding({ records: [medication, procedure] });
  assert.match(understanding.whatIStillNeed.find((item) => item.area === "medications")?.question || "", /what dose/i);
  assert.match(understanding.whatIStillNeed.find((item) => item.area === "procedures")?.question || "", /when did .* occur/i);
  assert.doesNotMatch(understanding.whatIStillNeed.find((item) => item.area === "medications")?.question || "", /how often/i);
});

test("BH-207 overview and timeline count canonical entities and omit a generic aggregate", () => {
  const records = [
    health("medication", "Current medications", { context: "Five medications discussed." }),
    ...["One", "Two", "Three", "Four", "Five"].map((name) => health("medication", name, { medicationName: name })),
  ];
  assert.equal(buildHealthOverview(records).counts.medication, 5);
  assert.equal(buildHealthOverview(records).totalRecords, 5);
  assert.equal(buildHealthTimeline(records).length, 5);
});

test("BE-207 uses structured human-readable education facts and ignores a generic blob", () => {
  const result = buildCanonicalEducationUnderstanding([
    { id: "internal-uuid", category: "school", label: "Education history", value: "one conversation blob" },
    { id: "school-uuid", category: "school", label: "School", value: { entityType: "school", institution: "Example High School" }, verification_status: "member_reported" },
  ]);
  assert.equal(result.known.length, 1);
  assert.match(result.known[0]?.value || "", /Example High School/);
  assert.doesNotMatch(JSON.stringify(result), /internal-uuid|school-uuid|entityType/);
});

test("BE-207 preserves Admin diagnostics while member surfaces use canonical presentation", () => {
  const admin = readFileSync("src/app/dashboard/admin/knowledge/BeastAdminKnowledgeInspectorWorkspace.tsx", "utf8");
  const member = readFileSync("src/app/dashboard/learning/GuidanceCounselorConversation.tsx", "utf8");
  assert.match(admin, /diagnostic|provenance|inspector/i);
  assert.match(member, /buildCanonicalEducationUnderstanding/);
  assert.doesNotMatch(member, /schema ownership|database ownership/i);
});
