import test from "node:test";
import assert from "node:assert/strict";
import { runDigitalStaffRuntime } from "../src/lib/digitalStaffRuntime/runtime";
import { executeGuidanceDiscovery, guidanceQuestionScope, verifiedGuidanceEvidence } from "../src/lib/digitalStaffRuntime/guidanceDiscovery";
import { guidanceCitationsValid, guidanceSourcesCitedInAnswer, guidanceResearchUnavailable } from "../src/lib/digitalStaffRuntime/guidanceResearch";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import type { RuntimeContext } from "../src/lib/digitalStaffRuntime/types";
const state = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };
const base: RuntimeContext = { ownerId: "synthetic-gc-flow", professionalId: "beasteducation.guidance-counselor", conversationId: "synthetic-flow", requestId: "mock-flow", message: { id: "new", role: "user", text: "Compare Example College and Second College tuition and application deadlines for Spring 2027 for Alex Example, phone 202-555-0147.", createdAt: "2026-10-21" }, recentMessages: [], memories: [], structuredRecords: [{ domain: "education", record: { weekly_hours: 4, available_budget_total: 500, constraints: "Private caregiving" } }], workspace: null, state };
const urls = ["https://example.edu/program", "https://second.edu/program"], proofs = ["https://example.edu/about", "https://second.edu/about"];
const brief = { targets: ["Example College", "Second College"].map(organization => ({ organization, program: "IT AAS", region: "", intake: "Spring 2027" })), questions: ["tuition_and_fees", "deadlines"] };
const stream = (value: unknown, type = "response.completed") => new Response(`data: ${JSON.stringify({ type, response: value })}\n\n`);
const web = (value: unknown, seen: string[]) => ({ output_text: JSON.stringify(value), output: [{ type: "web_search_call", status: "completed", action: { sources: seen.map(url => ({ url })) } }] });

