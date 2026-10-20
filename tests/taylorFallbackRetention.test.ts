import test from "node:test";
import assert from "node:assert/strict";
import { guardUnrequestedVeteransSecondaryTheory } from "../src/lib/digitalStaffRuntime/veteransGrounding";
import { runDigitalStaffRuntime } from "../src/lib/digitalStaffRuntime/runtime";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import type { RuntimeContext } from "../src/lib/digitalStaffRuntime/types";

const context: RuntimeContext = { ownerId: "synthetic", professionalId: "beasthealth.health-advisor", conversationId: "c", message: { id: "m", role: "user", text: "Explain this VA decision letter and its evidence gaps. Help me prepare.", createdAt: "2026-10-20" }, recentMessages: [], memories: [], structuredRecords: [], documents: [{ id: "d", title: "Synthetic VA decision", content: {} }], workspace: null, state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] } };
const facts = "## Letter details\n\nThe fictional decision, p. 1, acknowledges a current left-knee condition. It denies the claim for lack of an in-service knee event and a supported connection. The right-ankle entry does not establish a left-knee injury.";
const theory = "## Secondary service connection\n\nAnother service-connected condition might have caused this.\n\nAsk the clinician to support that route.";
const preparation = "## Preparation\n\n1. Gather records about the claimed left-knee event.\n2. Ask a clinician for an independent assessment, including contrary evidence.\n\nSource: https://www.va.gov/disability/how-to-file-claim/evidence-needed/";
const candidate = `${facts}\n\n${theory}\n\n${preparation}`;

test("triggered scope fallback retains letter facts, laterality, gaps, independent steps and source URL", () => {
  const result = guardUnrequestedVeteransSecondaryTheory(context, candidate);
  assert.equal(result.safe, false);
  assert.ok(result.response.includes(facts));
  assert.ok(result.response.includes(preparation));
  assert.doesNotMatch(result.response, /secondary|another service-connected|support that route/i);
  assert.match(result.response, /not a complete review/);
});

test("mixed paragraphs and dependent follow-on prose are withheld intact rather than silently rewritten", () => {
  const result = guardUnrequestedVeteransSecondaryTheory(context, "A left-knee finding appears on p. 1. Secondary service connection may apply.\n\nThat route would establish the connection.");
  assert.doesNotMatch(result.response, /left-knee|That route|p\. 1/);
  assert.match(result.response, /withheld/);
});

test("nested headings cannot reopen a withheld parent section", () => {
  const result = guardUnrequestedVeteransSecondaryTheory(context, `${facts}\n\n${theory}\n\n### Supporting that route\n\nAsk for a favorable opinion.\n\n${preparation}`);
  assert.doesNotMatch(result.response, /favorable opinion|Supporting that route/);
  assert.ok(result.response.includes(preparation));
});

test("clean and explicitly requested answers remain unchanged; unrelated professionals are unaffected", () => {
  assert.equal(guardUnrequestedVeteransSecondaryTheory(context, facts).response, facts);
  assert.equal(guardUnrequestedVeteransSecondaryTheory({ ...context, message: { ...context.message, text: "Explain secondary service connection for this VA decision." } }, candidate).response, candidate);
  assert.equal(guardUnrequestedVeteransSecondaryTheory({ ...context, professionalId: "beastmoney.money-coach" }, candidate).response, candidate);
});

// Provider transport is replaced for every request. These are contract checks,
// not live inference or independent semantic grading of the synthetic prose.
for (const researched of [false, true]) {
for (const rejectRetained of [false, true]) {
  test(`runtime checks retained prose before streaming (semantic rejection=${rejectRetained}, researched=${researched})`, async () => {
    const originalFetch = globalThis.fetch;
    const oldKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-proj-TEST_ONLY_TAYLOR_FALLBACK_123456789";
    const requests: Record<string, any>[] = [];
    const chunks: string[] = [];
    globalThis.fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      requests.push(request);
      if (request.text?.format?.name === "member_agent_semantic_verification") {
        const output = JSON.parse(request.input).phase === "output";
        return Response.json({ output_text: JSON.stringify(output && rejectRetained ? { verdict: "unsafe", categories: ["other_boundary_violation"] } : { verdict: "safe", categories: [] }) });
      }
      if (request.tools) return new Response(`data: ${JSON.stringify({ type: "response.completed", response: { output: [{ content: [{ type: "output_text", text: "Official evidence guidance.", annotations: [{ type: "url_citation", title: "VA", url: "https://www.va.gov/disability/" }] }] }] } })}\n\ndata: [DONE]\n\n`, { headers: { "Content-Type": "text/event-stream" } });
      if (request.text?.format?.name !== "digital_staff_runtime_plan") return new Response(`data: ${JSON.stringify({ type: "response.completed", response: { output_text: candidate } })}\n\ndata: [DONE]\n\n`, { headers: { "Content-Type": "text/event-stream" } });
      const plan = { intent: "answer", response: candidate, nextQuestion: null, state: context.state, proposals: [], navigationTarget: null, toolCalls: [], research: researched ? { query: "VA service connection evidence requirements", reason: "official guidance", domains: ["va.gov"] } : null, handoff: null, responseContract: safeMemberAgentResponseContract };
      return new Response(`data: ${JSON.stringify({ type: "response.completed", response: { output_text: JSON.stringify(plan) } })}\n\ndata: [DONE]\n\n`, { headers: { "Content-Type": "text/event-stream" } });
    };
    try {
      const result = await runDigitalStaffRuntime(context, { onResponseDelta: text => { chunks.push(text); } });
      assert.ok(result.validationFailures.includes("unrequested-secondary-veterans-theory"));
      assert.equal(requests.length, researched ? 5 : 3); // unchanged successful path budget; no regeneration/retry
      const outputInput = JSON.stringify(requests[requests.length - 1].input);
      assert.match(outputInput, /right-ankle/);
      assert.doesNotMatch(outputInput, /support that route|Secondary service connection/);
      assert.equal(chunks.join(""), result.response);
      if (rejectRetained) {
        assert.ok(result.validationFailures.includes("semantic-verifier-unsafe"));
        assert.ok(!result.response.includes(facts));
      } else {
        assert.ok(result.response.includes(facts));
        assert.ok(result.response.includes(preparation));
      }
      assert.equal(result.proposals.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = oldKey;
    }
  });
}

}
