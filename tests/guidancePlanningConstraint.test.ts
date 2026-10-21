import test from "node:test";
import assert from "node:assert/strict";
import { guidancePlanningConstraint, guidancePlanningState } from "../src/lib/digitalStaffRuntime/guidancePlanning";
import { buildRuntimeInput } from "../src/lib/digitalStaffRuntime/prompt";
import { requireProfessionalConfig } from "../src/lib/digitalStaffRuntime/config";
import { validateRuntimePlan } from "../src/lib/digitalStaffRuntime/runtime";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import type { RuntimeContext, RuntimePlan } from "../src/lib/digitalStaffRuntime/types";
const state = { currentTopic: "career", currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], previousDecisions: [], currentGoal: "Explore IT using 4 weekly hours and a $500 budget." };
const context: RuntimeContext = { professionalId: "beasteducation.guidance-counselor", ownerId: "synthetic", conversationId: "synthetic", message: { id: "new", role: "user", text: "I do not want sales, and I can only spare two hours now.", createdAt: "2026-10-21" }, recentMessages: [], structuredRecords: [{ domain: "education", record: { weekly_hours: 4 } }], memories: [], state, workspace: null };
test("latest planning limit overrides conversational goal hours without inferring weekly capacity or editing saved records", () => {
  const original = structuredClone(context);
  const input = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), context));
  assert.equal(input.currentPlanningConstraint.statement, context.message.text);
  assert.equal(input.currentPlanningConstraint.duration, "not_inferred"); assert.equal(input.currentPlanningConstraint.savedProfileUpdated, false);
  assert.doesNotMatch(input.conversationState.currentGoal, /4 weekly hours/);
  assert.equal(input.structuredRecords[0].record.weekly_hours, 4); assert.deepEqual(context, original);
  const plan: RuntimePlan = { intent: "answer", response: "An authored mock answer; not model proof", nextQuestion: null, state, proposals: [], toolCalls: [], research: null, handoff: null, navigationTarget: null, responseContract: safeMemberAgentResponseContract };
  const result = validateRuntimePlan(context, plan);
  assert.doesNotMatch(result.state.currentGoal!, /4 weekly hours/); assert.match(result.state.currentGoal!, /Explore IT/);
  assert.equal(result.proposals.length, 0); assert.deepEqual(plan.state, state); assert.ok(result.state.corrections.some(x => x.includes(context.message.text)));
});
test("latest genuine user statement wins; assistant text and conditional examples do not become member capacity", () => {
  const history = [{ ...context.message, text: "I have six hours per week.", id: "old" }, { ...context.message, role: "assistant" as const, text: "I have twelve hours per week." }];
  assert.equal(guidancePlanningConstraint({ ...context, recentMessages: history })?.sourceMessageId, "new");
  const conditional = { ...context, message: { ...context.message, text: "Suppose I have eight hours per week." }, recentMessages: [] };
  assert.equal(guidancePlanningConstraint(conditional), null);
  assert.equal(guidancePlanningConstraint({ ...conditional, recentMessages: [history[1]] }), null);
});
test("conversation-only correction survives followup and does not claim an approved persistent profile update", () => {
  const corrected = guidancePlanningState(context, state);
  const followup = { ...context, message: { ...context.message, id: "next", text: "Would a recurring class fit?" }, state: corrected };
  assert.equal(guidancePlanningConstraint(followup)?.statement, context.message.text);
  assert.deepEqual(guidancePlanningState({ ...context, professionalId: "beasthealth.health-advisor" }, state), state);
});