test("two-institution research preserves fee applicability and private context; failures never deliver unsupported synthesis", async () => {
 const original = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "sk-proj-SYNTHETIC_GC_FLOW_ONLY_123456789";
 try { for (const mode of ["good", "correction", "identity-citation", "foreign-citation", "missing-citation", "unsupported-claim", "unsafe-privacy", "forged-proof", "incomplete-verify"]) {
  const delivered: string[] = [], stages: string[] = []; let publicCalls = 0, outputChecks = 0;
  const context = mode === "correction" ? { ...base, message: { ...base.message, text: "Correction: I meant Fall 2027, not Spring 2027. Which costs and deadlines are confirmed?" }, recentMessages: [base.message] } : base;
  globalThis.fetch = async (_url, init) => {
   const request = JSON.parse(String(init?.body)), name = request.text?.format?.name, id = new Headers(init?.headers).get("X-Client-Request-Id") || "";
   if (name === "member_agent_semantic_verification") {
    const input = JSON.parse(request.input); stages.push(`safety-${input.phase}`);
    if (input.phase === "output") { outputChecks++;
     if (!["unsafe-privacy", "forged-proof"].includes(mode)) { assert.ok(input.guidanceResearchEvidence); assert.match(JSON.stringify(input.guidanceResearchEvidence), /Private caregiving/); assert.match(input.guidanceResearchEvidence.retrievedEvidence, /residency unknown/); }
     if (mode === "unsupported-claim") { assert.match(input.candidateResponse, /guaranteed/); return Response.json({ output_text: JSON.stringify({ verdict: "unsafe", categories: ["other_boundary_violation"] }) }); }
    }
    return Response.json({ output_text: JSON.stringify({ verdict: "safe", categories: [] }) });
   }
   assert.notEqual(name, "digital_staff_runtime_plan");
   if (name === "guidance_brief") { stages.push("brief"); assert.equal(request.reasoning.effort, "minimal"); return stream({ output_text: JSON.stringify(mode === "correction" ? { ...brief, targets: brief.targets.map(t => ({ ...t, intake: "Fall 2027" })) } : brief) }); }
   if (name === "guidance_privacy") { stages.push("privacy"); return stream({ output_text: JSON.stringify({ verdict: mode === "unsafe-privacy" ? "unsafe" : "safe" }) }); }
   if (request.tools) {
    publicCalls++; assert.doesNotMatch(request.input, /Alex Example|202-555|caregiving|weekly_hours|available_budget/); assert.equal(request.reasoning.effort, "medium"); assert.equal(request.max_tool_calls, 4); assert.equal(request.max_output_tokens, 3600);
    if (id.endsWith("-discover")) { stages.push("discover"); return stream(web({ candidates: urls.map((url, target) => ({ target, url })) }, urls)); }
    stages.push("verify"); if (mode === "incomplete-verify") return stream({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }, "response.incomplete");
    const findings = urls.map((url, target) => ({ target, question: "tuition_and_fees", fact: target === 0 ? "Spring 2027 resident rate $200 per credit; nonresident $450; materials excluded." : "Spring 2027 resident rate $180 per credit; nonresident $390; program fees excluded.", applicability: "Spring 2027 only; residency unknown; Fall 2027 unpublished", asOf: "2026-10-21", url }));
    return stream(web({ identities: urls.map((officialUrl, target) => ({ target, officialUrl, identityEvidenceUrl: mode === "forged-proof" ? "https://unrelated.example.net/about" : proofs[target], status: "verified", evidence: "Observed first-party identity page identifies the requested public institution." })), findings }, [...urls, ...proofs, "https://unrelated.example.net/about"]));
   }
   stages.push("synthesis"); assert.equal(request.reasoning.effort, "medium"); assert.equal(request.max_output_tokens, 4800);
   const input = JSON.parse(request.input); assert.match(JSON.stringify(input.memberContext), /weekly_hours.*4/); assert.match(input.retrievedEvidence, /deadlines.*unverified/);
   let answer = mode === "correction" ? `Fall 2027 rates remain unverified; Spring rates cannot be applied to that intake. With four weekly hours and a $500 budget, prepare questions first. Sources: ${urls.join(" ")}` : `With four weekly hours and $500, compare resident versus nonresident rates without assuming residency. Spring rates exclude materials/program fees; application deadlines remain unverified. Sources: ${urls.join(" ")}`;
   if (mode === "identity-citation") answer += ` Identity: ${proofs[0]}`;
   if (mode === "foreign-citation") answer += " https://unverified.edu/guarantee";
   if (mode === "missing-citation") answer = "Tuition is $200 per credit.";
   if (mode === "unsupported-claim") answer = `Admission is guaranteed and all credits transfer. ${urls[0]}`;
   return stream({ output_text: answer });
  };
  if (mode === "incomplete-verify") { await assert.rejects(runDigitalStaffRuntime(context, { onResponseDelta: async s => { delivered.push(s); } })); assert.equal(outputChecks, 0); assert.equal(delivered.length, 0); }
  else {
   const result = await runDigitalStaffRuntime(context, { onResponseDelta: async s => { delivered.push(s); } });
   if (["foreign-citation", "missing-citation", "unsafe-privacy", "forged-proof"].includes(mode)) assert.equal(result.response, guidanceResearchUnavailable);
   else if (mode === "unsupported-claim") { assert.doesNotMatch(result.response, /Admission is guaranteed|all credits transfer/); assert.ok(result.validationFailures.includes("other_boundary_violation")); }
   else { assert.equal(result.researchSources.length, mode === "identity-citation" ? 3 : 2); assert.equal(result.timings.providerInvocationCount, 7); assert.match(result.response, /four weekly hours/); }
   assert.equal(delivered.join(""), result.response); assert.equal(outputChecks, 1);
  }
  if (mode === "unsafe-privacy") assert.equal(publicCalls, 0); else assert.equal(publicCalls, 2);
  if (["unsafe-privacy", "forged-proof"].includes(mode)) assert.ok(!stages.includes("synthesis"));
 }} finally { globalThis.fetch = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test("intake correction retains original prerequisite/fee/deadline scope without assistant-topic contamination", () => {
 const allowed = guidanceQuestionScope({ currentMessage: { text: "Correction: I meant Fall 2027, not Spring 2027. Which requirements and costs are confirmed?" }, recentConversation: [{ role: "user", text: "Compare school prerequisites, tuition and fees, and application deadlines for Spring 2027." }, { role: "assistant", text: "We could also discuss exam renewal." }] });
 assert.deepEqual(allowed, ["admissions", "prerequisites", "tuition_and_fees", "deadlines"]);
});

test("citation membership rejects missing and lookalike references; target bounds reject out-of-range provenance", () => {
 assert.equal(guidanceCitationsValid(`Identity: ${proofs[0]}`, [{ url: urls[0], identityEvidenceUrl: proofs[0] }]), true);
 assert.equal(guidanceSourcesCitedInAnswer(`Identity: ${proofs[0]}`, [{ url: urls[0], identityEvidenceUrl: proofs[0] }])[0].url, proofs[0]);
 assert.equal(guidanceCitationsValid("No citations", [{ url: urls[0] }]), false);
 assert.equal(guidanceCitationsValid(`[source](${urls[0]}).`, [{ url: urls[0] }]), true);
 assert.equal(guidanceCitationsValid(`${urls[0]} https://example.edu.evil.test/program`, [{ url: urls[0] }]), false);
 assert.equal(verifiedGuidanceEvidence({ identities: [{ target: 9, officialUrl: urls[0], identityEvidenceUrl: proofs[0], status: "verified", evidence: "Sufficiently long but mismatched target identity." }], findings: [{ target: 9, question: "tuition_and_fees", fact: "Unsupported", applicability: "unknown", asOf: "unknown", url: urls[0] }] }, new Set([urls[0], proofs[0]]), [{ target: 9, url: urls[0] }], brief), null);
});

test("an expired whole-route signal stops research before any new provider call", async () => {
 const controller = new AbortController(); controller.abort(new Error("route deadline")); let calls = 0;
 await assert.rejects(executeGuidanceDiscovery({ model: "gpt-5", privateContext: "{}", signal: controller.signal, onCall: () => { calls++; } }), /route deadline/);
 assert.equal(calls, 0);
});

test("ordinary application drafting and Tutor handoff retain three-call nonresearch behavior", async () => {
 const original = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "sk-proj-SYNTHETIC_GC_FLOW_ONLY_123456789";
 try { for (const tutor of [false, true]) {
  let calls = 0;
  globalThis.fetch = async (_url, init) => { calls++; const request = JSON.parse(String(init?.body)); assert.equal(request.tools, undefined);
   if (request.text?.format?.name === "member_agent_semantic_verification") { assert.equal(JSON.parse(request.input).guidanceResearchEvidence, undefined); return Response.json({ output_text: JSON.stringify({ verdict: "safe", categories: [] }) }); }
   assert.equal(request.text.format.name, "digital_staff_runtime_plan");
   return stream({ output_text: JSON.stringify({ intent: tutor ? "handoff" : "answer", response: tutor ? "The Tutor can help with fractions at /dashboard/education/tutor, subject to your access. Start a conversation there; no private history was transferred." : "I bring retail experience and an associate degree to my interest in IT. This is a draft for you to review; nothing was submitted.", nextQuestion: null, state, proposals: [], navigationTarget: null, toolCalls: [], research: null, handoff: tutor ? { professionalId: "beasteducation.tutor", reason: "Learn fractions" } : null, responseContract: safeMemberAgentResponseContract }) });
  };
  const result = await runDigitalStaffRuntime({ ...base, message: { ...base.message, text: tutor ? "Can the Tutor help me understand fractions?" : "Draft a short application statement using my background." } });
  assert.equal(calls, 3); if (tutor) assert.equal(result.handoff?.professionalId, "beasteducation.tutor"); else assert.match(result.response, /retail experience/);
 }} finally { globalThis.fetch = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test("FAFSA authority and credential research use the same complete gated flow with sourced private synthesis", async () => {
 const original = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "sk-proj-SYNTHETIC_GC_FLOW_ONLY_123456789";
 try { for (const credential of [false, true]) {
  const official = credential ? "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/" : "https://studentaid.gov/understand-aid";
  const proof = credential ? "https://learn.microsoft.com/en-us/credentials/" : "https://studentaid.gov/about";
  const selected = { targets: [{ organization: credential ? "Microsoft" : "Federal Student Aid", program: credential ? "Azure Fundamentals AZ-900" : "FAFSA", region: "", intake: "" }], questions: credential ? ["prerequisites", "renewal"] : ["funding"] };
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
   calls++; const request = JSON.parse(String(init?.body)), name = request.text?.format?.name, id = new Headers(init?.headers).get("X-Client-Request-Id") || "";
   if (name === "member_agent_semantic_verification") { const input = JSON.parse(request.input); if (input.phase === "output") { assert.match(input.guidanceResearchEvidence.retrievedEvidence, /applicability/); assert.ok(input.guidanceResearchEvidence.memberContext.structuredRecords); } return Response.json({ output_text: JSON.stringify({ verdict: "safe", categories: [] }) }); }
   if (name === "guidance_brief") return stream({ output_text: JSON.stringify(selected) });
   if (name === "guidance_privacy") return stream({ output_text: JSON.stringify({ verdict: "safe" }) });
   if (request.tools) {
    assert.doesNotMatch(request.input, /202-555|Alex Example|Private caregiving/);
    if (id.endsWith("-discover")) return stream(web({ candidates: [{ target: 0, url: official }] }, [official]));
    return stream(web({ identities: [{ target: 0, officialUrl: official, identityEvidenceUrl: proof, status: "verified", evidence: "The consulted first-party about page identifies the requested authority or credential issuer." }], findings: selected.questions.map(question => ({ target: 0, question, fact: credential ? "In this synthetic retrieved fixture, experience is recommended rather than a mandatory prerequisite; Fundamentals has no renewal requirement." : "In this synthetic retrieved fixture, contributor consent is required; the correct form year must be selected.", applicability: credential ? "AZ-900 Fundamentals; no other credential version" : "FAFSA public requirements; award year unknown; not personal eligibility", asOf: "2026-10-21 synthetic fixture", url: official })) }, [official, proof]));
   }
   return stream({ output_text: credential ? `For AZ-900 distinguish recommended experience from mandatory qualifications; do not extend another credential's renewal rule. Source: ${official}` : `Prepare questions around your four weekly hours and private constraints; confirm the applicable FAFSA year and contributor consent without assuming eligibility. Source: ${official}` });
  };
  const result = await runDigitalStaffRuntime({ ...base, message: { ...base.message, text: credential ? "What are the official AZ-900 prerequisites and renewal requirements?" : "What are the current FAFSA requirements for Alex Example, phone 202-555-0147?" } });
  assert.equal(calls, 7); assert.equal(result.researchSources.length, 1); assert.deepEqual(result.validationFailures, []);
 }} finally { globalThis.fetch = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test("incomplete nonstream semantic verdict is never accepted as safe", async () => {
 const original = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "sk-proj-SYNTHETIC_GC_FLOW_ONLY_123456789"; let calls = 0;
 globalThis.fetch = async () => { calls++; return Response.json({ status: "incomplete", output_text: JSON.stringify({ verdict: "safe", categories: [] }) }); };
 try { const result = await runDigitalStaffRuntime(base); assert.equal(calls, 1); assert.ok(result.validationFailures.length > 0); assert.equal(result.researchSources.length, 0); }
 finally { globalThis.fetch = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});
