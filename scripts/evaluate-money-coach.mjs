// Actual existing member runtime, with mandatory pre-dispatch budget admission.
// Default is preparation only. Never invokes CI, changes source finance, or calls Supabase.
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,existsSync,lstatSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {reserveMoneyAttempt,moneyUsageCost} from './money-coach-evaluation-budget.mjs';
if(!process.argv.includes('--execute-paid')){await import('./prepare-money-coach-evaluation.mjs');process.exit(0);}
const arg=name=>{const i=process.argv.indexOf(name);if(i<0||!process.argv[i+1])throw Error(`Missing ${name}`);return resolve(process.argv[i+1]);};
const readPrivate=path=>{const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))throw Error('Owner-only private input required');return readFileSync(path,'utf8');};
const authorization=JSON.parse(readPrivate(arg('--authorization-file')));
if(!authorization.ownerApproved||!authorization.independentNoveltyReviewCompleted)throw Error('Separate owner budget approval and independent novelty review are required');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(authorization.commit!==head)throw Error('Owner-approved commit differs from current source');
execFileSync('git',['diff','--quiet','HEAD','--','src','scripts','tests/fixtures/money-coach-competency.json']);
execFileSync('./node_modules/.bin/tsc',['-p','tsconfig.test.json']);
await import('./prepare-money-coach-evaluation.mjs');
const preflight=JSON.parse(readFileSync('docs/money-coach-upgrade/evaluation/preflight.json'));
for(const key of ['scenarioHash','instructionsHash','schemaHash'])if(authorization[key]!==preflight[key])throw Error('Frozen assessment review hash mismatch');
const packets=JSON.parse(readFileSync('docs/money-coach-upgrade/evaluation/blinded-scenario-packets.json')).packets;
const credential=readPrivate(arg('--credential-file'));const match=credential.match(/^OPENAI_API_KEY=(.+)$/m);if(!match)throw Error('Existing development credential is unavailable');
const originalKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY=match[1].trim().replace(/^['"]|['"]$/g,'');
const directory=arg('--output-directory');if(directory.includes('/.git/')||directory.startsWith(process.cwd()+'/'))throw Error('Evaluation artifacts must remain private outside the repository');
mkdirSync(directory,{recursive:true,mode:0o700});const ds=lstatSync(directory);if((ds.mode&0o077)||ds.uid!==process.getuid())throw Error('Owner-only output directory required');
const ledgerPath=directory+'/ledger-private.json',lockPath=ledgerPath+'.lock',lock=openSync(lockPath,'wx',0o600);
const ledger=existsSync(ledgerPath)?JSON.parse(readPrivate(ledgerPath)):{authorization,commit:head,attempts:[],reservedUsd:0};
// No automatic resume or extra cycle: partial/crashed evaluations require reconciliation and new instructions.
if(ledger.attempts.length){closeSync(lock);throw Error('Assessment already started; no automatic resume, repeat or paid retry cycle');}
const save=()=>{const temp=ledgerPath+'.'+randomUUID()+'.tmp',fd=openSync(temp,'wx',0o600);try{writeFileSync(fd,JSON.stringify(ledger,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd)}renameSync(temp,ledgerPath);const d=openSync(dirname(ledgerPath),'r');try{fsyncSync(d)}finally{closeSync(d)}};
const originalFetch=globalThis.fetch;let fatal=null,current=null;
function responsePayload(raw,contentType){if(contentType.includes('event-stream')){for(const line of raw.split('\n').reverse())if(line.startsWith('data: ')&&line!=='data: [DONE]'){try{const x=JSON.parse(line.slice(6));if(x.response)return x.response}catch{}}return null}try{return JSON.parse(raw)}catch{return null}}
globalThis.fetch=async (url,init)=>{
 if(String(url)!=='https://api.openai.com/v1/responses'||init?.method!=='POST')throw Error('No other endpoint is authorized');
 const body=JSON.parse(init.body);let attempt;try{attempt=reserveMoneyAttempt(ledger,body,authorization)}catch(e){fatal=e;throw e}Object.assign(attempt,{scenarioId:current.scenarioId,turn:current.turn,request:body});save();const started=Date.now();
 try{
  const response=await originalFetch(url,init),raw=await response.clone().text(),payload=responsePayload(raw,response.headers.get('content-type')||'');
  Object.assign(attempt,{latencyMs:Date.now()-started,httpStatus:response.status,originalProviderResponse:raw,actualModel:payload?.model??null,usage:payload?.usage??null});
  attempt.estimatedUsd=moneyUsageCost(payload?.usage);if(attempt.estimatedUsd>attempt.reservedUsd||payload?.model!=='gpt-5.6-luna'||payload?.service_tier!=='default')throw Error('Unexpected billed model, tier or usage');
  attempt.state=response.ok?'completed_with_usage':'failed_with_usage';save();return response;
 }catch(e){attempt.state='ambiguous_or_failed_attempt';attempt.latencyMs=Date.now()-started;attempt.failure='Provider request failed or usage/configuration could not be reconciled';fatal=e;save();throw e}
};
try{
 save();const {runDigitalStaffRuntime}=await import('../.test-dist/src/lib/digitalStaffRuntime/runtime.js');let history=[],state=null,lastScenario=null;const outcomes=[];
 for(const prepared of packets){current=prepared;if(prepared.scenarioId!==lastScenario){history=prepared.context.recentMessages;state=prepared.context.state;lastScenario=prepared.scenarioId}
  const context={...prepared.context,recentMessages:history,state,requestId:'money-eval-'+randomUUID()},start=Date.now(),first=ledger.attempts.length;let result=null,failure=null;
  try{result=await runDigitalStaffRuntime(context,{}, {modelOverride:'gpt-5.6-luna'})}catch(e){failure='Runtime did not complete; see preserved private provider evidence'}
  if(fatal)throw fatal;
  const attempts=ledger.attempts.slice(first),planAttempt=attempts.find(a=>a.request.text?.format?.name==='digital_staff_runtime_plan');const payload=planAttempt?responsePayload(planAttempt.originalProviderResponse,'event-stream'):null;
  const originalModelOutput=payload?.output_text||payload?.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||null;
  const blinded={candidate:'Candidate A',scenarioId:prepared.scenarioId,turn:prepared.turn,scenario:prepared.scenario,relevantEvidence:context,expectedResponsibilities:prepared.expectedResponsibilities,executionEvidence:prepared.executionEvidence,originalModelOutput,memberVisibleResponse:result?.response??null,deterministicToolResults:{validationFailures:result?.validationFailures??[],financialAnalysis:result?.financialAnalysis??null},failure,independentGrade:null};
  // Remove runtime-only correlation/deadline fields; never edit the original model output string.
  delete blinded.relevantEvidence.requestId;delete blinded.relevantEvidence.signal;
  writeFileSync(directory+'/'+prepared.scenarioId+'-'+prepared.turn+'-blinded.json',JSON.stringify(blinded,null,2)+'\n',{flag:'wx',mode:0o600});
  outcomes.push({scenarioId:prepared.scenarioId,turn:prepared.turn,latencyMs:Date.now()-start,attempts:attempts.length,completed:Boolean(result),independentGrade:null});
  if(result){history=[...history,context.message,{id:randomUUID(),role:'assistant',text:result.response,createdAt:new Date().toISOString()}];state=result.state}
  else if(prepared.turn<packets.filter(p=>p.scenarioId===prepared.scenarioId).length)throw Error('No actual earlier response/state exists for the required follow-up; stop instead of inventing continuity');
 }
 ledger.finished=true;ledger.outcomes=outcomes;ledger.totalEstimatedUsd=ledger.attempts.reduce((n,a)=>n+(a.estimatedUsd||0),0);save();console.log('Assessment complete; original provider evidence and blinded packets preserved privately. Independent grading pending.');
}finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;closeSync(lock);unlinkSync(lockPath)}
