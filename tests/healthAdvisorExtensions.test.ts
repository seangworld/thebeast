import test from "node:test";
import assert from "node:assert/strict";
import { buildRuntimeInput } from "../src/lib/digitalStaffRuntime/prompt";
import { requireProfessionalConfig } from "../src/lib/digitalStaffRuntime/config";
import { requiresDeterministicResearch, validateRuntimePlan } from "../src/lib/digitalStaffRuntime/runtime";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import type { RuntimeContext, RuntimePlan } from "../src/lib/digitalStaffRuntime/types";
const context: RuntimeContext = { ownerId: 'o', professionalId: 'beasthealth.health-advisor', conversationId: 'c', message: { id: 'm', role: 'user', text: 'Review my saved medications for possible interactions.', createdAt: '2026-09-17' }, recentMessages: [], memories: [], structuredRecords: [], workspace: '/dashboard/health/ai-advisor', state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] } };
test('medication interaction reviews require current research without needing a special keyword from the member', () => {
  assert.equal(requiresDeterministicResearch(context), true);
  const plan: RuntimePlan = { intent: 'answer', response: 'Reviewing the evidence.', nextQuestion: null, state: context.state, proposals: [], navigationTarget: null, toolCalls: [], research: { query: 'Example drug interaction FDA label', reason: 'medication review', domains: ['fda.gov'] }, handoff: null, responseContract: safeMemberAgentResponseContract };
  const result = validateRuntimePlan(context, plan);
  assert.equal(result.research?.query, 'Example drug interaction FDA label');
});
test('health input retains an older medication and selected claim beyond the original twenty-record cutoff', () => {
  const records = Array.from({length: 200}, (_,i) => ({domain: 'health',record: {id: i, title: i === 199 ? 'Older medication' : 'Record'}}));
  const input = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), { ...context, structuredRecords: [...records, {domain:'health',record:{contextType:'member_reported_veteran_claim',title:'Selected issue'}}] }));
  assert.equal(input.structuredRecords.length, 201);
  assert.equal(input.structuredRecords[199].record.title, 'Older medication');
  assert.equal(input.structuredRecords[200].record.title, 'Selected issue');
});
test('veterans support has official VA research and no filing tool', () => {
  const config = requireProfessionalConfig(context.professionalId);
  assert.ok(config.researchDomains.includes('va.gov'));
  assert.ok(config.prohibitedActions.includes('file or submit VA claims'));
  assert.equal(config.allowedTools.some(tool => /filing|submit_claim/.test(tool)), false);
});
