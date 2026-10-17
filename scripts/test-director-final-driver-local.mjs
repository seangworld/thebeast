// AUTHORED decisions through actual local fixtures. No network model transport; not AI competency.
import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {runFinalAssessment} from './director-final-assessment.mjs';
import {createFinalLocalAdapter} from './director-final-local-adapter.mjs';
import {prepareFinal,sha} from './prepare-director-final.mjs';
const adapters=[],ledger={attempts:[],reservedUsd:0},health='health.preparation-review',money='money.cash-review';
const prior={};for(const key of ['BEAST_DIRECTOR_REASONING_ENABLED','BEAST_DIRECTOR_MODEL_CONFIG','OPENAI_API_KEY'])prior[key]=process.env[key];
process.env.BEAST_DIRECTOR_REASONING_ENABLED='true';process.env.BEAST_DIRECTOR_MODEL_CONFIG='sol-high-v1';process.env.OPENAI_API_KEY='sk-synthetic-no-network-transport';
try{
 await runFinalAssessment({authorization:{approved:true,issueCommentId:9999999999,manifestSha256:sha(prepareFinal()),maxCalls:16,maxUsd:5.50,syntheticTestOnly:true},ledger,save:async()=>{},createAdapter:async id=>{const a=await createFinalLocalAdapter(id);adapters.push(a);return a;},transport:async body=>{
  const context=JSON.parse(body.input),slot=ledger.attempts.at(-1),id=slot.scenarioId,turn=slot.turn;
  const p={contractVersion:2,requirements:[],interpretation:'Authored no-cost driver verification only; not an AI response or life-goal success.',steps:[],alternatives:[],contradictions:[],missingInformation:[],ownerDecisions:[],unsupportedWork:['No external actions'],assessments:[],planningNotes:[],evidenceClaims:[]};
  const add=(cap,dependsOn=[])=>p.steps.push({capability:cap,purpose:'Review own permitted saved records',acceptance:'Independently verified consistency',dependsOn});
  if(turn===1&&id!=='folio-41'){if(['folio-17','folio-55','folio-63'].includes(id))add(health);if(['folio-28','folio-55','folio-63','folio-76'].includes(id))add(money,id==='folio-63'?[health]:[]);}
  if(id==='folio-17'&&turn===2)add(money,[health]);
  for(const task of context.checkpoints){let disposition='investigate';if(task.status==='verified'&&task.result)disposition=id==='folio-28'&&turn===2?'request_correction':'accept_verified_evidence';if(id==='folio-41'&&task.capability===health)disposition=turn===1?'await_active_execution':turn===2?'resume_existing':disposition;p.assessments.push({taskId:task.id,finding:'Authored fixture interpretation; no model judgment measured.',disposition});}
  return{status:'completed',model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:100,output_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}},output_text:JSON.stringify(p)};
 }});
 writeFileSync('/private/tmp/avery-consolidated-driver-private.json',JSON.stringify(ledger,null,2),{mode:0o600});
 assert.equal(ledger.attempts.length,16);assert.equal(ledger.reservedUsd,5.486592);assert.equal(ledger.finished,true);assert.ok(ledger.attempts.every(a=>a.state==='completed_with_usage'),JSON.stringify(ledger.attempts.filter(a=>a.failure).map(a=>({id:a.scenarioId,turn:a.turn,failure:a.failure}))));
 for(const id of ['folio-17','folio-28','folio-41']){const last=ledger.attempts.filter(a=>a.scenarioId===id).at(-1);assert.ok(last.after.assignments.every(t=>t.status==='verified'),id+' actual results must verify');}
 const last=ledger.attempts.filter(a=>a.scenarioId==='folio-63').at(-1);assert.ok(last.after.assignments.some(t=>t.status==='cancelled'));assert.ok(last.after.assignments.some(t=>t.status==='verified'));
 writeFileSync('/private/tmp/avery-consolidated-driver-results.json',JSON.stringify({provenance:'16 AUTHORED MODEL-TRANSPORT ADAPTER RESPONSES; no AI judgments/charges or real owner approval. Synthetic fake approval used only with injected local transport.',paidCalls:0,completedSlots:16,reservationGuardUsd:ledger.reservedUsd,perCase:adapters.length,attempts:ledger.attempts.map(a=>({id:a.scenarioId,turn:a.turn,state:a.state,actualApiExecution:a.execution,finalAssignments:a.after.assignments.map(t=>({id:t.id,capability:t.capability,status:t.status,attempts:t.attempts}))}))},null,2)+'\n');console.log('PASS final driver: 16 authored responses, actual local auth/API/SQL/tools, six cases, no paid model transport.');
}finally{for(const a of adapters)await a.close();for(const key of Object.keys(prior)){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}}
