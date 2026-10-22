// Offline only: fetch is replaced before every runtime invocation. No private ledger is opened.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {GuidanceEvaluationBudget,guidanceWebObservations} from './guidance-evaluation-budget.mjs';
import {runGuidanceEvaluationTurn} from './guidance-evaluation-session.mjs';
import {contextFor} from './guidance-evaluation-dispatch.mjs';
const base='docs/guidance-counselor-upgrade/evaluation/';
const recorded=JSON.parse(readFileSync(base+'consolidated-execution-20261021/call-accounting.json'));
const manifest=JSON.parse(readFileSync(base+'consolidated-preparation-20261021/dispatch-manifest.json'));
const fixture=JSON.parse(readFileSync(base+'preparation-20261020/scenario-packets-v2.json'));
const discovery=recorded[3].response;
const policy={...manifest.policy,expiresAt:'2099-01-01'}; // Mock test clock only, no execution authority.
function setup(){const dir=mkdtempSync(join(tmpdir(),'gc-contract-'));return {guard:new GuidanceEvaluationBudget({file:join(dir,'spend.json'),policy,runId:'gc-contract-replay',capNanoUsd:8330000000,maximumAttempts:7,turnIds:['GC-04-T1']}),cleanup:()=>rmSync(dir,{recursive:true,force:true})};}
const source='https://studentaid.gov/h/apply-for-aid/fafsa',proof='https://studentaid.gov/about';
// Authored transport fixtures, not model-generated evidence or competency grades.
function payload(text,urls=[]){return {status:'completed',model:'gpt-5-2025-08-07',service_tier:'default',usage:{input_tokens:1800,output_tokens:600,output_tokens_details:{reasoning_tokens:128}},output:[...urls.map((url,i)=>({id:'synthetic-web-'+i,type:'web_search_call',status:'completed',action:{type:'open_page',url}})),{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:typeof text==='string'?text:JSON.stringify(text)}]}]};}
const answer=`FAFSA requirements depend on the award year and your circumstances; this does not establish your eligibility or award. With two weekly hours and caregiving constraints, prepare the required information in short sessions before submitting anything. Confirm the correct year, contributor consent and required records with Federal Student Aid. ${source}`;
function stagePayload(stage){
 if(stage==='discover')return payload({candidates:[{target:0,url:source}]},[source]);
 if(stage==='verify')return payload({identities:[{target:0,officialUrl:source,identityEvidenceUrl:proof,status:'verified',evidence:'Synthetic first-party about-page fixture names Federal Student Aid as the federal student aid office.'}],findings:[{target:0,question:'funding',fact:'Synthetic fixture: select the applicable FAFSA award year and supply required contributor consent and records; eligibility is conditional.',applicability:'Year not selected; personal eligibility and award unverified.',asOf:'2026-10-21 synthetic fixture',url:source}]},[source,proof]);
 if(stage==='synthesis')return payload(answer);
 return payload({verdict:'safe',categories:[]});
}
test('exact 52b9bbd3 discovery: emitted/completed/search counts remain distinct; lower report cannot settle it',async()=>{
 const x=setup();try{
 assert.deepEqual(guidanceWebObservations(discovery),{emittedItems:5,completedActions:4,completedSearchActions:3,completedPageOpens:1,completedInPageFinds:0,unfinishedItems:1,unsupportedActions:0,reportedBillableSearches:3,billableCountVerified:false});
 x.guard.startTurn('GC-04-T1');await assert.rejects(x.guard.dispatch(recorded[3].request,'GC-04-T1-guidance-discover',async()=>structuredClone(discovery)),/Unverified usage\/model\/tools/);
 const s=x.guard.summary();assert.deepEqual(s.entries[0].response,discovery);assert.equal(s.entries[0].status,'unknown');assert.equal(s.accountedNanoUsd,2576000000);assert.equal(s.entries[0].contractDiagnostic.completedActions,4);assert.throws(()=>x.guard.ready());
 }finally{x.cleanup();}
});
for(const mode of ['recorded-discovery','native-recorded-discovery','good','verify-missing-usage','verify-failed','verify-disconnected','verify-source-failure','verify-forged-proof','synthesis-incomplete','synthesis-missing-usage','synthesis-foreign-citation','safety-missing-usage','safety-unsafe'])test('guarded recorded-private + mocked full research path: '+mode,async()=>{
 const x=setup(),oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_NO_NETWORK_CONTRACT_ONLY_123456789';
 if(mode==='native-recorded-discovery')x.guard.policy.webAccounting='processed-actions-conservative-v1';
 const stages=[],delivered=[];let outputScreenSeen=false;
 globalThis.fetch=async(_url,init)=>{
  assert.equal(String(_url),'https://api.openai.com/v1/responses');
  const request=JSON.parse(init.body),id=new Headers(init.headers).get('X-Client-Request-Id');
  const stage=id.replace('GC-04-T1-','').replace('guidance-','');stages.push(stage);
  assert.equal(x.guard.summary().entries.at(-1).status,'reserved');
  let p;
  if(stages.length<=3)p=structuredClone(recorded[stages.length-1].response);
  else if(stage==='discover'&&['recorded-discovery','native-recorded-discovery'].includes(mode))p=structuredClone(discovery);
  else p=stagePayload(stage);
  if(request.tools)assert.doesNotMatch(request.input,/Alex Example|202-555-0147|123 Example Lane|caregiving|weekly_hours/);
  if(stage==='verify'){
   if(mode==='verify-missing-usage')delete p.usage;
   if(mode==='verify-failed')p={...p,status:'failed',error:{code:'synthetic_failure'}};
   if(mode==='verify-source-failure')p=payload({identities:[],findings:[]});
   if(mode==='verify-forged-proof')p=payload({identities:[{target:0,officialUrl:source,identityEvidenceUrl:'https://lookalike.example/about',status:'verified',evidence:'Synthetic forged identity assertion.'}],findings:[{target:0,question:'funding',fact:'Unsupported',applicability:'unknown',asOf:'unknown',url:source}]},[source,'https://lookalike.example/about']);
  }
  if(stage==='synthesis'){
   assert.match(request.input,/caregiving/);assert.match(request.input,/weekly_hours/);assert.match(request.input,/personal eligibility/);
   if(mode==='synthesis-incomplete')p={...p,status:'incomplete',incomplete_details:{reason:'max_output_tokens'}};
   if(mode==='synthesis-missing-usage')delete p.usage;
   if(mode==='synthesis-foreign-citation')p=payload('Guaranteed aid. https://unverified.example/award');
  }
  if(stage==='semantic-output'){
   outputScreenSeen=true;assert.equal(delivered.length,0);
   if(!['verify-source-failure','verify-forged-proof'].includes(mode))assert.match(request.input,/retrievedEvidence/);
   if(mode==='safety-missing-usage')delete p.usage;
   if(mode==='safety-unsafe')p=payload({verdict:'unsafe',categories:['other_boundary_violation']});
  }
  if(stage==='semantic-input'||stage==='semantic-output')return Response.json(p);
  if(stage==='verify'&&mode==='verify-disconnected')return new Response('data: {"type":"response.output_text.delta","delta":"partial not deliverable"}\n\n');
  return new Response('data: '+JSON.stringify({type:p.status==='completed'?'response.completed':p.status==='failed'?'response.failed':'response.incomplete',response:p})+'\n\n');
 };
 try{
  const run=()=>runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-04-T1',context:contextFor(fixture.packets.find(p=>p.id==='GC-04-T1')),model:'gpt-5',observer:{onResponseDelta:async text=>{assert.ok(outputScreenSeen);assert.equal(x.guard.summary().results.length,1);assert.ok(x.guard.summary().entries.every(e=>e.status==='settled'));delivered.push(text);}}});
  const unknown=['recorded-discovery','verify-missing-usage','verify-failed','verify-disconnected','synthesis-incomplete','synthesis-missing-usage','safety-missing-usage'].includes(mode);
  if(unknown){await assert.rejects(run());const s=x.guard.summary();assert.equal(s.entries.at(-1).status,'unknown');assert.equal(s.results.length,0);assert.equal(delivered.length,0);assert.equal(s.entries.length,mode==='recorded-discovery'?4:mode.startsWith('verify')?5:mode.startsWith('synthesis')?6:7);assert.ok(s.halted);if(mode==='safety-missing-usage'){assert.equal(s.undeliveredResults.length,1);assert.ok(s.undeliveredResults[0].result.response);}}
  else{
   const result=await run();assert.equal(delivered.join(''),result.response);assert.equal(x.guard.summary().results[0].result.response,result.response);assert.ok(x.guard.summary().entries.every(e=>e.status==='settled'));
   if(['good','native-recorded-discovery'].includes(mode)){assert.equal(result.response,answer);assert.equal(stages.length,7);assert.deepEqual(stages,['semantic-input','brief','privacy','discover','verify','synthesis','semantic-output']);assert.equal(result.researchSources[0].url,source);}
   else{assert.notEqual(result.response,answer);if(mode.startsWith('verify'))assert.ok(!stages.includes('synthesis'));}
  }
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;x.cleanup();}
});

