import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  extractHealthDocumentProposals,
  healthDocumentExtractionCategories,
  healthExtractionCategoryRecordKind,
  parseHealthDocumentExtraction,
} from "../src/lib/health/documentExtraction";

test("BH-204 extracts only explicitly labeled medical document text", () => {
  const result = extractHealthDocumentProposals(`
Diagnosis: Hypertension
Condition: Asthma
Medication: Example 10 mg daily
Procedure: Imaging study - August 1, 2026
Provider: Dr. Example
Appointment: Follow-up - 2026-08-14
Lab: A1C 5.6%
Allergies: Penicillin
Vaccination: Influenza 2026
Instruction: Call the clinic to confirm the appointment
Date: 2026-08-01
Facility: Example Medical Center
Unlabeled content that must not become a proposal
Medication: Example 10 mg daily
`);

  assert.deepEqual(
    result.items.map((item) => item.category),
    [...healthDocumentExtractionCategories]
  );
  assert.equal(result.items.length, 12);
  assert.equal(result.items.find((item) => item.category === "appointment")?.occurredOn, "2026-08-14");
  assert.equal(result.items.find((item) => item.category === "procedure")?.occurredOn, "2026-08-01");
  assert.equal(result.items.every((item) => item.confidence === 1), true);
  assert.doesNotMatch(result.summary, /diagnos|normal|abnormal/i);
});

test("BH-204 validates proposals and maps them to existing linked Health record kinds", () => {
  const parsed = parseHealthDocumentExtraction({
    summary: "Owner review required.",
    items: [
      { category: "medication", label: "Medication", value: "Example", occurred_on: null, source_excerpt: "Medication: Example", confidence: 0.9 },
      { category: "not_allowed", label: "Ignored", value: "Ignored" },
    ],
  });
  assert.equal(parsed?.items.length, 1);
  assert.equal(healthExtractionCategoryRecordKind("medication"), "medication");
  assert.equal(healthExtractionCategoryRecordKind("lab_value"), "vital");
  assert.equal(healthExtractionCategoryRecordKind("facility"), "provider");
});

test("BH-204 persists deduplicated owner-only proposals and atomically approves links", () => {
  const migration = readFileSync("supabase/migrations/20260801000500_add_health_document_extractions.sql", "utf8");
  const route = readFileSync("src/app/api/health/documents/[documentId]/extract/route.ts", "utf8");
  const review = readFileSync("src/app/dashboard/health/HealthDocumentExtractionReview.tsx", "utf8");

  assert.match(migration, /unique \(owner_id, document_id, content_fingerprint, extraction_version\)/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /role = 'admin'/);
  assert.match(migration, /approve_beast_health_document_extraction_item/);
  assert.match(migration, /linked_document_id/);
  assert.match(migration, /owner_approved/);
  assert.match(route, /body\?\.consent !== true/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /fingerprintHealthDocument/);
  assert.doesNotMatch(route, /OPENAI|api\.openai\.com|storage\.download/);
  assert.match(review, /Approve and create record/);
  assert.match(review, /Reject/);
  assert.match(review, /not retained or sent to an external model/);
});
