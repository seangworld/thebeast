// Explicit owner-authorized eight-call batch. No SDK retries, search or tools.
// Never import this script into an application or run it from CI.
import { readFileSync, writeFileSync, openSync, closeSync, fsyncSync, renameSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { limits, reserveAttempt, usageCost } from './director-evaluation-budget.mjs';
import { directorReasoningInstructions, validateDirectorReasoning } from '../.test-dist/src/lib/directorReasoning.js';
import { reasonAboutDirectorObjective } from '../.test-dist/src/lib/directorReasoningProvider.js';
import { requestOpenAIResponse } from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
if (process.argv[2] !== '--run-authorized-eight-case-batch') throw new Error('Explicit authorized batch argument required');
const credential='/private/tmp/avery-director-eval.env';
const stats=statSync(credential);
if(!stats.isFile() || (stats.mode & 0o077))throw new Error('Credential must be an owner-only regular file');
const definitions=readFileSync(credential,'utf8').split(/\r?\n/).filter(line=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(line));
if(definitions.length!==1)throw new Error('Exactly one development key is required');
const key=definitions[0].slice(definitions[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
if(!/^sk-[A-Za-z0-9_-]{20,}$/.test(key))throw new Error('Invalid development credential format');
const destination='docs/avery-director-real-model-results.json';
// Exclusive retained lock prevents accidental second batches or parallel calls.
closeSync(openSync('/private/tmp/avery-director-paid-eight-case-batch.lock','wx',0o600));
const cases=JSON.parse(readFileSync('tests/fixtures/director-competency.json','utf8'));
if(cases.length!==8)throw new Error('Expected the eight established cases');
const ledger={startedAt:new Date().toISOString(),limits,modelRequested:'gpt-5',reasoningEffort:'low',productionPromptSha256:createHash('sha256').update(directorReasoningInstructions).digest('hex'),fixtureSha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),pricingSource:'https://developers.openai.com/api/docs/models/gpt-5',ratesPerMillion:{input:1.25,cachedInput:0.125,output:10},reservedUsd:0,usageDerivedEstimatedUsd:0,providerInvoiceVerifiedUsd:null,attempts:[],overallCompetency:'partial-pass',evidenceType:'actual_OpenAI_responses_with_synthetic_context_not_hosted_execution'};
function save(){const tmp=destination+'.tmp';const fd=openSync(tmp,'w',0o600);try{writeFileSync(fd,JSON.stringify(ledger,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}renameSync(tmp,destination)}
// Fail if a previous batch already left evidence; never silently restart spending.
closeSync(openSync(destination,'wx',0o600));save();
process.env.OPENAI_API_KEY=key;process.env.BEAST_DIRECTOR_REASONING_ENABLED='true';process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL='gpt-5';
let stop=false;
for(const scenario of cases){
 if(stop)break;
 const context={goal:{id:scenario.id,title:scenario.objective,updated_at:'synthetic-current'},availableCapabilities:scenario.available,checkpoints:scenario.tasks};
 let attempt;
 try{
  const plan=await reasonAboutDirectorObjective('synthetic-evaluation-owner',context,undefined,async body=>{
   const request={...body,service_tier:'default'};
   attempt=reserveAttempt(ledger,request);attempt.scenario=scenario.id;attempt.context=context;attempt.startedAt=new Date().toISOString();save();
   // Reservation is persisted BEFORE dispatch; failed/unknown calls are not retried or refunded.
   const response=await requestOpenAIResponse(request,{apiKey:key,fetchImpl:(url,init)=>fetch(url,{...init,redirect:'error'}) ,signal:AbortSignal.timeout(60000)});
   // Retain visible synthetic responses and usage, never opaque reasoning state.
   attempt.response={id:response.id,model:response.model,status:response.status,incomplete_details:response.incomplete_details,usage:response.usage,output:response.output?.filter(item=>item.type==='message'),output_text:response.output_text};
   try { attempt.usageDerivedEstimatedUsd=usageCost(response.usage); }
   catch(error) {stop=true;save();throw error;}
   ledger.usageDerivedEstimatedUsd+=attempt.usageDerivedEstimatedUsd;
   if(!/^gpt-5(?:-2025-08-07)?$/.test(response.model)) {stop=true;save();throw new Error('Unexpected model; stop without retry');}
   if(response.status!=='completed') {save();throw new Error('Incomplete response; scenario fails without retry');}
   save();return response;
  });
  attempt.plan=validateDirectorReasoning(plan,context);attempt.state='response_validated_requires_manual_competency_review';
 }catch(error){
  if(attempt){attempt.state='failed';attempt.failure=error.name==='DigitalStaffServiceError'?'Provider request failed; inspect safe shared diagnostic; no retry':String(error.message).slice(0,300);}
  else {ledger.preRequestFailure=String(error.message).slice(0,300);stop=true;}
  if(!attempt?.response?.usage)stop=true;
 }
 if(attempt)attempt.finishedAt=new Date().toISOString();save();
 console.log(JSON.stringify({scenario:scenario.id,state:attempt?.state||'stopped_before_request',calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,usageDerivedEstimatedUsd:ledger.usageDerivedEstimatedUsd}));
}
ledger.finishedAt=new Date().toISOString();ledger.batchComplete=ledger.attempts.length===8;save();
delete process.env.OPENAI_API_KEY;
console.log(JSON.stringify({batchComplete:ledger.batchComplete,calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,usageDerivedEstimatedUsd:ledger.usageDerivedEstimatedUsd,manualReviewRequired:true}));
