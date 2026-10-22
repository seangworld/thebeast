// Original GC05 T1/T2, authored transport only. No live model grade.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {GuidanceEvaluationBudget} from './guidance-evaluation-budget.mjs';
import {contextFor} from './guidance-evaluation-dispatch.mjs';
import {runGuidanceEvaluationTurn} from './guidance-evaluation-session.mjs';
const base='docs/guidance-counselor-upgrade/evaluation/';
const packets=JSON.parse(readFileSync(base+'preparation-20261020/scenario-packets-v2.json')).packets.filter(p=>['GC-05-T1','GC-05-T2'].includes(p.id));
const oldManifest=JSON.parse(readFileSync(base+'consolidated-preparation-20261021/dispatch-manifest.json'));
const urls=['https://www.tcc.edu/programs/information-systems-technology/','https://www.vpcc.edu/program/information-systems-technology/'];
const policy={...oldManifest.policy,webAccounting:'processed-actions-conservative-v1',expiresAt:'2099-01-01'};
function response(value,seen=[]){return {status:'completed',model:'gpt-5-2025-08-07',service_tier:'default',usage:{input_tokens:6000,output_tokens:1400,output_tokens_details:{reasoning_tokens:400}},output:[...seen.map((url,i)=>({id:'synthetic-'+i,type:'web_search_call',status:'completed',action:{type:'open_page',url}})),{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:typeof value==='string'?value:JSON.stringify(value)}]}]};}

test('unchanged GC05 T1/T2 reach durable cited plans, preserve actual prior answer/state and stop before a third turn',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gc-native-school-')),file=join(dir,'ledger.json');
 const guard=new GuidanceEvaluationBudget({file,runId:'gc-native-school-test',policy,capNanoUsd:5740000000,maximumAttempts:14,priorAccountedNanoUsd:4251593880,priorLedgerSha256:'a'.repeat(64),turnIds:packets.map(p=>p.id)});
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_NATIVE_SCHOOL_ONLY_123456789';
 const history=[],phases=[];let second=false,outputChecked=false;
 const firstAnswer=`For Spring 2027, compare TCC Virginia Beach Network Administration and VPCC IT AAS, keeping each campus/program distinct. In this synthetic fixture TCC lists resident/nonresident rates $207.10/$452.70 per credit and VPCC $181.70/$398.80; materials/program charges may add costs. These are term-specific published rates, not your residency determination or all-in affordability. Exact prerequisites and application cutoffs remain unverified. With four weekly hours and $500 total, first ask both advisers about one-course part-time options, transfer assessment and fee inclusions before enrollment; don't assume published full-time completion fits your schedule. ${urls.join(' ')}`;
 const secondAnswer=`For corrected Fall 2027, the synthetic Spring 2027 rates cannot be extrapolated. Exact Fall prerequisites, total fees and application dates remain unverified; a tuition payment date is not an application cutoff. Keep the same TCC Virginia Beach Network Administration versus VPCC IT AAS options. With four hours/$500, request Fall fee sheets and entry requirements, compare course availability, then choose a manageable preparation sequence; admission/transfer eligibility is not guaranteed. ${urls.join(' ')}`;
 globalThis.fetch=async(endpoint,init)=>{
  assert.equal(String(endpoint),'https://api.openai.com/v1/responses');const r=JSON.parse(init.body),id=new Headers(init.headers).get('X-Client-Request-Id'),name=r.text?.format?.name;
  assert.equal(JSON.parse(readFileSync(file)).entries.at(-1).status,'reserved');phases.push(id);
  let value,seen=[];
  if(name==='member_agent_semantic_verification'){
   const input=JSON.parse(r.input);if(input.phase==='output'){outputChecked=true;assert.match(input.guidanceResearchEvidence.retrievedEvidence,/source excerpt/);assert.match(JSON.stringify(input.guidanceResearchEvidence.memberContext),/weekly_hours/);}
   value={verdict:'safe',categories:[]};
  }else if(name==='guidance_brief'){
   assert.equal(r.reasoning.effort,'minimal');if(second){assert.match(r.input,/Fall 2027/);assert.ok(r.input.includes(firstAnswer.replaceAll('"','\\"')));}
   value={targets:[{organization:'Tidewater Community College',program:'Information Systems Technology AAS Network Administration',region:'Virginia Beach',intake:second?'Fall 2027':'Spring 2027'},{organization:'Virginia Peninsula Community College',program:'Information Systems Technology AAS',region:'',intake:second?'Fall 2027':'Spring 2027'}],questions:['prerequisites','tuition_and_fees','deadlines']};
  }else if(name==='guidance_privacy')value={verdict:'safe'};
  else if(id.endsWith('-guidance-discover')){assert.doesNotMatch(r.input,/caregiving|weekly_hours|available_budget/);value={candidates:urls.map((url,target)=>({target,url}))};seen=urls;}
  else if(id.endsWith('-guidance-verify')){
   assert.doesNotMatch(r.input,/caregiving|weekly_hours|available_budget/);seen=urls;
   value={identities:urls.map((officialUrl,target)=>({target,organization:target===0?'Tidewater Community College':'Virginia Peninsula Community College',officialUrl,identityEvidenceUrl:officialUrl,status:'verified',evidence:'Synthetic retrieved first-party page identifies the exact requested institution, campus and IT associate program.'})),findings:urls.map((url,target)=>({target,question:'tuition_and_fees',fact:second?'Fall 2027 rates not confirmed; Spring rates are not transferable to that intake.':target===0?'Synthetic Spring 2027 resident/nonresident rates $207.10/$452.70 per credit.':'Synthetic Spring 2027 resident/nonresident rates $181.70/$398.80 per credit.',excerpt:'Synthetic source excerpt: published rates have a specific effective term and residency category.',applicability:second?'Fall 2027 unpublished; no personal residency eligibility':'Spring 2027 only; program/material fees not all included; residency unknown',asOf:'2026-10-21 synthetic fixture',url}))};
  }else{assert.ok(id.endsWith('-synthesis'));assert.match(r.instructions,/practical schooling plan/);assert.match(r.input,/weekly_hours/);value=second?secondAnswer:firstAnswer;}
  const p=response(value,seen);return name==='member_agent_semantic_verification'?Response.json(p):new Response('data: '+JSON.stringify({type:'response.completed',response:p})+'\n\n');
 };
 try{
  for(const packet of packets){second=packet.turn===2;outputChecked=false;const context=contextFor(packet,history);
   if(second){assert.equal(context.recentMessages.at(-1).text,history[0].result.response);assert.deepEqual(context.state,history[0].result.state);}
   const delivered=[];const result=await runGuidanceEvaluationTurn({guard,turnId:packet.id,model:'gpt-5',context,observer:{onResponseDelta:async text=>{assert.ok(outputChecked);assert.equal(JSON.parse(readFileSync(file)).results.at(-1).result.response,text);delivered.push(text);}}});
   assert.equal(delivered.join(''),result.response);assert.equal(result.response,second?secondAnswer:firstAnswer);assert.equal(result.timings.providerInvocationCount,7);assert.equal(result.researchSources.length,2);history.push({packet,result});
  }
  assert.equal(phases.length,14);assert.equal(guard.summary().results.length,2);assert.ok(guard.summary().accountedNanoUsd<5740000000);assert.equal(guard.summary().cumulativeAccountedNanoUsd,4251593880+guard.summary().accountedNanoUsd);assert.throws(()=>guard.startTurn('GC-05-T3'),/Unapproved/);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;rmSync(dir,{recursive:true,force:true});}
});

