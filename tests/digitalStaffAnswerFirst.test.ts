import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acquireDigitalStaffRequestLease,
  buildDigitalStaffInteractionPolicy,
  buildRuntimeInput,
  buildRuntimeInstructions,
  professionalConfigs,
  maximumDigitalStaffLeaseMs,
  requestsConsequentialAction,
  runDigitalStaffRuntime,
  validateRuntimePlan,
  type ConversationState,
  type ProfessionalId,
  type RuntimeContext,
  type RuntimePlan,
} from "../src/lib/digitalStaffRuntime";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import {
  boundLearningConversationMessages,
  maximumLearningHistoryCharacters,
  maximumLearningHistoryMessages,
  maximumLearningRequestCharacters,
} from "../src/lib/learning/conversationBounds";

const baseState: ConversationState = {
  currentTopic: null,
  currentWorkspace: null,
  lastProfessionalQuestion: null,
  unresolvedQuestions: [],
  corrections: [],
  pendingApprovals: [],
  currentGoal: null,
  previousDecisions: [],
};

function context(professionalId: ProfessionalId, text: string): RuntimeContext {
  return {
    ownerId: "owner",
    professionalId,
    conversationId: "conversation",
    message: { id: "message", role: "user", text, createdAt: "2026-08-15T12:00:00Z" },
    recentMessages: [],
    state: baseState,
    memories: [],
    structuredRecords: [{ domain: professionalId, record: { status: "current", value: 1 } }],
    workspace: null,
  };
}

function plan(response: string, patch: Partial<RuntimePlan> = {}): RuntimePlan {
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
    responseContract: safeMemberAgentResponseContract,
    ...patch,
  };
}

test("DS-UX-03 gives every professional one explicit answer-first and confirmation contract", () => {
  for (const config of Object.values(professionalConfigs)) {
    const instructions = buildRuntimeInstructions(config);
    assert.match(instructions, /Read, analyze, explain, summarize, compare, calculate, and recommend directly/i);
    assert.match(instructions, /Never ask permission to inspect, read, access, or use context/i);
    assert.match(instructions, /Ask exactly one concise clarification only when/i);
    assert.match(instructions, /change persistent state only through an allowed proposal or confirmation-required action/i);
  }
});

test("DS-UX-03 representative Money, Education, and Health questions answer from canonical context", () => {
  const cases: Array<[ProfessionalId, string, string]> = [
    ["beastmoney.money-coach", "How does my saved debt picture look?", "Your saved debt context supports a direct review."],
    ["beasteducation.guidance-counselor", "What should I focus on next?", "Your saved education plan points to the next useful step."],
    ["beasthealth.health-advisor", "How can I prepare for my appointment?", "Use the saved health record to prepare questions; this does not replace clinical care."],
  ];
  for (const [professionalId, question, response] of cases) {
    const runtimeContext = context(professionalId, question);
    const input = JSON.parse(buildRuntimeInput(professionalConfigs[professionalId], runtimeContext));
    const result = validateRuntimePlan(runtimeContext, plan(response));
    assert.equal(input.interactionPolicy.canonicalContextAvailable, true);
    assert.equal(input.interactionPolicy.mode, "answer");
    assert.equal(result.response, response);
    assert.equal(result.nextQuestion, null);
  }
});

test("DS-UX-03 suppresses permission loops and repeated questions without suppressing necessary clarification", () => {
  const money = context("beastmoney.money-coach", "What does my saved cash flow show?");
  const permissionLoop = validateRuntimePlan(money, plan("I can review that.", {
    intent: "clarification",
    nextQuestion: "May I inspect your BeastMoney records?",
  }));
  assert.equal(permissionLoop.intent, "answer");
  assert.equal(permissionLoop.nextQuestion, null);
  assert.match(permissionLoop.validationFailures.join(" "), /unnecessary permission/i);

  const repeatedContext = {
    ...money,
    state: { ...baseState, lastProfessionalQuestion: "Which debt should we discuss?" },
  };
  const repeated = validateRuntimePlan(repeatedContext, plan("Here is what the saved records show.", {
    nextQuestion: "Which debt should we discuss?",
  }));
  assert.equal(repeated.nextQuestion, null);
  assert.match(repeated.validationFailures.join(" "), /repeated clarification/i);

  const ambiguous = {
    ...context("beasthealth.health-advisor", "Should I change it?"),
    structuredRecords: [],
  };
  const clarification = validateRuntimePlan(ambiguous, plan("I need the referenced item to answer safely.", {
    intent: "clarification",
    nextQuestion: "Which medication or care-plan item do you mean?",
  }));
  assert.equal(clarification.intent, "clarification");
  assert.equal(clarification.nextQuestion, "Which medication or care-plan item do you mean?");
});

test("DS-UX-03 classifies consequential execution separately and preserves proposal confirmation", () => {
  assert.equal(requestsConsequentialAction("Please submit my application for me."), true);
  assert.equal(requestsConsequentialAction("Should I submit this application?"), false);
  const actionContext = context("beasteducation.guidance-counselor", "Please submit my application for me.");
  assert.equal(buildDigitalStaffInteractionPolicy(actionContext).mode, "consequential_action");
  const result = validateRuntimePlan(actionContext, plan("I can prepare a proposal, but cannot submit it without confirmation.", {
    proposals: [{
      id: "proposal",
      domain: "education",
      entityType: "application",
      fields: { status: "draft" },
      sourceMessageId: "message",
      confidence: 0.9,
      missingFields: [],
      contradictions: [],
      approvalStatus: "proposed",
      relatedRecordId: null,
      proposedAction: "create",
    }],
    toolCalls: [{ name: "submit_application", arguments: {} }],
  }));
  assert.equal(result.proposals[0]?.approvalStatus, "proposed");
  assert.equal(result.toolCalls.length, 0);
  assert.match(result.validationFailures.join(" "), /not permitted/i);
});

