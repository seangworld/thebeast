import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  createDefaultConversationStarterEngine,
  SharedPersonalizedConversationStarters,
  specialistConversationStarterProfiles,
  type AgentConversationThread,
  type MemberUnderstandingReasoningItem,
  type ProfessionalJournalReasoningItem,
  type StarterCandidate,
} from "../src/lib/platform/agents";
import { buildMoneyCoachObservations } from "../src/lib/moneyCoachObservations";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const now = "2026-07-23T12:00:00.000Z";

function conversation(values: Partial<AgentConversationThread> = {}): AgentConversationThread {
  return {
    id: "conversation-1",
    ownerId: "owner-1",
    agentId: "beastmoney.money-coach",
    title: "Retirement Plan",
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
    messages: [],
    messageCount: 4,
    pinned: false,
    archived: false,
    tags: [],
    summary: {
      overview: "Reviewed retirement contribution options.",
      decisions: [],
      unresolvedFollowUps: ["Compare the two contribution amounts."],
      updatedAt: "2026-07-22T12:00:00.000Z",
    },
    relatedInsightIds: [],
    relatedActionIds: [],
    ...values,
  };
}

function moneyObservations() {
  return buildMoneyCoachObservations({
    current: {
      capturedAt: now,
      monthlyIncome: 6000,
      monthlyOutflow: 4300,
      projectedSurplus: 1700,
      currentCash: 5000,
      cashBuffer: 2500,
      totalDebt: 16000,
    },
    history: [{
      capturedAt: "2026-06-23T12:00:00.000Z",
      monthlyIncome: 6000,
      monthlyOutflow: 4700,
      projectedSurplus: 1300,
      currentCash: 4500,
      cashBuffer: 2500,
      totalDebt: 17500,
    }],
  }, "owner-1", now);
}

test("AGENT-215 exposes shared starter generation through BeastAgents", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.conversationStarters instanceof SharedPersonalizedConversationStarters);
});

test("AGENT-215 provides configured Money, Health, and Guidance starter examples", () => {
  assert.deepEqual(
    specialistConversationStarterProfiles.moneyCoach.genericStarters.map((item) => item.title),
    ["Financial Checkup", "Plan my next move", "Review debt strategy", "Review latest paycheck", "Continue Retirement Plan", "Review spending", "Velocity Banking", "Emergency Fund"]
  );
  assert.deepEqual(
    specialistConversationStarterProfiles.healthAdvisor.genericStarters.map((item) => item.title),
    ["Review medications", "Review lab results", "Prepare for appointment"]
  );
  assert.deepEqual(
    specialistConversationStarterProfiles.guidanceCounselor.genericStarters.map((item) => item.title),
    ["Continue learning plan", "Review progress", "Find next certification"]
  );
});

test("AGENT-215 returns useful generic starters when no personal context exists", () => {
  const starters = createDefaultConversationStarterEngine().generate({
    ownerId: "owner-1",
    specialistId: "beasthealth.health-advisor",
    asOf: now,
  });
  assert.equal(starters.length, 3);
  assert.ok(starters.every((item) => item.kind === "generic"));
  assert.ok(starters.every((item) => item.personalized === false));
  assert.ok(starters.every((item) => item.evidence[0].sourceType === "configuration"));
});

test("AGENT-215 creates resume and structured follow-up starters from conversation history", () => {
  const starters = createDefaultConversationStarterEngine().generate({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf: now,
    conversationHistory: [
      conversation(),
      conversation({ id: "archived", archived: true, updatedAt: "2026-07-23T11:00:00.000Z" }),
      conversation({ id: "other-owner", ownerId: "owner-2", updatedAt: "2026-07-23T11:30:00.000Z" }),
    ],
  });
  const resume = starters.find((item) => item.kind === "continue-previous-work");
  const followUp = starters.find((item) => item.kind === "suggested-follow-up");
  assert.equal(resume?.relatedConversationId, "conversation-1");
  assert.match(resume?.title || "", /Retirement Plan/);
  assert.equal(followUp?.prompt, "Compare the two contribution amounts.");
  assert.ok(starters.every((item) => item.ownerId === "owner-1"));
});

test("AGENT-215 turns recent owner-scoped observations into evidence-backed prompts", () => {
  const observations = moneyObservations();
  const starters = createDefaultConversationStarterEngine().generate({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf: now,
    observations: [
      ...observations,
      { ...observations[0], ownerId: "owner-2", id: "other-owner-observation" },
    ],
  });
  const observed = starters.filter((item) => item.kind === "recent-observation");
  assert.ok(observed.length > 0);
  assert.ok(observed.every((item) => item.relatedObservationId !== "other-owner-observation"));
  assert.ok(observed.every((item) => item.evidence[0].sourceType === "observation"));
});