test('unknown status, unfinished or unsupported tool actions are rejected even below emitted-item ceiling',async()=>{
 for(const patch of [{status:undefined},{output:[{type:'web_search_call',status:'searching',action:{type:'search'}}]},{output:[{type:'web_search_call',status:'completed',action:{type:'unknown'}}]}]){
  const x=setup();try{x.guard.startTurn('GC-04-T1');await assert.rejects(x.guard.dispatch(recorded[3].request,'GC-04-T1-guidance-discover',async()=>({...payload('synthetic'),...patch})));assert.equal(x.guard.summary().entries[0].status,'unknown');assert.equal(x.guard.summary().accountedNanoUsd,2576000000);}finally{x.cleanup();}
 }
});


test('unpriced multimodal inputs, tool options, provider meters and outputs cannot pass plain-text accounting',async()=>{
 const {guidanceCallBound}=await import('./guidance-evaluation-budget.mjs');
 assert.throws(()=>guidanceCallBound({...recorded[3].request,input:[{type:'input_image',image_url:'synthetic'}]},policy),/text input/);
 assert.throws(()=>guidanceCallBound({...recorded[3].request,tools:[{type:'web_search',return_token_budget:'unlimited'}]},policy),/tool option/);
 for(const patch of [{tool_usage:{image_gen:{total_tokens:1}}},{tool_usage:{unknown_tool:{calls:0}}},{output:[{type:'image_generation_call'}]},{output:[{type:'message',content:[{type:'output_audio'}]}]}]){
  const x=setup();try{x.guard.startTurn('GC-04-T1');await assert.rejects(x.guard.dispatch(recorded[3].request,'GC-04-T1-guidance-discover',async()=>({...payload('synthetic'),...patch})));assert.equal(x.guard.summary().entries[0].status,'unknown');}finally{x.cleanup();}
 }
});

