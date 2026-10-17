import test from "node:test";
import assert from "node:assert/strict";
import { approveDirectorReasoning, validateDirectorReasoning, type DirectorReasonedPlan, type DirectorReasoningContext } from "../src/lib/directorReasoning";
import { requireSupabasePublicConfiguration, resolveSupabasePublicConfiguration } from "../src/lib/supabase/config";
const context: DirectorReasoningContext = { goal: { id: "goal", title: "Organize care preparation and the saved cash position before relocating", updated_at: "2026-10-17" }, availableCapabilities: ["health.preparation-review", "money.cash-review"], checkpoints: [] };
function plan(): DirectorReasonedPlan { return { interpretation: "Review records before comparing relocation options; the move remains uncompleted.", steps: [{ capability: "health.preparation-review", purpose: "Prepare existing care records", acceptance: "Verify current preparation output" }, { capability: "money.cash-review", purpose: "Check saved cash", acceptance: "Recompute canonical saved-record calculation" }], alternatives: ["Delay relocation pending missing external estimates"], contradictions: [], missingInformation: [], ownerDecisions: [], unsupportedWork: ["No moving service can be booked through these capabilities."], assessments: [] }; }
test("untrusted reasoning becomes a bounded executable plan only after explicit approval", () => {
  const proposed = validateDirectorReasoning(plan(), context);
  assert.deepEqual(approveDirectorReasoning(proposed, context, context), ["health.preparation-review", "money.cash-review"]);
});
test("unavailable tools, duplicates and invented specialist assessments cannot pass validation", () => {
  for (const capability of ["publish", "pay", "beasteducation.tutor", "__proto__"]) {
    const bad = plan(); bad.steps[0].capability = capability as never; assert.throws(() => validateDirectorReasoning(bad, context));
  }
  const duplicate = plan(); duplicate.steps[1] = duplicate.steps[0]; assert.throws(() => validateDirectorReasoning(duplicate, context));
  const fabricated = plan(); fabricated.assessments = [{ taskId: "invented", finding: "Completed", disposition: "accept_verified_evidence" }]; assert.throws(() => validateDirectorReasoning(fabricated, context));
});
test("model cannot promote attempted, failed, stale or incomplete work to verified", () => {
  for (const status of ["running", "blocked", "needs_correction", "planned"]) {
    const ctx = { ...context, checkpoints: [{ id: "task", capability: "money.cash-review", status, blocker: "Missing proof", result: null }] };
    const bad = plan(); bad.steps = bad.steps.filter(step => step.capability !== "money.cash-review"); bad.assessments = [{ taskId: "task", finding: "I consider it done", disposition: "accept_verified_evidence" }];
    assert.throws(() => validateDirectorReasoning(bad, ctx), /unverified/);
    bad.assessments[0].disposition = "request_correction";
    assert.equal(validateDirectorReasoning(bad, ctx).assessments[0].disposition, "request_correction");
    assert.throws(() => approveDirectorReasoning(bad, ctx, ctx), /Investigate or correct/);
  }
});
test("contradictions, approval decisions and material missing facts stop execution", () => {
  for (const key of ["contradictions", "ownerDecisions", "missingInformation"] as const) {
    const blocked = plan(); blocked[key] = ["Resolve this before execution"];
    assert.throws(() => approveDirectorReasoning(blocked, context, context), /Resolve/);
  }
});
test("changed goal, permissions and completed-task evidence invalidate stale proposed plans", () => {
  for (const changed of [{ ...context, goal: { ...context.goal, updated_at: "later" } }, { ...context, availableCapabilities: [] }, { ...context, checkpoints: [{ id: "new", capability: "money.cash-review", status: "verified", blocker: null, result: {} }] }]) assert.throws(() => approveDirectorReasoning(plan(), context, changed), /changed/);
});
test("already verified work is assessed instead of being reassigned", () => {
  const ctx = { ...context, checkpoints: [{ id: "done", capability: "money.cash-review", status: "verified", blocker: null, result: {} }] };
  assert.throws(() => validateDirectorReasoning(plan(), ctx), /already verified/);
});
test("extra model instructions cannot become executable fields and empty plans remain blocked", () => {
  const result = validateDirectorReasoning({ ...plan(), approved: true, shell: "deploy production" }, context);
  assert.equal((result as unknown as Record<string, unknown>).shell, undefined);
  const empty = plan(); empty.steps = []; assert.throws(() => approveDirectorReasoning(empty, context, context), /No supported/);
});
test("local Supabase HTTP requires explicit loopback opt-in; remote HTTP stays rejected", () => {
  const key = "synthetic-key-at-least-twenty-characters";
  assert.equal(resolveSupabasePublicConfiguration({ url: "http://127.0.0.1:54321", publicKey: key }).ok, false);
  assert.equal(resolveSupabasePublicConfiguration({ url: "http://127.0.0.1:54321", publicKey: key, allowInsecureLoopback: true }).ok, true);
  for (const url of ["http://10.0.0.1", "http://127.0.0.1.evil.test", "http://remote.test", "http://user:pass@127.0.0.1"]) assert.equal(resolveSupabasePublicConfiguration({ url, publicKey: key, allowInsecureLoopback: true }).ok, false);
});
test("production configuration never opts into plaintext loopback", () => {
  const saved = { mode: process.env.NODE_ENV, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-key-at-least-twenty-characters" });
  try { assert.throws(requireSupabasePublicConfiguration, /not configured/); }
  finally { for (const [name, value] of Object.entries({ NODE_ENV: saved.mode, NEXT_PUBLIC_SUPABASE_URL: saved.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: saved.key })) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } }
});

test("a model correction proposal cannot create replacement work for any existing checkpoint", () => {
  for (const status of ["planned", "running", "blocked", "needs_correction"]) {
    const ctx = { ...context, checkpoints: [{ id: "existing", capability: "money.cash-review", status, blocker: null, result: null }] };
    assert.throws(() => validateDirectorReasoning(plan(), ctx), /replace existing work/);
    const assessment = plan(); assessment.steps = []; assessment.assessments = [{ taskId: "existing", finding: "Reuse the persisted checkpoint under its existing correction or recovery workflow.", disposition: "investigate" }];
    assert.equal(validateDirectorReasoning(assessment, ctx).assessments[0].taskId, "existing");
  }
});
