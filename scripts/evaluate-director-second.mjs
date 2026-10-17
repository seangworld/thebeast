// Owner-approved SECOND batch only. Never invoke from CI or retry the whole script.
import { readFileSync, writeFileSync, openSync, closeSync, fsyncSync, renameSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { secondEvaluationLimits, reserveAttempt, usageCost } from './director-evaluation-budget.mjs';
import { prepareFollowUp } from './director-second-eval-followups.mjs';
import { directorReasoningInstructions, directorReasoningSchema } from '../.test-dist/src/lib/directorReasoning.js';
import { reasonAboutDirectorObjective } from '../.test-dist/src/lib/directorReasoningProvider.js';
import { requestOpenAIResponse } from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
if(process.argv[2]!=='--run-approved-second-batch')throw Error('Explicit approved second-batch argument required');
const credential='/Users/seangworld/.config/seangworld/avery-dev.env';
const stat=lstatSync(credential);if(!stat.isFile()||(stat.mode&0o077))throw Error('Development credential must be an owner-only regular file');
const originalCredential=readFileSync(credential,'utf8');
const entries=originalCredential.split(/\r?\n/).filter(l=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(l));if(entries.length!==1)throw Error('Exactly one development key required');
const key=entries[0].slice(entries[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');if(!/^sk-[A-Za-z0-9_-]{20,}$/.test(key))throw Error('Invalid key format');
const manifest=JSON.parse(readFileSync('docs/avery-director-retest-plan.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
if(manifest.promptSha256!==hash(directorReasoningInstructions)||manifest.schemaSha256!==hash(JSON.stringify(directorReasoningSchema))||manifest.cases.length!==12||manifest.followUps.length!==4||manifest.maxCallsIncludingFailures!==16||manifest.maxUsd!==2)throw Error('Prepared retest differs from reviewed scope');
const destination='docs/avery-director-second-model-results.json';
closeSync(openSync('/private/tmp/avery-director-second-approved-batch.lock','wx',0o600));
closeSync(openSync(destination,'wx',0o600));
const ledger={startedAt:new Date().toISOString(),authorization:{issue:264,calls:16,maxUsd:2},limits:secondEvaluationLimits,modelRequested:'gpt-5',expectedSnapshot:'gpt-5-2025-08-07',reasoningEffort:'low',promptSha256:manifest.promptSha256,schemaSha256:manifest.schemaSha256,holdoutSha256:manifest.holdoutSha256,pricingSource:manifest.pricingSource,ratesPerMillion:{input:1.25,cachedInput:0.125,output:10},reservedUsd:0,usageDerivedEstimatedUsd:0,providerInvoiceVerifiedUsd:null,attempts:[],overallCompetency:'partial-pass',manualReviewRequired:true,credentialHandling:'Read only from owner-specified development file; never printed, copied, committed, changed or deleted',actualSpecialistExecution:[]};
function save(){const fd=openSync(destination+'.tmp','w',0o600);try{writeFileSync(fd,JSON.stringify(ledger,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}renameSync(destination+'.tmp',destination)}
save();
process.env.OPENAI_API_KEY=key;process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL='gpt-5';process.env.BEAST_DIRECTOR_REASONING_ENABLED='true';
let stop=false;
async function evaluate(scenario,context,execution){
 let attempt;
 try{
  const plan=await reasonAboutDirectorObjective('synthetic-second-evaluation-owner',context,undefined,async body=>{
   const request={...body,service_tier:'default'};
   attempt=reserveAttempt(ledger,request,secondEvaluationLimits);Object.assign(attempt,{scenario,context,execution,startedAt:new Date().toISOString()});save();
   const response=await requestOpenAIResponse(request,{apiKey:key,fetchImpl:(url,init)=>fetch(url,{...init,redirect:'error'}),signal:AbortSignal.timeout(60000)});
   attempt.response={id:response.id,model:response.model,status:response.status,incomplete_details:response.incomplete_details,usage:response.usage,output:response.output?.filter(x=>x.type==='message'),output_text:response.output_text};
   try{attempt.usageDerivedEstimatedUsd=usageCost(response.usage)}catch(e){stop=true;save();throw e}
   ledger.usageDerivedEstimatedUsd+=attempt.usageDerivedEstimatedUsd;
   if(response.model!=='gpt-5-2025-08-07'){stop=true;save();throw Error('Unexpected model; stop without substitution')}
   if(response.status!=='completed'){save();throw Error('Incomplete response; no retry')}
   save();return response;
  });
  attempt.plan=plan;attempt.state='response_validated_requires_manual_review';
 }catch(error){
  if(attempt){attempt.state='failed';attempt.failure=error.name==='DigitalStaffServiceError'?'Shared provider request failed; no retry':String(error.message).slice(0,300)}
  else{ledger.preRequestFailure=String(error.message).slice(0,300);stop=true}
  if(!attempt?.response?.usage)stop=true;
 }
 if(attempt)attempt.finishedAt=new Date().toISOString();save();
 console.log(JSON.stringify({scenario,state:attempt?.state,calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,estimatedUsd:ledger.usageDerivedEstimatedUsd}));
 return attempt;
}
try{
 for(const scenario of manifest.cases){if(stop)break;await evaluate(scenario.id,scenario.context)}
 for(const [i,follow]of manifest.followUps.entries()){
  if(stop)break;
  const parent=ledger.attempts.find(a=>a.scenario===follow.scenario);if(!parent){stop=true;break}
  const prepared=await prepareFollowUp(parent,i);ledger.actualSpecialistExecution.push({parent:parent.scenario,...prepared.execution});save();
  await evaluate(follow.scenario+'-followup',prepared.context,prepared.execution);
 }
}finally{
 ledger.finishedAt=new Date().toISOString();ledger.batchComplete=ledger.attempts.length===16;
 ledger.credentialPreserved=readFileSync(credential,'utf8')===originalCredential&&(lstatSync(credential).mode&0o077)===0;
 save();delete process.env.OPENAI_API_KEY;
 console.log(JSON.stringify({batchComplete:ledger.batchComplete,calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,estimatedUsd:ledger.usageDerivedEstimatedUsd,credentialPreserved:ledger.credentialPreserved}));
}