test('new native policy replays exact captured discovery using processed ceiling and ALL search fees; history unchanged',async()=>{
 const x=setup();x.guard.policy.webAccounting='processed-actions-conservative-v1';
 try{
  x.guard.startTurn('GC-04-T1');await x.guard.dispatch(recorded[3].request,'GC-04-T1-guidance-discover',async()=>structuredClone(discovery));
  const e=x.guard.summary().entries[0];assert.equal(e.status,'settled');assert.equal(e.contractDiagnostic.emittedItems,5);assert.equal(e.processedWebContract.completedActions,4);assert.equal(e.processedWebContract.trailingNonterminalAttempts,1);
  assert.equal(e.accountedNanoUsd,18870*1250+2956*10000+4*10000000); // Not the lower reported3.
  assert.equal(e.processedWebContract.unfinishedItemsUsedAsEvidence,false);assert.match(e.accountingBasis,/ALL configured/);
  assert.deepEqual(e.response,discovery);assert.equal(e.processedWebContract.billingCertainty.includes('Not invoice'),true);x.guard.ready();
 }finally{x.cleanup();}
});

test('native policy still rejects real processed excess, missing usage, unfinished work before quota, failed actions, duplicate IDs and meter overflow',async()=>{
 for(const kind of ['processed-excess','missing-usage','below-quota','failed-action','duplicate-id','meter-overflow','wrong-echo','reasoning-only-no-usage']){
  const x=setup();x.guard.policy.webAccounting='processed-actions-conservative-v1';
  try{
   const p=structuredClone(discovery),tools=p.output.filter(x=>x.type==='web_search_call');
   if(kind==='processed-excess')tools.at(-1).status='completed';
   if(kind==='missing-usage'||kind==='reasoning-only-no-usage')delete p.usage;
   if(kind==='below-quota')p.output=p.output.filter(x=>x!==tools[0]);
   if(kind==='failed-action')tools.at(-1).status='failed';
   if(kind==='duplicate-id')tools.at(-1).id=tools[0].id;
   if(kind==='meter-overflow')p.tool_usage.web_search.num_requests=5;
   if(kind==='wrong-echo')p.max_tool_calls=5;
   x.guard.startTurn('GC-04-T1');await assert.rejects(x.guard.dispatch(recorded[3].request,'GC-04-T1-guidance-discover',async()=>p));assert.equal(x.guard.summary().entries[0].status,'unknown');assert.equal(x.guard.summary().accountedNanoUsd,2576000000);assert.throws(()=>x.guard.ready());
  }finally{x.cleanup();}
 }
});

test('accepted native excess-attempt metadata never promotes unfinished source URLs into evidence',async()=>{
 const {guidanceObservedUrls,guidanceCandidates}=await import('../.test-dist/src/lib/digitalStaffRuntime/guidanceDiscovery.js');
 const p=structuredClone(discovery),last=p.output.filter(x=>x.type==='web_search_call').at(-1);
 const unsupported='https://unverified.example.edu/unfinished-source';last.action.url=unsupported;last.action.sources=[{url:unsupported}];
 const seen=guidanceObservedUrls(p);assert.equal(seen.has(unsupported),false);assert.deepEqual(guidanceCandidates({candidates:[{target:0,url:unsupported}]},seen,1),[]);
});
