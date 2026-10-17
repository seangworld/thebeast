// One paid request maximum per invocation; never run automatically/CI.
import { readFileSync,openSync,closeSync,fstatSync,lstatSync,constants,mkdirSync,existsSync } from 'node:fs';
import { userInfo } from 'node:os';
import { randomInt } from 'node:crypto';
import { bounds,candidates,screeningIds,requestFor,hash } from './director-model-benchmark.mjs';
import { withStageOneLedger,reserveStageOneAttempt,stageOneUsageCost } from './director-evaluation-budget.mjs';
import { directorReasoningInstructions,directorReasoningSchema,validateDirectorReasoning } from '../.test-dist/src/lib/directorReasoning.js';
import { requestOpenAIResponse } from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
import { executeStageOneDecision } from './director-stage-one-execution.mjs';
export function verifiedStageOneCases(){
 const all=JSON.parse(readFileSync('tests/fixtures/director-model-comparison.json','utf8'));
 if(hash(all)!=='0e20d529f0bef217a933adf859376879dd3708ec55442080cd095c39cef8a446'||hash(directorReasoningInstructions)!=='55e31473b4ec1addfaace65585cfcdd4646923da83b81d543f14835aec0c1d9f'||hash(directorReasoningSchema)!=='c4d21982ca409bb5b0281006670ef9dbba451525feea27f8870e4b7580cd5596')throw Error('Independent review frozen scope changed');
 return all.filter(c=>c.split==='screen');
}
export async function dispatchStageOne({ledger,save,configId,scenario,transport,execute,path}){
 const c=candidates.find(c=>c.id===configId),body=requestFor(c,scenario.context);
 const manifest=JSON.parse(readFileSync('docs/avery-director-model-benchmark-plan.json','utf8'));
 if(hash(body)!==manifest.cases.find(s=>s.id===scenario.id)?.requestSha256ByConfig[configId])throw Error('Reviewed request hash mismatch');
 const attempt=reserveStageOneAttempt(ledger,body,configId,scenario.id);attempt.startedAt=new Date().toISOString();save();
 const started=performance.now();
 try{
  const response=await transport(body);
  attempt.responseElapsedMs=performance.now()-started;
  attempt.response={id:response.id,model:response.model,status:response.status,service_tier:response.service_tier,incomplete_details:response.incomplete_details,usage:response.usage,output:response.output?.filter(o=>o.type==='message'),output_text:response.output_text};
  const visible=response.output_text||response.output?.flatMap(o=>o.content||[]).find(o=>o.type==='output_text')?.text;
  attempt.originalResponseText=visible??null;
  attempt.usageDerivedEstimatedUsd=stageOneUsageCost(configId,response.usage);
  attempt.state='failed_with_usage';save();
  if(response.model!==c.model){ledger.halted='Unexpected returned model; no substitution';save();return attempt;}
  if(response.service_tier&&response.service_tier!=='default'){ledger.halted='Unexpected billed service tier';save();return attempt;}
  if(response.status!=='completed'){attempt.failure='Incomplete response; no retry';save();return attempt;}
  if(!visible)throw Error('No visible output/refusal');
  try{attempt.plan=validateDirectorReasoning(JSON.parse(visible),scenario.context);}catch(e){attempt.validationFeedback=String(e.message).slice(0,400);save();return attempt;}
  attempt.execution=await execute(scenario.context,attempt.plan,path);
  attempt.state='completed_with_usage';
 }catch(error){
  attempt.failure=error.name==='DigitalStaffServiceError'?'Shared provider failed; unknown usage, no retry':String(error.message).slice(0,300);
  if(!Number.isFinite(attempt.usageDerivedEstimatedUsd)){ledger.halted='Unknown charge/usage; retain full reservation and stop';}
 }finally{attempt.finishedAt=new Date().toISOString();save();}
 return attempt;
}
if(process.argv[1]?.endsWith('/evaluate-director-stage-one.mjs')){
 if(process.argv[2]!=='--next-approved-stage-one')throw Error('Explicit Stage 1 invocation required');
 const cases=verifiedStageOneCases(),root='/private/tmp/avery-stage-one-private';
 mkdirSync(root,{recursive:true,mode:0o700});
 if((lstatSync(root).mode&0o077)||lstatSync(root).isSymbolicLink())throw Error('Private ledger directory unsafe');
 const credential='/Users/seangworld/.config/seangworld/avery-dev.env';let original,prior,fd;
 await withStageOneLedger(root+'/ledger.json',async(ledger,save)=>{
  if(ledger.halted)throw Error('Stage 1 halted; review private ledger, no retry');
  if(!ledger.mapping){const shuffled=[...screeningIds];for(let i=2;i>0;i--){const j=randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}ledger.mapping=Object.fromEntries(shuffled.map((id,i)=>['Candidate '+String.fromCharCode(65+i),id]));ledger.reviewComment=6237368187;ledger.sourceCommit='2e887c6fcfd1711c03e25bc294da8948609af495';save();}
  const schedule=cases.flatMap((scenario,i)=>screeningIds.map((_,j)=>({scenario,configId:screeningIds[(i+j)%3]})));
  const next=schedule.find(p=>!ledger.attempts.some(a=>a.scenario===p.scenario.id&&a.configId===p.configId)&&!ledger.stoppedConfigurations?.includes(p.configId));
  if(!next){console.log(JSON.stringify({stageOneRequestsFinished:true,calls:ledger.attempts.length}));return;}
  try{
   fd=openSync(credential,constants.O_RDONLY|constants.O_NOFOLLOW);prior=fstatSync(fd);
   if(!prior.isFile()||prior.uid!==userInfo().uid||(prior.mode&0o077))throw Error('Owner-only existing development credential required');
   original=readFileSync(fd,'utf8');closeSync(fd);fd=undefined;
   const lines=original.split(/\r?\n/).filter(l=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(l));if(lines.length!==1)throw Error('Exactly one existing credential required');
   const key=lines[0].slice(lines[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
   await dispatchStageOne({ledger,save,...next,transport:body=>requestOpenAIResponse(body,{apiKey:key,fetchImpl:(url,init)=>fetch(url,{...init,redirect:'error'}),signal:AbortSignal.timeout(60000)}),execute:executeStageOneDecision,path:root+'/execution-'+(ledger.attempts.length+1)+'.json'});
  }finally{
   if(fd!==undefined)closeSync(fd);
   const fresh=lstatSync(credential);ledger.credentialPreserved=original!==undefined&&readFileSync(credential,'utf8')===original&&prior.ino===fresh.ino&&prior.mode===fresh.mode&&prior.uid===fresh.uid;
   if(!ledger.credentialPreserved)ledger.halted='Credential preservation check failed';save();
  }
  console.log(JSON.stringify({calls:ledger.attempts.length,withinCallCap:ledger.attempts.length<=24,withinDollarCap:ledger.reservedUsd<=3,credentialPreserved:ledger.credentialPreserved,halted:Boolean(ledger.halted)}));
 });
}
