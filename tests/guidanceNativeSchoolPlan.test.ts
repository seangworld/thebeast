import test from "node:test";
import assert from "node:assert/strict";
import { runDigitalStaffRuntime, requiresDeterministicResearch } from "../src/lib/digitalStaffRuntime/runtime";
import { parseGuidanceBrief } from "../src/lib/digitalStaffRuntime/guidanceDiscovery";
import { guidanceResearchUnavailable } from "../src/lib/digitalStaffRuntime/guidanceResearch";
import type { RuntimeContext } from "../src/lib/digitalStaffRuntime/types";
const state = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };
const ctx: RuntimeContext = { ownerId: "synthetic-native-school-plan", professionalId: "beasteducation.guidance-counselor", conversationId: "synthetic-school-plan", requestId: "synthetic-school-plan", message: { id: "goal", role: "user", text: "Find suitable information technology associate programs near Virginia Beach, preferably online or evenings. Make a practical schooling plan using my saved constraints.", createdAt: "2026-10-21" }, recentMessages: [], memories: [], structuredRecords: [{ domain: "education", record: { weekly_hours: 4, available_budget_total: 500, constraints: "Private caregiving", name: "Alex Example", phone: "202-555-0147", address: "123 Example Lane" } }], workspace: null, state };
const urls = ["https://unfamiliar-one.edu/program", "https://unfamiliar-two.edu/program"];
const brief = { targets: [{ organization: "", program: "Information technology associate degree online or evening", region: "Virginia Beach", intake: "" }], questions: ["admissions", "tuition_and_fees"] };
function payload(value: unknown, seen: string[] = []) {
 return { status: "completed", model: "gpt-5-2025-08-07", usage: { input_tokens: 2000, output_tokens: 900 }, output: [...seen.map((url, i) => ({ id: "synthetic-" + i, type: "web_search_call", status: "completed", action: { type: "open_page", url } })), { type: "message", status: "completed", content: [{ type: "output_text", text: typeof value === "string" ? value : JSON.stringify(value) }] }] };
}
const stream = (p: unknown) => new Response("data: " + JSON.stringify({ type: "response.completed", response: p }) + "\n\n");

test("goal/location school requests route to native research without names, catalog, URLs or current-date wording", () => {
 for (const text of [ctx.message.text, "I live near Virginia Beach and want you to find schools for an IT career.", "Recommend college programs that fit my goals.", "Create a schooling plan with suitable training options."]) assert.equal(requiresDeterministicResearch({ ...ctx, message: { ...ctx.message, text } }), true);
 for (const text of ["I live in Virginia Beach.", "Read my saved education profile.", "Compare my saved programs.", "Draft a truthful application statement."]) assert.equal(requiresDeterministicResearch({ ...ctx, message: { ...ctx.message, text } }), false);
 assert.ok(parseGuidanceBrief(brief)); // Empty organization is intentional discovery, not an invalid selected school.
});