test("DS-PERF-01 bounds Learning history, total characters, and client-controlled roles", () => {
  const messages = Array.from({ length: 20 }, (_, index) => ({
    role: index === 0 ? "system" : index % 2 ? "user" : "assistant",
    content: `${index}:`.padEnd(3_000, "x"),
  }));
  const bounded = boundLearningConversationMessages(messages, "Current learning question");
  assert.ok(bounded.length <= maximumLearningHistoryMessages);
  assert.ok(bounded.reduce((total, message) => total + message.content.length, 0) <= maximumLearningHistoryCharacters);
  assert.ok(bounded.every((message) => message.role !== "system"));
  assert.equal(bounded.at(-1)?.content, "Current learning question");
  assert.equal(maximumLearningRequestCharacters, 4_000);
});

test("DS-PERF-01 enforces a per-member professional concurrency and request-rate budget", () => {
  const ownerId = `owner-${Date.now()}`;
  const active = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_000);
  assert.equal(active.ok, true);
  const duplicate = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_001);
  assert.deepEqual(duplicate, { ok: false, reason: "concurrent_request", retryAfterSeconds: 2 });
  if (active.ok) active.release();
  for (let index = 1; index < 12; index += 1) {
    const lease = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_001 + index);
    assert.equal(lease.ok, true);
    if (lease.ok) lease.release();
  }
  const limited = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_020);
  assert.equal(limited.ok, false);
  if (!limited.ok) assert.equal(limited.reason, "rate_limit");
});

test("DS-PERF-01 expires an abandoned lease without letting its late release clear a replacement", () => {
  const ownerId = `stale-owner-${Date.now()}`;
  const stale = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_000);
  assert.equal(stale.ok, true);
  const replacement = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_000 + maximumDigitalStaffLeaseMs);
  assert.equal(replacement.ok, true);
  if (stale.ok) stale.release();
  const stillActive = acquireDigitalStaffRequestLease(ownerId, "beastmoney.money-coach", 1_000 + maximumDigitalStaffLeaseMs + 1);
  assert.deepEqual(stillActive, { ok: false, reason: "concurrent_request", retryAfterSeconds: 2 });
  if (replacement.ok) replacement.release();
});

test("DS-PERF-01 ordinary runtime turns use one generation plus isolated input/output verification", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let generationCalls = 0;
  let verifierCalls = 0;
  const completedPlan = plan("A direct answer from the supplied context.");
  const body = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "{" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: { output_text: JSON.stringify(completedPlan) } })}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";
  process.env.OPENAI_API_KEY = "sk-proj-SINGLE_TEST_TOKEN_1234567890";
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body || "{}")) as { text?: { format?: { name?: string } } };
    if (request.text?.format?.name === "member_agent_semantic_verification") {
      verifierCalls += 1;
      return Response.json({ output_text: JSON.stringify({ verdict: "safe", categories: [] }) });
    }
    generationCalls += 1;
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };
  try {
    const result = await runDigitalStaffRuntime(context("beastmoney.money-coach", "Explain my saved debt picture."));
    assert.equal(result.response, completedPlan.response);
    assert.equal(generationCalls, 1);
    assert.equal(verifierCalls, 2);
    assert.ok((result.timings.promptCharacters || 0) > 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("DS-PERF-01 rejects model-suggested research for the laptop affordability turn", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let generationCalls = 0;
  let verifierCalls = 0;
  const completedPlan = plan("Based on the saved cash position, here is the supported conclusion.", {
    research: { query: "laptop affordability today", reason: "Check current information", domains: ["irs.gov"] },
  });
  const body = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "{" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: { output_text: JSON.stringify(completedPlan) } })}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";
  process.env.OPENAI_API_KEY = "sk-proj-SINGLE_TEST_TOKEN_1234567890";
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body || "{}")) as { text?: { format?: { name?: string } } };
    if (request.text?.format?.name === "member_agent_semantic_verification") {
      verifierCalls += 1;
      return Response.json({ output_text: JSON.stringify({ verdict: "safe", categories: [] }) });
    }
    generationCalls += 1;
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };
  try {
    const result = await runDigitalStaffRuntime(context("beastmoney.money-coach", "Can I afford to buy a new laptop today?"));
    assert.equal(generationCalls, 1);
    assert.equal(verifierCalls, 2);
    assert.equal(result.research, null);
    assert.match(result.validationFailures.join(" "), /unnecessary external research/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("DS-PERF-01 keeps context stages concurrent, bounded, and single-fetch", () => {
  const route = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  const entitlement = readFileSync("src/lib/memberAgeServer.ts", "utf8");
  assert.match(route, /Promise\.all\(\[/);
  assert.match(route, /requireProfessionalEntitlement\(professionalId, \{ supabase, user \}\)/);
  assert.match(entitlement, /authenticated\?\.supabase \|\| createRouteClient\(\)/);
  assert.match(route, /buildMoneyCoachStructuredRecords/);
  assert.match(route, /from\("income_events"\)/);
  assert.match(route, /from\("cash_settings"\)/);
  assert.match(route, /from\("funding_sources"\)/);
  assert.match(route, /\.limit\(19\)/);
  assert.match(route, /\.limit\(20\)/);
  assert.equal((route.match(/loadStructuredRecords\(supabase, user\.id, professionalId\)/g) || []).length, 1);
});
