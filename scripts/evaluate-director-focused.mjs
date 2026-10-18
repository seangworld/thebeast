// Explicit, owner-approved synthetic assessment only; never invoked by CI.
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync,existsSync,mkdirSync,lstatSync,fstatSync,constants} from 'node:fs';
import {dirname} from 'node:path';
import {userInfo} from 'node:os';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {focusedInput,focusedRequest,reserveFocusedProposal,focusedInstructions,focusedSchema,hash} from './prepare-director-focused.mjs';
import {createFocusedFixture,health,money} from './director-focused-fixtures.mjs';
import {stageOneUsageCost} from './director-evaluation-budget.mjs';
import {validateDirectorReasoning,approveDirectorReasoning} from '../.test-dist/src/lib/directorReasoning.js';
import {requestOpenAIResponse,createOpenAIRequestHeaders} from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
export const authorizationId=6241324460;
export function frozenScenarios(){
 const s=JSON.parse(readFileSync('tests/fixtures/avery-focused/scenarios.json','utf8'));
 if(hash(s)!=='f54eb51238ac5c67be07dccb59f23c3a41f6fedb1df8ada3c8feba57b62b2a73'||hash(focusedInstructions)!=='4659bd66461595ce3b896755a581b418d311629eb52c14fd7866f6a7e7f435b8'||hash(focusedSchema)!=='f0971551cd9557667acad2bdb55c15250b9c121f82d5df43f22fd9029ec5e180')throw Error('Frozen independent review hash mismatch');return s;
}
export async function withFocusedLedger(path,action){
 const fd=openSync(path+'.lock','wx',0o600);let ledger;
 const save=()=>{const temp=path+'.'+randomUUID()+'.tmp',out=openSync(temp,'wx',0o600);try{writeFileSync(out,JSON.stringify(ledger,null,2)+'\n');fsyncSync(out);}finally{closeSync(out);}renameSync(temp,path);const d=openSync(dirname(path),'r');try{fsyncSync(d);}finally{closeSync(d);}};
 try{
  ledger=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{authorizationId,maxCalls:16,maxUsd:5.25,reservedUsd:0,attempts:[]};
  if(ledger.authorizationId!==authorizationId||ledger.maxCalls!==16||ledger.maxUsd!==5.25||ledger.attempts.length>16||ledger.reservedUsd>5.25||Math.abs(ledger.reservedUsd-ledger.attempts.length*.318912)>1e-7)throw Error('Focused ledger integrity failure');
  if(ledger.attempts.length){
   const expected=frozenScenarios().flatMap(s=>Array.from({length:s.turns},(_,i)=>s.id+'|'+(i+1)));
   for(const [i,a] of ledger.attempts.entries()){if(expected[i]!==a.scenarioId+'|'+a.turn||a.rawResponse?.model!=='gpt-6.1-sol'||a.rawResponse?.service_tier!=='default'||!['completed_with_usage','failed_with_usage'].includes(a.state)||a.usageDerivedEstimatedUsd!==stageOneUsageCost('gpt-6.1-sol:high',a.rawResponse.usage))throw Error('Ambiguous prior charge or non-prefix schedule; no resume');}
   const last=ledger.attempts.at(-1);
   if(ledger.finished||last.scenarioId!=='folio-41'||last.turn!==2||last.rawResponse.status!=='incomplete'||last.rawResponse.incomplete_details?.reason!=='max_output_tokens')throw Error('Assessment already started; only reconciled output-cap continuation is allowed');
   delete ledger.halted;ledger.reconciledContinuation={reason:'Known usage for incomplete output-cap response; no retry, no slot reuse',afterAttempt:ledger.attempts.length};
  }
  save();return await action(ledger,save);
 }finally{closeSync(fd);unlinkSync(path+'.lock');}
}
// Production validator uses Date.now for lease metadata. Control it synchronously
// during validation only, matching the exact reviewed clock passed to the runner.
export function atClock(clock,fn){const original=Date.now;try{Date.now=()=>Date.parse(clock);return fn();}finally{Date.now=original;}}
export function validateFocused(value,input){return atClock(input.clock,()=>validateDirectorReasoning(value,input));}
export async function executeFocusedDecision(f,scenario,turn,plan,input){
 const events=[],before=f.evidence();let refusal=null,approval=null;
 try{
  if(plan.steps.length){
   atClock(input.clock,()=>approveDirectorReasoning(plan,input,input));
   // Owner's conditional authorization cannot be encoded by scheduling alone.
   if(scenario.id==='folio-17'&&turn===1&&plan.steps.some(s=>s.capability!==health))throw Error('Conditional cash work withheld until actual care evidence and a later approved decision');
   if(scenario.id==='folio-17'&&turn===2){const care=before.rows.find(t=>t.capability===health);if(care?.status!=='verified'||!care.result?.snapshot.includes('Transport paperwork has not yet been arranged.'))throw Error('Conditional branch unavailable: no preceding verified care evidence');}
   if(scenario.id==='folio-63'&&turn>1)throw Error('Current owner cancellation forbids remaining cash work');
   f.approve(plan);approval='Explicit synthetic member approval of these validated proposed steps only';
  }
  if(scenario.id==='folio-55'&&turn===1)f.deny(money);
  const blocked=plan.ownerDecisions.length||plan.contradictions.length||plan.missingInformation.length;
  if(plan.steps.length){
   // One care execution before the owner cancellation, no hidden cash execution.
   const max=scenario.id==='folio-63'?1:plan.steps.length;
   for(let n=0;n<max;n++){const out=await f.step();events.push(out);if(out.state!=='verified')break;}
  }else if(scenario.id==='folio-41'&&turn===1){
   // Only a correct active-lease wait decision permits the prescribed later recovery.
   if(plan.assessments.some(a=>a.taskId==='care-row'&&a.disposition==='await_active_execution')&&!blocked){events.push(await f.step());f.setClock('2026-10-17T18:01:30.000Z');events.push(await f.step());}
   else refusal='No valid active-lease/dependency decision; reference recovery not substituted';
  }else if(plan.assessments.some(a=>a.disposition==='resume_existing')){
   if(blocked)throw Error('Model supplied execution blockers; no resume');
   if(scenario.id==='folio-63'&&turn>1)throw Error('Owner cancellation forbids remaining work');
   events.push(await f.step());
  }
 }catch(e){refusal=e.message;}
 // Permission withdrawal is an independent owner event, even if approval was blocked.
 if(scenario.id==='folio-55'&&turn===1)f.deny(money);
 // Predefined independent owner events cannot fabricate preceding task success.
 if(scenario.id==='folio-63'&&turn===1){f.deny(money);events.push({state:'owner_cancelled_remaining_work',requestVersion:'v2',oldQueuedVersion:'v1',cashWithheld:true});}
 if(scenario.id==='folio-28'&&turn===2){
  f.setPay(2800);events.push({state:'explicit_synthetic_owner_source_update',monthlyIncome:2800});
  const prior=before.rows.find(t=>t.capability===money);
  if(prior?.status==='verified'&&plan.assessments.some(a=>a.taskId===prior.id&&a.disposition==='request_correction')&&!plan.steps.length){events.push(await f.step());events.push(await f.step());}
  else events.push({state:'correction_not_executed',reason:'No preceding verified checkpoint and validated model correction decision; no reference rescue'});
 }
 if(['folio-17','folio-41'].includes(scenario.id)&&turn===2&&f.evidence().rows.length===2&&f.evidence().rows.every(t=>t.status==='verified'))events.push(await f.step());
 return {approval,refusal,before,events,after:f.evidence(),elapsedMs:0,scope:'Synthetic saved-record execution only; no external task or production data',decisionGeneratedByModel:true,toolEvidenceGeneratedByDeterministicRunner:true};
}
export async function runFocused({root,ledger,save,transport}){
 const scenarios=frozenScenarios();ledger.reviewComment=6239722752;ledger.sourceCommit='85547ea5673318294c82071dd7367b0ef79046e4';save();
 for(const scenario of scenarios){
  const recorded=ledger.attempts.filter(a=>a.scenarioId===scenario.id);if(recorded.length===scenario.turns)continue;
  const previous=recorded.at(-1),lastExecuted=[...recorded].reverse().find(a=>a.execution?.after);
  const resumeState=recorded.length?(lastExecuted?.execution.after||null):null;
  if(recorded.length&&!resumeState)throw Error('No preserved actual state for continuation');
  const f=createFocusedFixture(root+'/'+scenario.id+'.json',scenario,{live:true,resumeState});let priorEvidence=previous?.execution|| (previous?{events:[],refusal:'Prior response incomplete; no tool execution',validationFeedback:null}:null);const history=recorded.map(a=>a.originalResponseText||'[No completed visible response]');
  for(let turn=1;turn<=scenario.turns;turn++){
   if(ledger.halted)return;
   if(ledger.attempts.some(a=>a.scenarioId===scenario.id&&a.turn===turn))continue;
   const input=focusedInput(scenario,{state:turn===1&&scenario.id!=='folio-41'?undefined:f.evidence(),history:history.slice(-2),memberMessage:scenario.memberMessages[String(turn)]||null});
   // Exact actual feedback is distinct from member-provided nominal follow-up text.
   if(priorEvidence)input.actualPriorExecution={events:priorEvidence.events,refusal:priorEvidence.refusal,validationFeedback:priorEvidence.validationFeedback||null};
   const body=focusedRequest(input);if(turn===1){const reviewed=JSON.parse(readFileSync('docs/avery-director-focused-plan.json','utf8')).cases.find(c=>c.id===scenario.id);if(hash(body)!==reviewed.initialRequestSha256)throw Error('Frozen initial request mismatch');}reserveFocusedProposal(ledger,body,scenario.id,turn,scenarios);const a=ledger.attempts.at(-1);
   Object.assign(a,{state:'reserved_before_request',startedAt:new Date().toISOString(),request:body,input,requestSha256:hash(body),historyTruncated:history.slice(-2).map(s=>s.length>1200)});save();const start=performance.now();
   try{
    const response=await transport(body);a.responseElapsedMs=performance.now()-start;a.rawResponse=response;
    a.originalResponseText=response.output_text||response.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')||null;
    a.usageDerivedEstimatedUsd=stageOneUsageCost('gpt-6.1-sol:high',response.usage);a.state='failed_with_usage';save();
    if(response.model!=='gpt-6.1-sol'||(response.service_tier&&response.service_tier!=='default'))throw Error('Returned model/tier mismatch; halt');
    if(response.status!=='completed'||!a.originalResponseText){a.failure='Incomplete or refused response; no retry';a.execution={refusal:'No execution: incomplete or refused provider response',events:[],after:f.evidence()};}else{
    try{a.plan=validateFocused(JSON.parse(a.originalResponseText),input);}catch(e){a.validationFeedback=e.message;}
    if(a.plan){const execStart=performance.now();a.execution=await executeFocusedDecision(f,scenario,turn,a.plan,input);a.execution.elapsedMs=performance.now()-execStart;a.state='completed_with_usage';}
    else a.execution={refusal:'No tool execution: invalid model decision',validationFeedback:a.validationFeedback,events:[],after:f.evidence()};
    }
   }catch(e){a.failure=e.name==='DigitalStaffServiceError'?'Provider failure; unknown usage; no retry':String(e.message).slice(0,250);ledger.halted='Uncertain or incomplete provider outcome; retain reservation and stop';}
   finally{a.finishedAt=new Date().toISOString();save();}
   history.push(a.originalResponseText||'[No completed visible response]');priorEvidence=a.execution;
   console.log(JSON.stringify({scenario:scenario.id,turn,calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,validated:!!a.plan,halted:!!ledger.halted}));
  }
 }
 ledger.finished=true;save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]!=='--approved-6241324460')throw Error('Explicit focused authorization required');
 frozenScenarios();const root='/private/tmp/avery-focused-approved-6241324460';mkdirSync(root,{recursive:true,mode:0o700});
 if(lstatSync(root).isSymbolicLink()||(lstatSync(root).mode&0o077))throw Error('Unsafe private evidence directory');
 await withFocusedLedger(root+'/ledger.json',async(ledger,save)=>{
  const credential='/Users/seangworld/.config/seangworld/avery-dev.env';let original,prior,fd;
  try{
   fd=openSync(credential,constants.O_RDONLY|constants.O_NOFOLLOW);prior=fstatSync(fd);if(!prior.isFile()||prior.uid!==userInfo().uid||(prior.mode&0o077))throw Error('Unsafe existing credential');original=readFileSync(fd,'utf8');closeSync(fd);fd=undefined;
   const lines=original.split(/\r?\n/).filter(l=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(l));if(lines.length!==1)throw Error('Exactly one secure development credential required');
   const key=lines[0].slice(lines[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
   const preflight=await fetch('https://api.openai.com/v1/models/gpt-6.1-sol',{headers:createOpenAIRequestHeaders(randomUUID(),key),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!preflight.ok)throw Error('Free model metadata preflight failed; no inference');const metadata=await preflight.json();if(metadata.id!=='gpt-6.1-sol')throw Error('Model metadata mismatch');ledger.preflight={modelId:metadata.id,status:preflight.status,paidCalls:0};save();
   await runFocused({root,ledger,save,transport:body=>requestOpenAIResponse(body,{apiKey:key,fetchImpl:(url,init)=>fetch(url,{...init,redirect:'error'}),signal:AbortSignal.timeout(60000)})});
  }finally{
   if(fd!==undefined)closeSync(fd);const fresh=lstatSync(credential);ledger.credentialPreserved=original!==undefined&&readFileSync(credential,'utf8')===original&&prior.ino===fresh.ino&&prior.mode===fresh.mode&&prior.uid===fresh.uid;if(!ledger.credentialPreserved)ledger.halted='Credential preservation check failed';save();
  }
  console.log(JSON.stringify({finished:ledger.finished||false,calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,estimatedUsd:ledger.attempts.reduce((n,a)=>n+(a.usageDerivedEstimatedUsd??a.reservedUsd),0),credentialPreserved:ledger.credentialPreserved,halted:ledger.halted||null}));
 });
}