test("unknown goal targets reach native discovery, official verification and a private cited practical plan; privacy and grounding remain gates", async () => {
 const original = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "sk-proj-SYNTHETIC_NATIVE_PLAN_ONLY_123456789";
 try { for (const mode of ["good", "unsafe-privacy", "unsafe-grounding"]) {
  const phases: string[] = [], delivered: string[] = []; let finalChecked = false;
  globalThis.fetch = async (endpoint, init) => {
   assert.equal(String(endpoint), "https://api.openai.com/v1/responses"); // No separate vendor or direct member/source requests.
   const r = JSON.parse(String(init?.body)), name = r.text?.format?.name, id = new Headers(init?.headers).get("X-Client-Request-Id") || "";
   if (name === "member_agent_semantic_verification") {
    const p = JSON.parse(r.input); phases.push(p.phase);
    if (p.phase === "output") { finalChecked = true; assert.equal(delivered.length, 0);
     if (mode !== "unsafe-privacy") { assert.match(p.guidanceResearchEvidence.retrievedEvidence, /source excerpt/); assert.match(JSON.stringify(p.guidanceResearchEvidence.memberContext), /Private caregiving/); }
    }
    return Response.json(payload({ verdict: mode === "unsafe-grounding" && p.phase === "output" ? "unsafe" : "safe", categories: mode === "unsafe-grounding" && p.phase === "output" ? ["other_boundary_violation"] : [] }));
   }
   assert.notEqual(name, "digital_staff_runtime_plan");
   if (name === "guidance_brief") { phases.push("brief"); assert.match(r.instructions, /leave organization empty/); return stream(payload(brief)); }
   if (name === "guidance_privacy") { phases.push("privacy"); assert.match(r.instructions, /coarse study area/); return stream(payload({ verdict: mode === "unsafe-privacy" ? "unsafe" : "safe" })); }
   if (r.tools) {
    assert.doesNotMatch(r.input, /Alex Example|202-555|123 Example Lane|500|caregiving|weekly_hours/);
    assert.equal(r.tools[0].type, "web_search"); assert.equal(r.max_tool_calls, 4);
    if (id.endsWith("-discover")) { phases.push("discover"); assert.match(r.instructions, /independently discover/); assert.ok(!r.tools[0].filters); return stream(payload({ candidates: urls.map(url => ({ target: 0, url })) }, urls)); }
    phases.push("verify");
    assert.ok(r.tools[0].filters.allowed_domains.includes("unfamiliar-one.edu")); assert.ok(r.tools[0].filters.allowed_domains.includes("unfamiliar-two.edu"));
    return stream(payload({ identities: urls.map((officialUrl, i) => ({ target: 0, organization: `Unfamiliar College ${i + 1}`, officialUrl, identityEvidenceUrl: officialUrl, status: "verified", evidence: "Synthetic first-party program page identifies this institution and the exact IT associate degree." })), findings: urls.flatMap((url, i) => [{ target: 0, question: "admissions", fact: `Unfamiliar College ${i + 1} lists an IT associate program; current evening seat availability unverified.`, excerpt: "Synthetic source excerpt: Information technology associate program.", applicability: "Program identity only; no individual admission decision or transfer-credit guarantee", asOf: "synthetic 2026-10-21", url }, { target: 0, question: "tuition_and_fees", fact: "Resident and nonresident rates differ; next intake fees not confirmed.", excerpt: "Synthetic source excerpt: Rates depend on residency and effective term.", applicability: "Residency unknown; fee total and intake unverified", asOf: "synthetic 2026-10-21", url }]) }, urls));
   }
   phases.push("synthesis"); assert.match(r.instructions, /practical schooling plan/); assert.match(r.input, /weekly_hours/); assert.match(r.input, /500/); assert.match(r.input, /Private caregiving/);
   return stream(payload(`Compare Unfamiliar College 1 and 2 IT associate programs near your requested Virginia Beach study area. Evening/online availability and next-intake costs need confirmation; no eligibility or transfer guarantee. With four weekly hours and a $500 total budget, start with one short advising enquiry and transcript preparation, then compare verified residency-specific costs and prerequisites before committing to a course. Ask each school about evening delivery and a manageable part-time sequence; published full-time duration is not your timeline. Sources: ${urls.join(" ")}`));
  };
  const result = await runDigitalStaffRuntime(ctx, { onResponseDelta: async text => { assert.ok(finalChecked); delivered.push(text); } });
  assert.equal(delivered.join(""), result.response); assert.equal(result.proposals.length, 0); assert.equal(result.toolCalls.length, 0);
  if (mode === "good") { assert.equal(result.timings.providerInvocationCount, 7); assert.deepEqual(phases, ["input", "brief", "privacy", "discover", "verify", "synthesis", "output"]); assert.match(result.response, /four weekly hours/); assert.match(result.response, /\$500/); assert.equal(result.researchSources.length, 2); assert.match(result.researchSources[0].title, /Unfamiliar College/); }
  else if (mode === "unsafe-privacy") { assert.ok(!phases.includes("discover")); assert.equal(result.response, guidanceResearchUnavailable); }
  else { assert.doesNotMatch(result.response, /Compare Unfamiliar College/); assert.ok(result.validationFailures.includes("other_boundary_violation")); }
 }} finally { globalThis.fetch = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});