test('native $5.74 ceiling stops before a next maximum reservation; no unused historical budget is released',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gc-native-cap-'));const guard=new GuidanceEvaluationBudget({file:join(dir,'ledger.json'),runId:'gc-native-cap-test',policy,capNanoUsd:5740000000,maximumAttempts:14,priorAccountedNanoUsd:4251593880,priorLedgerSha256:'a'.repeat(64),turnIds:['GC-05-T1']});
 const body={model:'gpt-5',store:false,input:'Synthetic maximum-cost request only',max_output_tokens:3600,tools:[{type:'web_search'}],max_tool_calls:4};let dispatched=0;
 try{
  guard.startTurn('GC-05-T1');for(let i=0;i<2;i++)await guard.dispatch(body,['GC-05-T1-guidance-discover','GC-05-T1-guidance-verify'][i],async()=>{dispatched++;return {status:'completed',model:'gpt-5-2025-08-07',usage:{input_tokens:2000000,output_tokens:3600},output:[]};});
  await assert.rejects(guard.dispatch(body,'GC-05-T1-synthesis',async()=>{dispatched++;throw Error('transport must not run');}),/Next reservation exceeds cap/);
  assert.equal(dispatched,2);assert.equal(guard.summary().accountedNanoUsd,5152000000);assert.equal(guard.summary().cumulativeAccountedNanoUsd,9403593880);assert.equal(guard.state.capNanoUsd+guard.state.priorAccountedNanoUsd,9991593880);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