test("AGENT-215 integrates Professional Journal and Member Understanding through specialist hooks", () => {
  const engine = new SharedPersonalizedConversationStarters();
  engine.registerProfile({
    specialistId: "future.specialist",
    genericStarters: [{ id: "check-in", title: "Check in", prompt: "Let’s check in." }],
    journalStarter: (entry) => ({
      id: `journal-${entry.entryId}`,
      title: "Continue a developing pattern",
      prompt: "Can we review the pattern you noticed?",
      reason: entry.interpretation,
      priority: 75,
    }),
    understandingStarter: (entry) => ({
      id: `understanding-${entry.understandingId}`,
      title: "Use my preferred approach",
      prompt: "Explain this using my preferred approach.",
      reason: entry.understanding,
      priority: 74,
    }),
  });
  const journal: ProfessionalJournalReasoningItem = {
    entryId: "journal-1",
    observation: "Consistency improved.",
    interpretation: "A repeatable routine may be developing.",
    confidence: "moderate",
    evidenceIds: ["evidence-1"],
    relatedResources: ["future.records"],
    timestamp: now,
  };
  const understanding: MemberUnderstandingReasoningItem = {
    understandingId: "understanding-1",
    dimension: "communication-style",
    understanding: "The member prefers examples before terminology.",
    confidence: "high",
    evidenceSourceTypes: ["conversation"],
    updatedAt: now,
  };
  const starters = engine.generate({
    ownerId: "owner-1",
    specialistId: "future.specialist",
    asOf: now,
    journalEntries: [journal],
    memberUnderstanding: [understanding],
  });
  assert.ok(starters.some((item) => item.evidence[0].sourceType === "professional-journal"));
  assert.ok(starters.some((item) => item.evidence[0].sourceType === "member-understanding"));
});

test("AGENT-215 personalizes configured starters as understanding accumulates", () => {
  const engine = createDefaultConversationStarterEngine();
  const generic = engine.generate({
    ownerId: "owner-1",
    specialistId: "beasteducation.guidance-counselor",
    asOf: now,
  });
  const understanding: MemberUnderstandingReasoningItem = {
    understandingId: "goal-1",
    dimension: "goal",
    understanding: "The member is working toward a certification.",
    confidence: "high",
    evidenceSourceTypes: ["historical-outcome"],
    updatedAt: now,
  };
  const personalized = engine.generate({
    ownerId: "owner-1",
    specialistId: "beasteducation.guidance-counselor",
    asOf: now,
    memberUnderstanding: [understanding],
  });
  assert.ok(personalized.filter((item) => item.personalized).length > generic.filter((item) => item.personalized).length);
  assert.equal(personalized.find((item) => item.title === "Continue learning plan")?.kind, "personalized");
});

test("AGENT-215 supports recommended-today and upcoming-event starters with expiration", () => {
  const recommended: StarterCandidate = {
    id: "recommended",
    kind: "recommended-today",
    title: "Review today",
    prompt: "What should I review today?",
    reason: "Current context supports a review.",
    evidence: [{ sourceType: "current-context", sourceId: "current", capturedAt: now, reason: "Current record." }],
  };
  const starters = createDefaultConversationStarterEngine().generate({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf: now,
    recommendedToday: [recommended],
    upcomingEvents: [
      { id: "future", title: "Prepare for payday", prompt: "Help me prepare for payday.", startsAt: "2026-07-24T12:00:00.000Z", source: "Calendar" },
      { id: "past", title: "Past event", prompt: "Review the past event.", startsAt: "2026-07-22T12:00:00.000Z", source: "Calendar" },
    ],
  });
  assert.ok(starters.some((item) => item.kind === "recommended-today"));
  assert.ok(starters.some((item) => item.kind === "upcoming-event" && item.id === "event:future"));
  assert.ok(starters.every((item) => item.id !== "event:past"));
});

test("AGENT-215 ranks deterministically, removes duplicate prompts, and respects limits", () => {
  const duplicate: StarterCandidate = {
    id: "duplicate",
    kind: "recommended-today",
    title: "High priority checkup",
    prompt: "Give me a financial checkup.",
    reason: "Recommended today.",
    evidence: [{ sourceType: "current-context", sourceId: "current", capturedAt: now, reason: "Current review." }],
  };
  const starters = createDefaultConversationStarterEngine().generate({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf: now,
    recommendedToday: [duplicate],
    limit: 3,
  });
  assert.equal(starters.length, 3);
  assert.equal(starters.filter((item) => item.prompt === "Give me a financial checkup.").length, 1);
  assert.equal(starters[0].kind, "recommended-today");
});

const moneyInput = {
  ownerId: "owner-1",
  userName: "Sean",
  asOfDate: new Date(now),
  activeBillCount: 2,
  billsDueSoonCount: 1,
  monthlyBills: 900,
  activeDebtCount: 1,
  totalDebt: 16000,
  projectedDebtReduction: 1000,
  debtProgressPercent: 5,
  monthlyIncome: 6000,
  monthlyOutflow: 4300,
  projectedSurplus: 1700,
  currentCash: 5000,
  cashBuffer: 2500,
  utilization: 24,
  fundingSourceCount: 1,
  safeFundingSourceCapacity: 2000,
  assignedIncomePotCount: 3,
  totalObligationCount: 3,
  recommendationTitle: "Review current plan",
  recommendationAction: "Continue the current plan.",
  recommendationWhy: "Current records support it.",
  recommendationHref: "/dashboard/money/dashboard",
  interestSaved: 0,
  timeSavedMonths: 0,
  conversationHistory: [conversation()],
};

test("Money Coach consumes shared personalized starters instead of a separate starter framework", () => {
  const model = buildMoneyCoachExperience(moneyInput);
  assert.ok(model.suggestions.some((item) => item.prompt === "What bills need my attention?"));
  assert.ok(model.suggestions.some((item) => item.prompt === "How is my debt plan progressing?"));
  assert.ok(model.suggestions.some((item) => /Continue our previous work/.test(item.prompt || "")));
  assert.ok(model.suggestions.some((item) => item.intent === "ask"));
});
