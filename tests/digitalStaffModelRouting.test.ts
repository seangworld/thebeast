import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultOrdinaryDigitalStaffModel,
  defaultStrongDigitalStaffModel,
  digitalStaffEvaluationCases,
  digitalStaffModelTier,
  runDigitalStaffRuntime,
  selectDigitalStaffModel,
  type RuntimeContext,
  type RuntimePlan,
} from "../src/lib/digitalStaffRuntime";

const baseState = {
  currentTopic: null,
  currentWorkspace: null,
  lastProfessionalQuestion: null,
  unresolvedQuestions: [],
  corrections: [],
  pendingApprovals: [],
  currentGoal: null,
  previousDecisions: [],
};

function context(text: string): RuntimeContext {
  return {
    ownerId: "routing-owner",
    professionalId: "beastmoney.money-coach",
    conversationId: "routing-conversation",
    message: { id: "routing-message", role: "user", text, createdAt: "2026-08-16T12:00:00Z" },
    recentMessages: [],
    state: baseState,
    memories: [],
    structuredRecords: [{ domain: "money", record: { available_cash: 4_500 } }],
    workspace: "/dashboard/money/coach",
  };
}

function completedPlan(response: string): RuntimePlan {
  return {
    intent: "answer",
    response,
    nextQuestion: null,
    state: baseState,
    proposals: [],
    navigationTarget: null,
    toolCalls: [],
    research: null,
    handoff: null,
  };
}

test("DS-MODEL-ROUTE maps every approved evaluation case to its expected task tier", () => {
  for (const evaluationCase of digitalStaffEvaluationCases) {
    assert.equal(
      digitalStaffModelTier(evaluationCase.context),
      evaluationCase.tier,
      evaluationCase.id,
    );
  }
});

test("DS-MODEL-ROUTE selects Luna for ordinary turns and gpt-5 for strong work", () => {
  const emptyEnvironment = {};
  assert.equal(
    selectDigitalStaffModel(context("Explain my saved debt picture."), emptyEnvironment),
    defaultOrdinaryDigitalStaffModel,
  );
  assert.equal(
    selectDigitalStaffModel(
      context("Build a detailed payoff strategy and compare avalanche with snowball tradeoffs."),
      emptyEnvironment,
    ),
    defaultStrongDigitalStaffModel,
  );
});

test("DS-MODEL-ROUTE preserves explicit model overrides", () => {
  const ordinary = context("Explain my saved debt picture.");
  assert.equal(
    selectDigitalStaffModel(ordinary, { OPENAI_DIGITAL_STAFF_MODEL: "legacy-model" }),
    "legacy-model",
  );
  assert.equal(
    selectDigitalStaffModel(ordinary, { OPENAI_DIGITAL_STAFF_FAST_MODEL: "fast-model" }),
    "fast-model",
  );
});

test("DS-MODEL-ROUTE keeps an ordinary turn to one provider call with the fast model", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalLegacyModel = process.env.OPENAI_DIGITAL_STAFF_MODEL;
  const originalFastModel = process.env.OPENAI_DIGITAL_STAFF_FAST_MODEL;
  const originalStrongModel = process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL;
  let providerCalls = 0;
  let requestedModel = "";
  const plan = completedPlan("A direct answer from canonical context.");
  const body = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "{" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: { output_text: JSON.stringify(plan) } })}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

  process.env.OPENAI_API_KEY = "sk-proj-ROUTING_TEST_TOKEN_1234567890";
  delete process.env.OPENAI_DIGITAL_STAFF_MODEL;
  delete process.env.OPENAI_DIGITAL_STAFF_FAST_MODEL;
  delete process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL;
  globalThis.fetch = async (_input, init) => {
    providerCalls += 1;
    requestedModel = String(JSON.parse(String(init?.body)).model || "");
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };

  try {
    const result = await runDigitalStaffRuntime(context("Explain my saved debt picture."));
    assert.equal(providerCalls, 1);
    assert.equal(requestedModel, defaultOrdinaryDigitalStaffModel);
    assert.equal(result.model, defaultOrdinaryDigitalStaffModel);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalLegacyModel === undefined) delete process.env.OPENAI_DIGITAL_STAFF_MODEL;
    else process.env.OPENAI_DIGITAL_STAFF_MODEL = originalLegacyModel;
    if (originalFastModel === undefined) delete process.env.OPENAI_DIGITAL_STAFF_FAST_MODEL;
    else process.env.OPENAI_DIGITAL_STAFF_FAST_MODEL = originalFastModel;
    if (originalStrongModel === undefined) delete process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL;
    else process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL = originalStrongModel;
  }
});
