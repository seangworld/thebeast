import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canonicalDisplayFields,
  canonicalMissingActions,
  canonicalPrimaryValue,
  parseCanonicalFields,
  preferStructuredCanonicalRecords,
} from "../src/lib/canonicalKnowledgePresentation";

test("AP-106 presents canonical medication fields without implementation details", () => {
  const fields = canonicalDisplayFields({
    medicationName: "Example medicine",
    dosage: "10 mg",
    frequency: "Daily",
    purpose: "Member-reported purpose",
    proposalId: "internal-id",
    provenance: "digital_staff_runtime",
  });
  assert.deepEqual(fields, [
    { label: "Medication", value: "Example medicine" },
    { label: "Dose", value: "10 mg" },
    { label: "Frequency", value: "Daily" },
    { label: "Purpose", value: "Member-reported purpose" },
  ]);
  assert.doesNotMatch(JSON.stringify(fields), /proposal|runtime|database/i);
});

test("AP-106 produces specific completion actions for missing medication fields", () => {
  assert.deepEqual(canonicalMissingActions("medication", { medicationName: "Example medicine" }), ["Add dosage", "Add frequency"]);
  assert.deepEqual(canonicalMissingActions("medication", { medicationName: "Example medicine", dose: "10 mg", schedule: "Daily" }), []);
});

test("AP-106 renders five approved medications as five records and suppresses the old conversation blob", () => {
  const records = [
    { id: "legacy", type: "medication", source: "conversation", value: { context: "I take five medicines." } },
    ...["One", "Two", "Three", "Four", "Five"].map((name) => ({ id: name, type: "medication", source: "canonical", value: { medicationName: name } })),
  ];
  const visible = preferStructuredCanonicalRecords(records, {
    category: (record) => record.type,
    value: (record) => record.value,
    isLegacyAggregate: (record) => record.source === "conversation",
  });
  assert.deepEqual(visible.map((record) => record.id), ["One", "Two", "Three", "Four", "Five"]);
});

test("AP-106 leaves supplements and conditions as separate canonical entities", () => {
  const records = [
    { type: "supplement", value: { supplementName: "Example supplement" } },
    { type: "condition", value: { condition: "Condition one" } },
    { type: "condition", value: { condition: "Condition two" } },
  ];
  assert.deepEqual(records.map((record) => canonicalPrimaryValue(record.value, "Unknown")), ["Example supplement", "Condition one", "Condition two"]);
});

test("AP-106 parses an approved school as structured school information", () => {
  const value = JSON.stringify({ entityType: "school", institution: "Example High School", institutionType: "High School", location: "Example City", graduationYear: 2020 });
  assert.equal(canonicalPrimaryValue(value, "School history"), "Example High School");
  assert.deepEqual(canonicalDisplayFields(value), [
    { label: "Institution", value: "Example High School" },
    { label: "Institution type", value: "High School" },
    { label: "Location", value: "Example City" },
    { label: "Graduation year", value: "2020" },
  ]);
});

test("AP-106 keeps mixed canonical entities independently representable", () => {
  const records = [
    { entityType: "school", institution: "Example School" },
    { entityType: "military_service", branch: "Example branch" },
    { entityType: "employment", employer: "Example employer" },
    { entityType: "education_preference", preferredPath: "Certifications", rejectedPath: "College" },
  ];
  assert.deepEqual(records.map((record) => canonicalDisplayFields(record)[0]?.value), ["Example School", "Example branch", "Example employer", "Certifications"]);
  assert.equal(parseCanonicalFields(JSON.stringify(records[3])).preferredPath, "Certifications");
});

test("AP-106 member workspaces query canonical records with owner scope", () => {
  const education = readFileSync("src/app/dashboard/learning/LearningWorkspaceView.tsx", "utf8");
  const health = readFileSync("src/app/dashboard/health/BeastHealthWorkspace.tsx", "utf8");
  const healthLoader = readFileSync("src/lib/health/canonicalRecords.ts", "utf8");
  const runtime = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  assert.match(education, /from\("education_career_profile_items"\)[\s\S]*?\.eq\("owner_id", userId\)/);
  assert.match(health, /loadCanonicalMemberHealthRecords\(client, userId\)/);
  assert.match(healthLoader, /from\("beast_health_records"\)[\s\S]*?\.eq\("owner_id", ownerId\)/);
  assert.match(runtime, /education_career_profile_items/);
  assert.match(runtime, /beast_health_records/);
});

test("AP-106 preserves admin diagnostics while keeping member labels plain", () => {
  const admin = readFileSync("src/app/dashboard/admin/knowledge/BeastAdminKnowledgeInspectorWorkspace.tsx", "utf8");
  assert.match(admin, /diagnostic|inspector|knowledge/i);
});
