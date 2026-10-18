// Offline preparation only. No provider transport, credential or API-key environment access.
import { readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { directorCapabilities } from '../.test-dist/src/lib/directorAssignments.js';
import { directorReasoningSchema } from '../.test-dist/src/lib/directorReasoning.js';
import { dryRunFocusedScenario,clock,owner } from './director-focused-fixtures.mjs';
export const focusedBounds=Object.freeze({model:'gpt-6.1-sol',effort:'high',maxCalls:16,maxUsd:5.25,maxBodyBytes:20000,inputTokens:65536,outputTokens:2400,perCallReservationUsd:.318912,totalReservationUsd:5.102592});
export const focusedInstructions='You are Avery Stone, a Director assisting the authenticated member with the supplied objective. Use the supplied evidence and registered capabilities. Propose actions and assess results in the required JSON format. New work requires member approval. Existing authorization is limited to its current scope and owner. Your text does not itself execute a tool or complete a task.';
const stripDescriptions=value=>Array.isArray(value)?value.map(stripDescriptions):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='description').map(([key,v])=>[key,stripDescriptions(v)])):value;
export const focusedSchema=stripDescriptions(directorReasoningSchema);
export const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export function focusedInput(scenario,{state,history=[],memberMessage=null}={}){
 if(history.length>2)throw Error('More history than reviewed turn budget');
 const checkpoints=state?state.rows.map(t=>({id:t.id,capability:t.capability,status:t.status,dependencies:t.dependencies,attempts:t.attempts,leaseUntil:t.lease_until,result:t.result?{asOf:t.result.asOf,limitations:t.result.limitations,output:t.result.output,sourceSnapshot:JSON.parse(t.result.snapshot)}:null,blocker:t.blocker})):[];
 return {clock:state?.clock||clock,authenticatedOwner:owner,goal:{id:scenario.id,title:scenario.objective,updated_at:clock},availableCapabilities:state?.availableCapabilities||Object.keys(directorCapabilities),capabilityRegistry:directorCapabilities,checkpoints,sourceExcerpts:scenario.evidence,mechanicalLimits:{maxAttemptsPerCorrectionCycle:3,foregroundExecution:true},memberMessage,history:history.map(h=>({visiblePriorResponse:String(h).slice(0,1200)}))};
}
export function focusedRequest(input){
 const body={model:focusedBounds.model,reasoning:{effort:'high'},store:false,service_tier:'default',max_output_tokens:2400,instructions:focusedInstructions,input:JSON.stringify(input),text:{format:{type:'json_schema',name:'director_objective_plan',strict:true,schema:focusedSchema}}};
 if(Buffer.byteLength(JSON.stringify(body),'utf8')>focusedBounds.maxBodyBytes)throw Error('Focused payload exceeds conservative body bound');return body;
}
export function reserveFocusedProposal(ledger,request,scenarioId,turn,scenarios){
 // Proposal-only arithmetic, not an authorization or paid execution path.
 const scenario=scenarios.find(s=>s.id===scenarioId);
 if(!scenario||!Number.isInteger(turn)||turn<1||turn>scenario.turns)throw Error('Unreviewed scenario/turn');
 const allowedKeys=['model','reasoning','store','service_tier','max_output_tokens','instructions','input','text'];
 if(Object.keys(request).some(k=>!allowedKeys.includes(k))||request.model!=='gpt-6.1-sol'||request.reasoning?.effort!=='high'||Object.keys(request.reasoning).length!==1||request.store!==false||request.service_tier!=='default'||request.max_output_tokens!==2400||typeof request.input!=='string'||request.text?.format?.type!=='json_schema'||request.text.format.strict!==true||request.text.format.name!=='director_objective_plan'||request.instructions!==focusedInstructions||hash(request.text?.format?.schema)!==hash(focusedSchema))throw Error('Unbudgeted focused request');
 if(Buffer.byteLength(JSON.stringify(request))>20000)throw Error('Focused payload exceeds bound');
 if(!Array.isArray(ledger.attempts)||!Number.isFinite(ledger.reservedUsd)||Math.abs(ledger.reservedUsd-ledger.attempts.length*.318912)>1e-7)throw Error('Focused ledger invalid');
 if(ledger.attempts.length>=16||ledger.reservedUsd+.318912>5.25||ledger.attempts.some(a=>a.scenarioId===scenarioId&&a.turn===turn))throw Error('Focused call/dollar/case cap');
 ledger.attempts.push({scenarioId,turn,reservedUsd:.318912});ledger.reservedUsd=Number((ledger.reservedUsd+.318912).toFixed(8));
}
export async function prepareFocused(){
 const scenarios=JSON.parse(readFileSync('tests/fixtures/avery-focused/scenarios.json','utf8'));
 if(scenarios.length!==6||new Set(scenarios.map(s=>s.id)).size!==6||scenarios.reduce((n,s)=>n+s.turns,0)!==16)throw Error('Focused matrix differs from reviewed proposal');
 const root=mkdtempSync(join(tmpdir(),'avery-focused-prepare-'));
 try{
  const cases=[];
  for(const scenario of scenarios){
   const rehearsal=await dryRunFocusedScenario(scenario,join(root,scenario.id+'.json'));
   const initial=scenario.id==='folio-41'?focusedInput(scenario,{state:rehearsal.initial}):focusedInput(scenario);
   const inputs=[initial,focusedInput(scenario,{state:rehearsal.afterFirst,history:['[Prior original response retained separately; bounded history inserted only after actual model output]'],memberMessage:scenario.memberMessages['2']})];
   if(scenario.turns===3)inputs.push(focusedInput(scenario,{state:rehearsal.afterSecond,history:['[Original first response]','[Original second response]'],memberMessage:scenario.memberMessages['3']}));
   // Reviewer-only protocols/rubrics are never inserted into the model payload.
   // Actual follow-ups require current gated tool evidence, not reference trace substitution.
   const requests=inputs.map(focusedRequest);
   cases.push({...scenario,initialModelInput:initial,referencePostResultModelInputs:inputs.slice(1),initialRequestSha256:hash(requests[0]),rehearsalInputSizes:requests.map(r=>Buffer.byteLength(JSON.stringify(r))),dryRunEvidence:rehearsal,modelResponses:null,semanticGrades:null});
  }
  return {status:'PREPARATION ONLY; no paid approval; independent pre-run novelty/fairness review pending',paidCalls:0,credentialAccess:false,bounds:focusedBounds,requiredInitialAndPostResultCalls:12,additionalThirdTurnSlots:4,maximumCalls:16,worstCaseReservedUsd:5.102592,proposedMaxUsd:5.25,model:focusedBounds.model,effort:'high',assessmentPromptSha256:hash(focusedInstructions),assessmentSchemaSha256:hash(focusedSchema),scenarioSha256:hash(scenarios),instructions:focusedInstructions,responseSchema:focusedSchema,productionPromptChanged:false,checkpointGuidanceIncluded:false,cases,limitations:'Rehearsals are independent actual deterministic synthetic execution only, not model-generated decisions or proof of competence. Future follow-up results must be recomputed from actual permitted model decisions, never substituted from these reference success traces. This assessment-only generic prompt is intentionally different from the prescriptive production prompt; scores will not certify the production prompt automatically.'};
 }finally{rmSync(root,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const plan=await prepareFocused();mkdirSync('docs/avery-focused-review',{recursive:true});
 writeFileSync('docs/avery-director-focused-plan.json',JSON.stringify(plan,null,2)+'\n');
 for(const c of plan.cases)writeFileSync('docs/avery-focused-review/'+c.id+'.json',JSON.stringify({purpose:'Independent pre-run novelty/fairness and acceptance-rubric review, not an executed model result',commonInstructions:plan.instructions,responseSchema:plan.responseSchema,assessmentPromptSha256:plan.assessmentPromptSha256,scenarioSha256:plan.scenarioSha256,...c},null,2)+'\n');
 const template={status:'NOT RUN; no paid approval',instructions:plan.instructions,responseSchema:plan.responseSchema,identityDisclosure:'Candidate X only; reviewer necessarily knows this is a single-candidate Sol assessment. No stronger claim of model-identity blinding.',cases:plan.cases.map(c=>({id:c.id,candidate:'Candidate X',initialModelInput:c.initialModelInput,rubric:c.rubric,turns:Array.from({length:c.turns},(_,i)=>({turn:i+1,originalResponseText:null,actualToolEvidence:null,grade:null}))}))};
 writeFileSync('docs/avery-director-focused-blinded-template.json',JSON.stringify(template,null,2)+'\n');
 console.log(JSON.stringify({objectives:6,requiredCalls:12,maxCalls:16,maxReservedUsd:5.102592,proposedCapUsd:5.25,paidCalls:0,maxRehearsalRequestBytes:Math.max(...plan.cases.flatMap(c=>c.rehearsalInputSizes))}));
}
