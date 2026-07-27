import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastAdminKnowledgeInspector,
  filterBeastAdminKnowledgeInspector,
  normalizeBeastAdminKnowledgeSourceSnapshot,
} from "../src/lib/beastAdminKnowledgeInspector";

const source = {
  member: {
    id: "member-1",
    displayName: "Sean",
    email: "sean@example.com",
    role: "user",
  },
  educationProfile: {
    goal: "IT professional",
    currentSituation: "",
    strengths: "",
    growthAreas: "",
    constraints: "",
    weeklyHours: 0,
    availableStudyTimeKnown: false,
    selectedProviders: [],
    careerInterests: ["IT professional"],
    educationalGoals: [],
    learningPreferences: ["hands-on"],
    certifications: [],
    collegeInterest: null,
    tradeInterest: null,
    currentEmployment: "",
    militaryExperience: "",
    otherEducationalContext: "",
    updatedAt: "2026-07-26T12:00:00.000Z",
  },
  memories: [
    {
      id: "money-memory-1",
      professionalId: "beastmoney.money-coach",
      scope: "user",
      key: "financial-goal",
      value: {
        content: "My goal is to eliminate debt.",
        confidence: "high",
      },
      purpose: "Remember an explicit member financial goal.",
      evidence: [{ source: "money-conversation-1" }],
      sourceConversationId: "money-conversation-1",
      sourceMessageId: "message-1",
      expiresAt: null,
      createdAt: "2026-07-26T10:00:00.000Z",
      updatedAt: "2026-07-26T10:00:00.000Z",
    },
    {
      id: "unclassified-memory",
      professionalId: "beasthealth.health-advisor",
      scope: "agent",
      key: "health-context",
      value: { content: "A stored observation without confidence." },
      purpose: "Retain professional context.",
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
      professionalId: "beastmoney.money-coach",
      question: "Confirm the preferred payoff date.",
      conversationTitle: "Payoff planning",
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
      (item) => item.label === "Career goals" && item.value === "IT professional"
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
    inspector.workingHypotheses.some(
      (item) => item.label === "Learning style" && item.confidence === "medium"
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
  const money = filterBeastAdminKnowledgeInspector(
    inspector,
    "beastmoney.money-coach"
  );

  assert.deepEqual(
    inspector.crossModuleContext.map((item) => item.id),
    ["context-money-memory-1"]
  );
  assert.equal(money.knownFacts.length, 1);
  assert.equal(
    money.knownFacts[0].value,
    "My goal is to eliminate debt."
  );
  assert.equal(money.outstandingQuestions.length, 1);
  assert.equal(money.memoryHistory.length, 1);
  assert.equal(
    money.memoryHistory[0].professionalId,
    "beastmoney.money-coach"
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
  assert.match(navigation, /Knowledge Inspector/);
  assert.doesNotMatch(workspace, /\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
});
