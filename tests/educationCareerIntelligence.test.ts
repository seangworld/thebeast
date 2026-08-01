import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildGoalGapAnalysis,
  canTransitionEducationRoadmap,
  compareCareerPaths,
  materialRoadmapChangeRequiresApproval,
  validateEducationResearchResult,
  validateExternalEducationResearchQuery,
  type EducationCareerProfileItem,
} from "../src/lib/education/careerIntelligence";
import { guidanceConversationProfileItems } from "../src/lib/education/conversationProfileItems";
import {
  educationDocumentExtractionVersion,
  extractEducationDocumentProposals,
  fingerprintEducationDocument,
} from "../src/lib/education/documentExtraction";
import { parseEducationResearchResponse } from "../src/lib/education/research";
import type { GuidanceDiscoveryProfile } from "../src/lib/education/discoveryConversation";

const migration = readFileSync(
  "supabase/migrations/20260801000600_add_education_career_intelligence.sql",
  "utf8"
);
const workspace = readFileSync(
  "src/app/dashboard/learning/EducationCareerWorkspace.tsx",
  "utf8"
);
const researchRoute = readFileSync(
  "src/app/api/education/research/route.ts",
  "utf8"
);

const blankProfile: GuidanceDiscoveryProfile = {
  goal: "",
  currentSituation: "",
  strengths: "",
  growthAreas: "",
  constraints: "",
  weeklyHours: 0,
  availableStudyTimeKnown: false,
  selectedProviders: [],
  careerInterests: [],
  educationalGoals: [],
  learningPreferences: [],
  certifications: [],
  collegeInterest: null,
  tradeInterest: null,
  currentEmployment: "",
  militaryExperience: "",
  otherEducationalContext: "",
  educationHistory: [],
  militaryTraining: [],
  schools: [],
  degrees: [],
  experience: [],
  skills: [],
  educationBudget: "",
  incomeGoal: "",
  familyConsiderations: "",
  technicalExperience: [],
  leadershipInterest: null,
  preferredWork: "",
  workLocationPreference: "",
  sectorPreference: "",
  travelWillingness: "",
  longTermGoals: "",
  giBill: null,
  vre: null,
  employerReimbursement: null,
  scholarshipInterest: null,
  targetTimeline: "",
  discoveryAnswers: {},
};

