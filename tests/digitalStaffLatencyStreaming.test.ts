import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildRuntimeInput,
  digitalStaffActivityLabels,
  isProductSupportQuestion,
  requireProfessionalConfig,
  requiresDeterministicResearch,
  requestOpenAIResponseStream,
  type RuntimeContext,
} from "../src/lib/digitalStaffRuntime";

const message = (text: string) => ({ id: "message", role: "user" as const, text, createdAt: "2026-08-08T12:00:00Z" });

test("AP-105 deterministic research boundaries distinguish current authorities from current member records", () => {
  assert.equal(requiresDeterministicResearch({ professionalId: "beasteducation.guidance-counselor", message: message("What are the current OPM requirements for this federal series?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beastmoney.money-coach", message: message("What are the current IRS contribution limits?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beasthealth.health-advisor", message: message("What does the FDA currently say about this medication?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beasthealth.health-advisor", message: message("Where do I update my current medications?") }), false);
  assert.equal(requiresDeterministicResearch({ professionalId: "beastmoney.money-coach", message: message("What did I tell you my current priority was?") }), false);
});

test("AP-105 product navigation omits unrelated private records while preserving bounded continuity", () => {
  assert.equal(isProductSupportQuestion("Where do I upload my transcript?"), true);
  const context = {
    ownerId: "owner", professionalId: "beasteducation.guidance-counselor", conversationId: "conversation",
    message: message("Where do I upload my transcript?"), recentMessages: Array.from({ length: 12 }, (_, index) => message(`history-${index}`)),
    state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] },
    memories: [{ key: "private", value: "not needed", updatedAt: "2026-08-08T12:00:00Z" }],
    structuredRecords: [{ domain: "education", record: { private: "not needed" } }], workspace: null,
  } satisfies RuntimeContext;
  const input = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), context));
  assert.equal(input.recentConversation.length, 4);
  assert.deepEqual(input.relevantMemory, []);
  assert.deepEqual(input.structuredRecords, []);
});

test("AP-105 OpenAI stream parser forwards text deltas and returns the completed response", async () => {
  const originalFetch = globalThis.fetch;
  const completed = { id: "response", output_text: "Hello" };
  const body = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "Hel" })}`,
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "lo" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: completed })}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";
  globalThis.fetch = async () => new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  const deltas: string[] = [];
  let responseHeadersSeen = false;
  let completedSeen = false;
  try {
    const result = await requestOpenAIResponseStream<typeof completed>({ model: "test" }, { apiKey: "sk-proj-SINGLE_TEST_TOKEN_1234567890", onOutputTextDelta: (delta) => { deltas.push(delta); }, onResponseHeaders: () => { responseHeadersSeen = true; }, onComplete: () => { completedSeen = true; } });
    assert.equal(result.output_text, "Hello");
    assert.equal(deltas.join(""), "Hello");
    assert.equal(responseHeadersSeen, true);
    assert.equal(completedSeen, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AP-105 shared client and route expose acknowledged activity streaming and safe retry contracts", () => {
  const client = readFileSync("src/lib/digitalStaffRuntime/client.ts", "utf8");
  const route = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  assert.match(client, /application\/x-ndjson/);
  assert.match(client, /onAcknowledged/);
  assert.match(client, /onResponseDelta/);
  assert.match(client, /onFirstUsefulContent/);
  assert.match(client, /onStreamComplete/);
  assert.match(route, /type: "acknowledged"/);
  assert.match(route, /reportDigitalStaffLifecycle/);
  assert.match(route, /providerResponseHeadersMs/);
  assert.match(route, /providerFirstEventMs/);
  assert.match(route, /providerCompleteMs/);
  assert.match(route, /validationMs/);
  assert.doesNotMatch(route, /console\.(?:log|info).*message/);
  assert.equal(digitalStaffActivityLabels.researching, "Checking current sources…");
});

test("AP-105 specialist surfaces render optimistic turns and stop using Sending for the whole turn", () => {
  for (const file of [
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "src/app/dashboard/director/DirectorExperience.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /Working…/);
    assert.match(source, /Try again/);
  }
});
