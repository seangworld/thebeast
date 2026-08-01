import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { HealthAdvisorRecommendation } from "../src/lib/health/healthAdvisor";
import type { HealthRecord, HealthRecordKind } from "../src/lib/health/foundation";
import {
  buildHealthAdvisorUnderstanding,
  nextHealthUnderstandingNeed,
} from "../src/lib/health/understanding";

function record(
  recordType: HealthRecordKind,
  title: string,
  topic?: string,
  status: HealthRecord["status"] = "active"
): HealthRecord {
  return {
    id: `${recordType}-${title}`,
    ownerId: "owner-1",
    recordType,
    title,
    status,
    occurredOn: null,
    source: "Member-reported Health Advisor conversation",
    details: topic ? { topic } : {},
    notes: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
  };
}

test("BH-202 separates known health context from missing understanding", () => {
  const understanding = buildHealthAdvisorUnderstanding({
    records: [
      record("condition", "Clinician-confirmed condition"),
      record("medication", "Member-entered medication"),
      record("provider", "Primary care practice"),
      record("profile", "Allergy context", "health-allergies-needed"),
      record("profile", "Coverage context", "health-insurance-needed"),
      record("procedure", "Past procedure", undefined, "archived"),
    ],
  });

  for (const area of [
    "conditions",
    "medications",
    "providers",
    "allergies",
    "insurance",
  ]) {
    const item = understanding.whatIKnow.find((candidate) => candidate.area === area);
    assert.equal(item?.state, "known");
    assert.equal(item?.confidence, "high");
    assert.ok(item?.evidence.length);
    assert.ok(item?.href);
  }
  assert.equal(
    understanding.whatIStillNeed.find((item) => item.area === "procedures")?.state,
    "needed"
  );
});

test("BH-202 keeps working ideas explicitly separate from medical facts", () => {
  const recommendation: HealthAdvisorRecommendation = {
    sourceRecommendationId: "prepare-appointment",
    title: "Prepare for the next visit",
    recommendation: "Consider organizing questions before the appointment.",
    href: "/dashboard/health/appointments",
    confidence: {
      label: "moderate",
      score: 0.65,
      basis: "An upcoming appointment is saved.",
    },
    limitations: ["No clinical interpretation."],
    supportingEvidence: [{ source: "Owner-entered appointment" }],
  };
  const understanding = buildHealthAdvisorUnderstanding({
    records: [],
    recommendations: [recommendation],
  });
  const thought = understanding.whatIThink[0];

  assert.equal(thought?.state, "thought");
  assert.equal(thought?.confidence, "medium");
  assert.match(thought?.value || "", /^Working idea only/);
  assert.match(thought?.why || "", /not a diagnosis or medical fact/);
  assert.equal(
    understanding.whatIKnow.some((item) => item.id === thought?.id),
    false
  );
});

test("BH-202 exposes a complete actionable checklist and updates from persisted records", () => {
  const empty = buildHealthAdvisorUnderstanding({ records: [] });
  for (const area of [
    "medications",
    "vaccinations",
    "family-history",
    "insurance",
    "providers",
    "lifestyle",
    "lab-records",
  ]) {
    const item = empty.whatIStillNeed.find((candidate) => candidate.area === area);
    assert.ok(item?.question, area);
    assert.equal(item?.confidence, "unknown");
  }
  assert.equal(nextHealthUnderstandingNeed(empty)?.area, "primary-health-concerns");

  const updated = buildHealthAdvisorUnderstanding({
    records: [record("profile", "Vaccination record", "health-vaccination-status-needed")],
  });
  assert.equal(
    updated.whatIStillNeed.some((item) => item.area === "vaccinations"),
    false
  );
  assert.equal(
    updated.whatIKnow.find((item) => item.area === "vaccinations")?.state,
    "known"
  );
});

test("BH-202 uses the Guidance Counselor shared understanding workspace", () => {
  const health = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  const shared = readFileSync(
    "src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx",
    "utf8"
  );
  assert.match(health, /buildHealthAdvisorUnderstanding/);
  assert.match(health, /ProfessionalKnowledgeWorkspace/);
  assert.match(health, /understanding\.whatIKnow/);
  assert.match(health, /understanding\.whatIThink/);
  assert.match(health, /understanding\.whatIStillNeed/);
  assert.match(health, /setRecords/);
  assert.match(shared, /title="What I Know"/);
  assert.match(shared, /title="What I Think"/);
  assert.match(shared, /title="What I Still Need"/);
  assert.match(shared, /Evidence source/);
  assert.match(shared, /confidence/);
});
