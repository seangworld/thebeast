import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastAdminKnowledgeInspector,
  filterBeastAdminKnowledgeInspector,
  normalizeBeastAdminKnowledgeSourceSnapshot,
} from "../src/lib/beastAdminKnowledgeInspector";

// Entirely synthetic normalization/filtering data; no member records are loaded.
const source = {
  member: {
    id: "fixture-member",
    displayName: "Fixture Member",
    email: "fixture@example.invalid",
    role: "user",
  },
  educationProfile: {
    goal: "Sample training objective",
    currentSituation: "",
    strengths: "",
    growthAreas: "",
    constraints: "",
    weeklyHours: 0,
    availableStudyTimeKnown: false,
    selectedProviders: [],
    careerInterests: ["Sample training objective"],
    educationalGoals: [],
    learningPreferences: ["Sample learning preference"],
    certifications: [],
    collegeInterest: null,
    tradeInterest: null,
    currentEmployment: "",
    militaryExperience: "",
    otherEducationalContext: "",
    incomeGoal: "",
    familyConsiderations: "",
    technicalExperience: [],
    leadershipInterest: null,
    preferredWork: "",
    workLocationPreference: "",
    sectorPreference: "",
    travelWillingness: "",
    longTermGoals: "",
    educationHistory: [],
    militaryTraining: [],
    schools: [],
    degrees: [],
    experience: [],
    skills: [],
    educationBudget: "",
    giBill: null,
    vre: null,
    employerReimbursement: null,
    scholarshipInterest: null,
    targetTimeline: "",
    discoveryAnswers: {},
    updatedAt: "2026-07-26T12:00:00.000Z",
  },
  memories: [
    {
      id: "fixture-memory-1",
      professionalId: "fixture.professional-alpha",
      scope: "user",
      key: "fixture-preference",
      value: {
        content: "Synthetic planning preference.",
        confidence: "high",
      },
      purpose: "Exercise an explicitly confirmed synthetic preference.",
      evidence: [{ source: "fixture-conversation-1" }],
      sourceConversationId: "fixture-conversation-1",
      sourceMessageId: "message-1",
      expiresAt: null,
      createdAt: "2026-07-26T10:00:00.000Z",
      updatedAt: "2026-07-26T10:00:00.000Z",
    },
    {
      id: "unclassified-memory",
      professionalId: "fixture.professional-beta",
      scope: "agent",
      key: "fixture-unclassified-context",
      value: { content: "Synthetic observation without confidence." },
      purpose: "Exercise an unclassified synthetic observation.",
      evidence: [],
      sourceConversationId: null,
      sourceMessageId: null,
      expiresAt: null,
      createdAt: "2026-07-25T10:00:00.000Z",
      updatedAt: "2026-07-25T10:00:00.000Z",
    },
  ],
  conversationFollowUps: [
    {
      id: "conversation-1-follow-up-1",
      professionalId: "fixture.professional-alpha",
      question: "Confirm the sample preference.",
      conversationTitle: "Synthetic follow-up",
      updatedAt: "2026-07-26T11:00:00.000Z",
    },
  ],
};

test("BA-112 normalizes owner-authorized persisted sources", () => {
  assert.deepEqual(normalizeBeastAdminKnowledgeSourceSnapshot(source), source);
  assert.equal(
    normalizeBeastAdminKnowledgeSourceSnapshot({
      ...source,
      memories: [{ ...source.memories[0], scope: "global" }],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminKnowledgeSourceSnapshot({
      ...source,
      educationProfile: {
        ...source.educationProfile,
        careerInterests: "",
      },
    }),
    null
  );
});

test("BA-112 separates confirmed facts, hypotheses, and unknowns", () => {
  const normalized = normalizeBeastAdminKnowledgeSourceSnapshot(source);
  assert.ok(normalized);
  const inspector = buildBeastAdminKnowledgeInspector(normalized);

  assert.equal(
    inspector.knownFacts.some(
      (item) => item.label === "Career goals" && item.value === "Sample training objective"
    ),
    true
  );
  assert.equal(
    inspector.knownFacts.some((item) => item.label === "Current situation"),
    false
  );
  assert.equal(
    inspector.knownFacts.some((item) => item.label === "Education and experience"),
    false
  );
  assert.equal(
    inspector.knownFacts.some(
      (item) =>
        item.label === "Learning preferences" && item.confidence === "high"
    ),
    true
  );
  assert.equal(
    inspector.outstandingQuestions.some((item) =>
      item.question.includes("current work, school, or military")
    ),
    true
  );
  assert.equal(
    inspector.knownFacts.some((item) => item.id === "memory-unclassified-memory"),
    false
  );
});

test("BA-112 inventories user-scope context and supports professional filtering", () => {
  const normalized = normalizeBeastAdminKnowledgeSourceSnapshot(source);
  assert.ok(normalized);
  const inspector = buildBeastAdminKnowledgeInspector(normalized);
  const selectedProfessional = filterBeastAdminKnowledgeInspector(
    inspector,
    "fixture.professional-alpha"
  );

  assert.deepEqual(
    inspector.crossModuleContext.map((item) => item.id),
    ["context-fixture-memory-1"]
  );
  assert.equal(selectedProfessional.knownFacts.length, 1);
  assert.equal(
    selectedProfessional.knownFacts[0].value,
    "Synthetic planning preference."
  );
  assert.equal(selectedProfessional.outstandingQuestions.length, 1);
  assert.equal(selectedProfessional.memoryHistory.length, 1);
  assert.equal(
    selectedProfessional.memoryHistory[0].professionalId,
    "fixture.professional-alpha"
  );
});

test("BA-112 migration is owner-only, read-only, and excludes raw messages", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000800_add_beast_admin_knowledge_inspector.sql",
    "utf8"
  );

  assert.match(migration, /security definer/i);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /errcode = '42501'/);
  assert.match(migration, /public\.education_profiles/);
  assert.match(migration, /public\.agent_memories/);
  assert.match(migration, /unresolvedFollowUps/);
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_knowledge_inspector/
  );
  assert.match(migration, /grant execute [\s\S]* authenticated/);
  assert.doesNotMatch(migration, /agent_conversation_messages/);
  assert.doesNotMatch(migration, /\b(insert|update|delete|upsert)\b/i);
});

test("BA-112 presents every requested owner inspection area without mutation controls", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/knowledge/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/knowledge/BeastAdminKnowledgeInspectorWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const label of [
    "Known facts",
    "Working hypotheses",
    "Outstanding questions",
    "Cross-module context",
    "Memory history",
    "confidence",
  ]) {
    assert.match(`${page}\n${workspace}`, new RegExp(label, "i"));
  }
  assert.match(
    workspace,
    /\.rpc\(\s*"get_beast_admin_knowledge_inspector"/
  );
  assert.match(workspace, /Search members/);
  assert.match(workspace, /All professionals/);
  assert.match(workspace, /Read-only inspection/);
  assert.match(workspace, /raw conversation messages/);
  assert.doesNotMatch(navigation, /label: "Knowledge Inspector"/);
  assert.match(page, /BeastAdminShell/);
  assert.doesNotMatch(workspace, /\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
});