test("BE-201 persists Past, Present, and Goals with owner-only RLS and append-only outcomes", () => {
  for (const table of [
    "education_career_profile_items",
    "education_career_paths",
    "education_career_roadmaps",
    "education_career_roadmap_steps",
    "education_career_document_extractions",
    "education_career_document_extraction_items",
    "education_career_outcomes",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /using \(auth\.uid\(\) = owner_id\)/);
  assert.match(migration, /with check \(auth\.uid\(\) = owner_id\)/);
  assert.match(migration, /Members read own education career outcomes/);
  assert.match(migration, /Members append own education career outcomes/);
  assert.doesNotMatch(migration, /education_career_outcomes for (?:update|delete)/i);
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
});

test("BE-201 roadmap milestone links preserve compound ownership and are rerunnable", () => {
  assert.match(
    migration,
    /constraint beast_goal_milestones_id_owner_id_key unique \(id, owner_id\)/
  );
  assert.match(
    migration,
    /education_career_roadmap_steps_milestone_owner_fk foreign key \(goal_milestone_id, owner_id\)[\s\S]*?references public\.beast_goal_milestones \(id, owner_id\)/
  );
  assert.match(migration, /duplicate \(id, owner_id\) pairs exist/);
  assert.match(migration, /drop trigger if exists set_education_career_roadmap_steps_updated_at/);
  assert.match(migration, /drop policy if exists "Members manage own education career roadmap steps"/);
});

test("BE-201 conversation discovery and direct forms target the same profile model", () => {
  const mapped = guidanceConversationProfileItems({
    ...blankProfile,
    goal: "Become a cybersecurity analyst",
    currentEmployment: "Systems administrator",
    militaryExperience: "Air Force communications",
    skills: ["Networking", "Linux"],
    weeklyHours: 8,
    availableStudyTimeKnown: true,
  });
  assert.deepEqual(
    mapped.map(({ phase, category, sourceReference }) => [phase, category, sourceReference]),
    [
      ["past", "military", "guidance:military-experience"],
      ["present", "employment", "guidance:current-employment"],
      ["present", "skill", "guidance:skills"],
      ["present", "schedule", "guidance:study-time"],
      ["goal", "career_goal", "guidance:goal"],
    ]
  );
  assert.match(workspace, /education_career_profile_items/);
  assert.match(workspace, /Edit or correct/);
  assert.match(workspace, /Remove/);
});

test("BE-201 gap analysis distinguishes possessed, required, preferred, helpful, and unknown", () => {
  const profileItems: EducationCareerProfileItem[] = [{
    id: "skill-linux",
    phase: "present",
    category: "skill",
    label: "Current skills",
    value: "Linux administration and networking",
    sourceType: "member",
    verificationStatus: "member_reported",
    confidence: 1,
    updatedAt: "2026-08-01T00:00:00Z",
  }];
  const analysis = buildGoalGapAnalysis({
    profileItems,
    requirements: [
      { id: "linux", label: "Linux networking", description: "Linux and networking experience", state: "required", category: "skill" },
      { id: "cert", label: "Security certification", description: "Current certification", state: "preferred", category: "certification" },
      { id: "license", label: "Jurisdictional license", description: "Employer dependent", state: "unknown", category: "license" },
    ],
  });
  assert.deepEqual(analysis.map(({ result }) => result), ["possessed", "preferred", "unknown"]);
  assert.match(analysis[0].explanation, /Confirm/);
});

test("BE-201 path comparison never promotes stale or unsupported evidence", () => {
  const ranked = compareCareerPaths([
    { id: "stale", title: "Old path", fitScore: 100, confidence: 1, sourceUrl: "https://example.gov/old", sourceRetrievedAt: "2025-01-01T00:00:00Z", factors: {} },
    { id: "current", title: "Current path", fitScore: 80, confidence: 0.9, sourceUrl: "https://example.gov/current", sourceRetrievedAt: "2026-07-31T00:00:00Z", factors: {} },
    { id: "unknown", title: "Unresearched path", fitScore: 90, confidence: 0.8, factors: {} },
  ], new Date("2026-08-01T00:00:00Z"));
  assert.equal(ranked[0].title, "Current path");
  assert.equal(ranked[0].recommendation, "strongest");
  assert.equal(ranked.find(({ id }) => id === "stale")?.recommendation, "needs-research");
  assert.equal(ranked.find(({ id }) => id === "unknown")?.recommendation, "needs-research");
});

test("BE-201 roadmap lifecycle requires approval for material changes", () => {
  assert.equal(canTransitionEducationRoadmap("draft", "active"), true);
  assert.equal(canTransitionEducationRoadmap("active", "paused"), true);
  assert.equal(canTransitionEducationRoadmap("paused", "completed"), false);
  assert.equal(materialRoadmapChangeRequiresApproval({ destination: "New occupation" }), true);
  assert.equal(materialRoadmapChangeRequiresApproval({}), false);
  assert.match(migration, /pending_material_change/);
  assert.match(workspace, /Approve & activate/);
});

test("BE-201 research sends only a consented bounded question and returns attributable freshness", () => {
  assert.equal(validateExternalEducationResearchQuery("Current OPM qualification standard for GS-2210?").allowed, true);
  assert.equal(validateExternalEducationResearchQuery("Email me at member@example.com").allowed, false);
  assert.equal(validateExternalEducationResearchQuery("My SSN is 123-45-6789").allowed, false);
  assert.match(researchRoute, /externalResearchConsent/);
  assert.match(researchRoute, /store: false/);
  assert.doesNotMatch(researchRoute, /education_profiles|education_career_profile_items|beast_documents/);

  const parsed = parseEducationResearchResponse({
    output: [{ type: "message", content: [{
      type: "output_text",
      text: "Verify the current standard with OPM.",
      annotations: [{ type: "url_citation", url: "https://www.opm.gov/policy-data-oversight/classification-qualifications/", title: "OPM Qualifications" }],
    }] }],
  }, "2026-08-01T00:00:00Z");
  assert.equal(parsed.sources[0].primary, true);
  assert.equal(validateEducationResearchResult({ answer: parsed.answer, sources: parsed.sources, stale: false, limitations: [] }, new Date("2026-08-01T12:00:00Z")).valid, true);
});

test("BE-201 education document extraction is local, idempotent, and review-only", () => {
  const source = [
    "School: State University",
    "Degree: Bachelor of Science, 2020-05-15",
    "Role: Systems Administrator",
    "Skills: Linux, networking",
    "Career Goal: Cybersecurity analyst",
    "Degree: Bachelor of Science, 2020-05-15",
  ].join("\n");
  const parsed = extractEducationDocumentProposals(source);
  assert.equal(parsed.items.length, 5);
  assert.equal(parsed.items[1].occurredOn, "2020-05-15");
  assert.equal(fingerprintEducationDocument(new TextEncoder().encode(source)).length, 64);
  assert.equal(educationDocumentExtractionVersion, "be-201-v1");
  assert.match(migration, /unique \(owner_id, document_id, content_fingerprint, extraction_version\)/);
  assert.match(migration, /Only pending proposals can be reviewed/);
  assert.match(migration, /owner_approved/);
  assert.match(workspace, /Accept/);
  assert.match(workspace, /Reject/);
});

test("BE-201 active navigation contains no teaching, tutoring, lesson, quiz, or mastery surface", () => {
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const activeEducationNav = `${navigation.match(/export const beastLearningNavigation[\s\S]*?\n};/)?.[0]}\n${layout.match(/const learningPrimaryNavigation[\s\S]*?\n];/)?.[0]}`;
  assert.match(activeEducationNav, /Guidance Counselor/);
  assert.match(activeEducationNav, /Profile/);
  assert.match(activeEducationNav, /Paths/);
  assert.match(activeEducationNav, /Roadmap/);
  assert.match(activeEducationNav, /Goals/);
  assert.match(activeEducationNav, /Documents/);
  assert.match(activeEducationNav, /Outcomes/);
  assert.doesNotMatch(activeEducationNav, /Tutor|Lesson|Quiz|Mastery|Courses/);
});
