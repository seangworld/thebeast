import assert from "node:assert/strict";
import test from "node:test";
import { professionalConfigs, requireProfessionalConfig, validateNavigationTarget, validateRuntimePlan, validateToolCalls, deidentifyResearchQuery, parseRuntimePlan, type RuntimeContext, type RuntimePlan } from "../src/lib/digitalStaffRuntime";

const baseState = { currentTopic: "education", currentWorkspace: "/dashboard/education/guidance-counselor", lastProfessionalQuestion: "Tell me about your educational journey.", unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };
const context: RuntimeContext = { ownerId: "owner-a", professionalId: "beasteducation.guidance-counselor", conversationId: "conversation-a", message: { id: "message-a", role: "user", text: "I graduated high school in 1990, joined the Army, later served in the Guard, and now work for DLA.", createdAt: "2026-08-08T12:00:00Z" }, recentMessages: [], state: baseState, memories: [], structuredRecords: [], workspace: "/dashboard/education/guidance-counselor" };

function plan(patch: Partial<RuntimePlan> = {}): RuntimePlan {
  return { intent: "answer_previous_question", response: "That gives us a useful foundation.", nextQuestion: "What direction would you like to explore next?", state: baseState, proposals: [], navigationTarget: null, toolCalls: [], research: null, handoff: null, ...patch };
}

test("AP-100A registers four professionals on one configuration contract", () => {
  assert.deepEqual(Object.keys(professionalConfigs).sort(), ["beasteducation.guidance-counselor", "beastfusion.fusion-director", "beasthealth.health-advisor", "beastmoney.money-coach"]);
  assert.equal(requireProfessionalConfig("beastfusion.fusion-director").name, "Avery Stone");
});

test("answer to a previous question remains an answer instead of an unrelated message", () => {
  const result = validateRuntimePlan({ ...context, professionalId: "beastmoney.money-coach", message: { ...context.message, text: "Getting out of debt as soon as possible." } }, plan({ intent: "answer_previous_question", state: { ...baseState, currentGoal: "Get out of debt as soon as possible" } }));
  assert.equal(result.intent, "answer_previous_question");
  assert.equal(result.state.currentGoal, "Get out of debt as soon as possible");
});

test("clarification questions never become structured member data", () => {
  const result = validateRuntimePlan({ ...context, professionalId: "beasthealth.health-advisor", message: { ...context.message, text: "What do you mean by current medications?" } }, plan({ intent: "clarification", proposals: [{ id: "bad", domain: "health", entityType: "medication", fields: { name: "What do you mean" }, sourceMessageId: "message-a", confidence: 0.5, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" }] }));
  assert.equal(result.proposals.length, 0);
});

test("one message may produce separate education, military, and employment proposals", () => {
  const result = validateRuntimePlan(context, plan({ proposals: [
    { id: "education", domain: "education", entityType: "education", fields: { institution: "High School", graduationYear: 1990 }, sourceMessageId: "message-a", confidence: 0.8, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" },
    { id: "army", domain: "military", entityType: "military_service", fields: { branch: "Army" }, sourceMessageId: "message-a", confidence: 0.9, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" },
    { id: "dla", domain: "employment", entityType: "employment", fields: { employer: "DLA" }, sourceMessageId: "message-a", confidence: 0.9, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" },
  ] }));
  assert.deepEqual(result.proposals.map((item) => item.domain), ["education", "military", "employment"]);
});

test("product support can return only an authoritative direct route", () => {
  const config = requireProfessionalConfig("beasteducation.guidance-counselor");
  assert.equal(validateNavigationTarget(config, "/dashboard/education/education-planning")?.label, "Education Planning");
  assert.equal(validateNavigationTarget(config, "/invented-route"), null);
});

test("product support infers an authoritative route when the model omits its navigation target", () => {
  const moneyResult = validateRuntimePlan(
    { ...context, professionalId: "beastmoney.money-coach", message: { ...context.message, text: "Where in Beast can I review and manage my debts?" } },
    plan({ intent: "product_support", navigationTarget: null })
  );
  const educationResult = validateRuntimePlan(
    { ...context, message: { ...context.message, text: "Where in Beast should I build my education plan?" } },
    plan({ intent: "product_support", navigationTarget: null })
  );

  assert.equal(moneyResult.navigationTarget, "/dashboard/money/debts");
  assert.equal(educationResult.navigationTarget, "/dashboard/education/education-planning");
});

test("out-of-scope and malformed tool calls fail closed", () => {
  const result = validateToolCalls(requireProfessionalConfig("beasthealth.health-advisor"), [{ name: "move_money", arguments: {} }, { name: "read_health_records", arguments: [] as unknown as Record<string, unknown> }]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.failures.length, 2);
});

test("research queries remove direct identifiers", () => {
  const query = deidentifyResearchQuery("My name is Sean World and email is sean@example.com. Account 4111 1111 1111 1111. What does FDA say?");
  assert.doesNotMatch(query, /Sean World|sean@example.com|4111/);
});

test("explicit authoritative-current questions require de-identified allowlisted research", () => {
  const result = validateRuntimePlan(
    {
      ...context,
      professionalId: "beasthealth.health-advisor",
      message: { ...context.message, text: "According to current authoritative guidance, what does 180/120 mean? Email me at member@example.com." },
    },
    plan({ research: null })
  );

  assert.ok(result.research);
  assert.doesNotMatch(result.research.query, /member@example.com/);
  assert.deepEqual(result.research.domains, requireProfessionalConfig("beasthealth.health-advisor").researchDomains);
});

test("ordinary references to current member records do not force external research", () => {
  const result = validateRuntimePlan(
    {
      ...context,
      professionalId: "beasthealth.health-advisor",
      message: { ...context.message, text: "Can you organize my current medications?" },
    },
    plan({ research: null })
  );

  assert.equal(result.research, null);
});

test("disclosed member facts do not accept a model-invented research pass", () => {
  const result = validateRuntimePlan(
    { ...context, professionalId: "beasthealth.health-advisor", message: { ...context.message, text: "I currently take Medication X." } },
    plan({ research: { query: "Medication X", reason: "lookup", domains: ["fda.gov"] } })
  );
  assert.equal(result.research, null);
});

test("malformed model output fails safely before any tool execution", () => {
  assert.throws(() => parseRuntimePlan({ output_text: JSON.stringify({ response: "missing protocol" }) }), /malformed/);
});

test("strict model protocol normalizes structured fields and tool arguments", () => {
  const parsed = parseRuntimePlan({ output_text: JSON.stringify({
    ...plan(),
    proposals: [{ id: "medication", domain: "health", entityType: "medication", fields: [{ name: "name", value: "metoprolol" }], sourceMessageId: "message-a", confidence: 0.95, missingFields: ["dose"], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" }],
    toolCalls: [{ name: "create_knowledge_proposal", arguments: [{ name: "proposalId", value: "medication" }] }],
  }) });
  assert.deepEqual(parsed.proposals[0]?.fields, { name: "metoprolol" });
  assert.deepEqual(parsed.toolCalls[0]?.arguments, { proposalId: "medication" });
});
