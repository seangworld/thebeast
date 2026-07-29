import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { BeastDocument } from "../src/lib/platform/documents";
import type { Goal } from "../src/lib/platform/goals";
import {
  buildProfessionalActivities,
  getProfessionalActivityFilter,
  getProfessionalName,
  professionalActivityFilters,
} from "../src/lib/platform/professionalActivity";
import { buildTimelineStream } from "../src/lib/platform/timeline";

const now = "2026-07-25T14:00:00.000Z";

function readyDocument(): BeastDocument {
  return {
    id: "document-1",
    ownerId: "owner-1",
    title: "Career assessment",
    category: "Learning",
    status: "Ready",
    tags: [],
    metadata: {},
    storage: {
      bucket: "beast-documents",
      path: "owner-1/career-assessment.pdf",
      fileName: "career-assessment.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
    },
    collections: [],
    accessGrants: [],
    goalReferences: [],
    calendarLinks: [],
    moduleLinks: [],
    createdAt: "2026-07-25T12:00:00.000Z",
    updatedAt: "2026-07-25T13:00:00.000Z",
  };
}

function goalWithCompletedMilestone(): Goal {
  return {
    id: "goal-1",
    ownerId: "owner-1",
    title: "Earn an IT certification",
    category: "Education",
    status: "Active",
    milestones: [
      {
        id: "milestone-1",
        ownerId: "owner-1",
        goalId: "goal-1",
        title: "Choose a certification",
        status: "Completed",
        completedAt: "2026-07-25T11:00:00.000Z",
        sortOrder: 1,
        createdAt: "2026-07-20T11:00:00.000Z",
        updatedAt: "2026-07-25T11:00:00.000Z",
      },
    ],
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-25T11:00:00.000Z",
  };
}

test("BO-309 builds chronological professional activity from persisted evidence", () => {
  const items = buildProfessionalActivities({
    educationProfile: {
      ownerId: "owner-1",
      goal: "Work in IT",
      careerInterests: ["IT professional"],
      educationalGoals: [],
      learningPreferences: [],
      certifications: [],
      strengths: "",
      updatedAt: now,
    },
    retirementTimelineRuns: [
      {
        id: "timeline-run-1",
        calculationVersion: "2026.1",
        createdAt: "2026-07-25T13:30:00.000Z",
      },
    ],
    documents: [readyDocument()],
    goals: [goalWithCompletedMilestone()],
  });
  const stream = buildTimelineStream({ items });

  assert.equal(stream.length, 4);
  assert.equal(stream[0].source, "learning");
  assert.equal(stream[0].title, "Learned your career interests.");
  assert.match(stream[1].title, /retirement timeline/);
  assert.doesNotMatch(JSON.stringify(stream[1].details), /2026\.1|Calculation version/);
  assert.match(stream[2].title, /Processed/);
  assert.match(stream[3].title, /Marked/);
});

test("BO-309 filters every requested platform area", () => {
  assert.deepEqual(
    professionalActivityFilters.map((filter) => filter.label),
    ["All", "Money", "Education", "Health", "Goals", "Documents", "Home"]
  );
  assert.equal(getProfessionalActivityFilter("education").source, "learning");
  assert.equal(getProfessionalActivityFilter("unknown").id, "all");
  assert.equal(getProfessionalName("money"), "Money Coach");
  assert.equal(getProfessionalName("health"), "Health Advisor");
  assert.equal(getProfessionalName("home"), "Home Assistant");
});

test("BO-309 omits unprocessed documents and empty education profiles", () => {
  const uploadedDocument = { ...readyDocument(), status: "Uploaded" as const };
  const items = buildProfessionalActivities({
    educationProfile: {
      ownerId: "owner-1",
      goal: "",
      careerInterests: [],
      educationalGoals: [],
      learningPreferences: [],
      certifications: [],
      strengths: "",
      updatedAt: now,
    },
    documents: [uploadedDocument],
  });

  assert.deepEqual(items, []);
});

test("BO-309 timeline page uses live owner-scoped sources without sample events", () => {
  const page = readFileSync("src/app/dashboard/timeline/page.tsx", "utf8");

  assert.match(page, /loadProfessionalActivity/);
  assert.match(page, /buildProfessionalActivities/);
  assert.match(page, /loadUserGoals/);
  assert.match(page, /loadUserDocuments/);
  assert.match(page, /\.eq\("owner_id", ownerId\)/);
  assert.match(page, /professionalActivityFilters/);
  assert.doesNotMatch(page, /timelineItems/);
  assert.doesNotMatch(page, /background-refresh/);
  assert.doesNotMatch(page, /Cashflow buffer reviewed/);
});
