import test from "node:test";
import assert from "node:assert/strict";
import { buildRuntimeInput } from "../src/lib/digitalStaffRuntime/prompt";
import { requireProfessionalConfig } from "../src/lib/digitalStaffRuntime/config";
import { requiresDeterministicResearch, validateRuntimePlan } from "../src/lib/digitalStaffRuntime/runtime";
import { safeMemberAgentResponseContract } from "../src/lib/memberAgentResponseSafety";
import { guardUnrequestedVeteransSecondaryTheory } from "../src/lib/digitalStaffRuntime/veteransGrounding";
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
test('health plan rejects unsupported symptom writes independently of prompt compliance',()=>{
 const proposal:RuntimePlan['proposals'][number]={id:'p',domain:'health',entityType:'symptom',fields:{symptomName:'Lightheadedness'},sourceMessageId:'m',confidence:0.99,missingFields:[],contradictions:[],approvalStatus:'proposed',relatedRecordId:null,proposedAction:'create'};
 const plan:RuntimePlan={intent:'answer',response:'Prepare a symptom timeline.',nextQuestion:null,state:context.state,proposals:[proposal],navigationTarget:null,toolCalls:[],research:null,handoff:null,responseContract:safeMemberAgentResponseContract};
 const result=validateRuntimePlan({...context,message:{...context.message,text:'I felt lightheaded twice. Help me prepare for my visit.'}},plan);
 assert.equal(result.proposals.length,0);assert.ok(result.validationFailures.some(x=>x.includes('unsafe structured proposals')));
});
test('health instructions constrain preparation proposals and unsupported secondary theories without editing prior evidence',async()=>{
 const {buildRuntimeInstructions}=await import('../src/lib/digitalStaffRuntime/prompt');
 const instructions=buildRuntimeInstructions(requireProfessionalConfig(context.professionalId));
 assert.match(instructions,/Preparation-only requests.*leave proposals empty/);
 assert.match(instructions,/do not introduce secondary conditions.*unless explicitly established/);
 assert.match(instructions,/Prior assistant suggestions are not evidence/);
 const prior={...context.message,id:'prior',role:'assistant' as const,text:'A secondary altered-gait theory might apply.'};
 const input=JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId),{...context,recentMessages:[prior]}));
 assert.equal(input.recentConversation[0].text,prior.text);
 assert.equal(input.recentConversation[0].role,'assistant');
 assert.doesNotMatch(buildRuntimeInstructions(requireProfessionalConfig('beastmoney.money-coach')),/Preparation-only requests authorize/);
});
test('VA decision review suppresses unrequested secondary theories even when prior assistant text suggested one',()=>{
 const decisionContext:RuntimeContext={...context,message:{...context.message,text:'Using current official VA guidance on service connection requirements, explain how those requirements relate to this fictional decision. Give source links and two practical preparation steps; do not file anything.'},recentMessages:[{id:'prior-user',role:'user',text:'Read the attached fictional VA decision letter and explain its evidence gap.',createdAt:'2026-10-19'},{id:'prior-assistant',role:'assistant',text:'A possible secondary theory might apply.',createdAt:'2026-10-19'}],documents:[{id:'synthetic-letter',title:'Synthetic VA decision letter',content:{type:'input_file',filename:'synthetic-va-decision.pdf'}}]};
 const candidate='The letter shows the direct evidence gap. Possible secondary service connection (if claimed) could also apply if another condition caused or aggravated the knee.';
 const result=guardUnrequestedVeteransSecondaryTheory(decisionContext,candidate);
 assert.equal(result.safe,false);assert.deepEqual(result.failures,['unrequested-secondary-veterans-theory']);
 assert.doesNotMatch(result.response,/secondary|secondarily|aggravat/i);assert.match(result.response,/current condition.*in-service event.*connection/i);
});
test('an earlier user mention of secondary service connection does not authorize it in a later VA decision review',()=>{
 const decisionContext:RuntimeContext={...context,message:{...context.message,text:'Using current official VA guidance, explain how the requirements relate to this decision.'},recentMessages:[{id:'prior-user',role:'user',text:'Could secondary service connection apply to a separate condition?',createdAt:'2026-10-19'},{id:'prior-assistant',role:'assistant',text:'I can explain the letter next.',createdAt:'2026-10-19'}],documents:[{id:'synthetic-letter',title:'Synthetic VA decision letter',content:{type:'input_file',filename:'synthetic-va-decision.pdf'}}]};
 const candidate='The letter shows a direct evidence gap. Secondary service connection might also apply if another condition caused or aggravated the knee.';
 const result=guardUnrequestedVeteransSecondaryTheory(decisionContext,candidate);
 assert.equal(result.safe,false);assert.deepEqual(result.failures,['unrequested-secondary-veterans-theory']);
 assert.doesNotMatch(result.response,/secondary|secondarily|aggravat/i);
});
test('VA secondary-service explanation is allowed when the member explicitly asks for it',()=>{
 const decisionContext:RuntimeContext={...context,message:{...context.message,text:'Explain what secondary service connection means under VA rules.'},documents:[{id:'synthetic-letter',title:'Synthetic VA decision letter',content:{type:'input_file',filename:'synthetic-va-decision.pdf'}}]};
 const candidate='A secondary service-connection claim concerns a new condition linked to one already service-connected.';
 const result=guardUnrequestedVeteransSecondaryTheory(decisionContext,candidate);
 assert.equal(result.safe,true);assert.equal(result.response,candidate);
});
