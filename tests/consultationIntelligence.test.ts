import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedAgentPlanningEngine,
  SharedConsultationIntelligence,
  specialistAgentPlanningPolicies,
} from "../src/lib/platform/agents";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

test("AGENT-216 exposes one shared consultation service for every specialist", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.consultationIntelligence instanceof SharedConsultationIntelligence);
});

test("AGENT-216 understands the member story before deciding what is missing", () => {
  const story = new SharedConsultationIntelligence().understand(
    "Since my last paycheck, I have been storing excess cash in my HELOC between bill due dates. I want to keep my reserve intact before making another payment."
  );
  assert.ok(story.explicitFacts.length >= 2);
  assert.ok(story.implicitFacts.some((item) => /recurring workflow/i.test(item.statement)));
  assert.ok(story.timeline.length > 0);
  assert.ok(story.sequence.length > 0);
  assert.ok(story.goals.length > 0);
  assert.ok(story.constraints.length > 0);
  assert.ok(story.references.some((item) => item.kind === "module-state"));
});

test("AGENT-216 extracts decisions, document references, and prior conversation references", () => {
  const story = new SharedConsultationIntelligence().understand(
    "We decided to continue the retirement plan we discussed last time after I uploaded the latest statement."
  );
  assert.ok(story.existingDecisions.length > 0);
  assert.ok(story.references.some((item) => item.kind === "prior-conversation"));
  assert.ok(story.references.some((item) => item.kind === "uploaded-document"));
});

test("AGENT-216 suppresses questions answered in the current message", () => {
  const intelligence = new SharedConsultationIntelligence();
  const money = intelligence.assessQuestion(
    intelligence.understand("I pay my bills from my HELOC between due dates."),
    "What account are you paying bills from?"
  );
  const health = intelligence.assessQuestion(
    intelligence.understand("I am taking lisinopril each morning."),
    "Which medication are you taking?"
  );
  const guidance = intelligence.assessQuestion(
    intelligence.understand("I chose the AWS Solutions Architect certification."),
    "Which certification did you choose?"
  );
  assert.equal(money.shouldAsk, false);
  assert.equal(health.shouldAsk, false);
  assert.equal(guidance.shouldAsk, false);
  assert.ok(money.rejectedReasons.includes("repeats-current-message"));
});

test("AGENT-216 suppresses questions answered by conversation, understanding, journal, or module context", () => {
  const intelligence = new SharedConsultationIntelligence();
  const story = intelligence.understand("Can you help me decide what to do next?", {
    conversationContext: [{ id: "conversation", label: "certification", value: "AWS Solutions Architect", source: "conversation-context" }],
    memberUnderstanding: [{ id: "preference", label: "communication style", value: "Plain language", source: "member-understanding" }],
    professionalJournal: [{ id: "journal", label: "learning consistency", value: "Improving", source: "professional-journal" }],
    moduleData: [{ id: "medication", label: "medication", value: "Lisinopril", source: "module-data" }],
  });
  assert.equal(intelligence.assessQuestion(story, "Which certification are you pursuing?").shouldAsk, false);
  assert.equal(intelligence.assessQuestion(story, "Which medication are you taking?").shouldAsk, false);
  assert.equal(intelligence.assessQuestion(story, "What communication style do you prefer?").shouldAsk, false);
});

test("AGENT-216 allows one material clarification and explains why it matters", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.healthAdvisor);
  const plan = planner.createPlan({
    specialistId: "beasthealth.health-advisor",
    input: "Should I change it?",
    confidence: 0.4,
    ambiguous: true,
    proposedClarificationQuestion: "Which current care plan are you referring to?",
  });
  assert.equal(plan.requiresClarification, true);
  assert.equal((plan.clarificationQuestion?.match(/\?/g) || []).length, 1);
  assert.match(plan.clarificationReason || "", /required|correct/i);
  assert.match(plan.steps[1].purpose, /continue from the existing analysis/i);
});

test("AGENT-216 lets the shared planner continue when a proposed question is redundant", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.guidanceCounselor);
  const plan = planner.createPlan({
    specialistId: "beasteducation.guidance-counselor",
    input: "I chose the AWS Solutions Architect certification. Help me plan the next step.",
    confidence: 0.5,
    ambiguous: true,
    proposedClarificationQuestion: "Which certification did you choose?",
    requirements: [{ id: "learner-records", kind: "information", description: "Load current learner records", required: true, alreadyAvailable: true }],
  });
  assert.equal(plan.requiresClarification, false);
  assert.equal(plan.consultationQuestionDecision?.shouldAsk, false);
  assert.deepEqual(plan.steps.map((step) => step.kind), ["understand", "reason", "answer"]);
});

const moneyModel = buildMoneyCoachExperience({
  ownerId: "owner-1",
  userName: "Sean",
  asOfDate: new Date("2026-07-23T12:00:00.000Z"),
  activeBillCount: 1,
  billsDueSoonCount: 1,
  monthlyBills: 900,
  activeDebtCount: 1,
  totalDebt: 10000,
  projectedDebtReduction: 500,
  debtProgressPercent: 5,
  monthlyIncome: 6000,
  monthlyOutflow: 4300,
  projectedSurplus: 1700,
  currentCash: 5000,
  cashBuffer: 2500,
  utilization: 20,
  fundingSourceCount: 1,
  safeFundingSourceCapacity: 2000,
  assignedIncomePotCount: 1,
  totalObligationCount: 1,
  recommendationTitle: "Maintain the reserve",
  recommendationAction: "Keep the current reserve protected.",
  recommendationWhy: "Current cash remains above the configured reserve.",
  recommendationHref: "/dashboard/money/dashboard",
  interestSaved: 0,
  timeSavedMonths: 0,
  helocReserve: 2000,
});

test("Money Coach consumes consultation comprehension without breaking existing conversations", () => {
  const answer = answerMoneyCoachQuestion(
    "I store excess cash in my HELOC between due dates. Can I safely make another payment?",
    moneyModel,
    {
      recentMessages: ["We previously reviewed the reserve."],
      summary: "The member protects a cash reserve before extra payments.",
      memories: [{ key: "cash-buffer", value: 2500 }],
    }
  );
  assert.equal(answer.intent, "payment-affordability");
  assert.ok((answer.consultation?.explicitFactCount || 0) > 0);
  assert.ok((answer.consultation?.implicitFactCount || 0) > 0);
  assert.doesNotMatch(answer.text, /what account are you paying bills from/i);
});
