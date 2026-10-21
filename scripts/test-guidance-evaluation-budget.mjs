import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GuidanceEvaluationBudget,guidanceCallBound} from './guidance-evaluation-budget.mjs';
const policy={expiresAt:'2099-01-01',searchNano:10_000_000,models:{synthetic:{context:1000,inputNano:1000,outputNano:2000,returned:['synthetic']}}};
const body={model:'synthetic',store:false,input:'synthetic only'};
const reply={model:'synthetic',usage:{input_tokens:10,output_tokens:20},output:[]};
test('ninth call in a turn is blocked even when whole-run budget remains',async()=>{
 const x=setup();try{x.guard.startTurn('GC-01-T1');let attempts=0;
 for(let i=0;i<8;i++)await x.guard.dispatch(body,`call-${i}`,async()=>{attempts++;return reply;});
 await assert.rejects(x.guard.dispatch(body,'call-9',async()=>{attempts++;return reply;}),/Attempt ceiling/);
 assert.equal(attempts,8);assert.equal(x.guard.summary().entries.length,8);
 }finally{x.cleanup();}
});
test('an unresolved reservation blocks concurrent dispatch and stays fully accounted',async()=>{
 const x=setup();try{x.guard.startTurn('GC-01-T1');const ticket=x.guard.reserve(body,'pending');
 let attempts=0;await assert.rejects(x.guard.dispatch(body,'parallel',async()=>{attempts++;return reply;}),/unresolved/);
 assert.equal(attempts,0);assert.equal(x.guard.summary().accountedNanoUsd,x.guard.summary().entries[0].maximumNanoUsd);
 ticket.unknown();assert.throws(()=>x.guard.startTurn('GC-01-T2'),/halted/);
 }finally{x.cleanup();}
});
function setup(options={}){const dir=mkdtempSync(join(tmpdir(),'gc-budget-'));const file=join(dir,'ledger.json');const config={file,policy,runId:'gc-test',capNanoUsd:1_000_000_000,turnIds:['GC-01-T1','GC-01-T2'],...options};return {file,config,guard:new GuidanceEvaluationBudget(config),cleanup:()=>rmSync(dir,{recursive:true,force:true})};}
test('reservation persisted before transport; four web calls and explicit output bound',async()=>{const x=setup();try{x.guard.startTurn('GC-01-T1');let calls=0;await x.guard.dispatch({...body,tools:[{type:'web_search'}],max_tool_calls:4},'a',async prepared=>{calls++;assert.equal(JSON.parse(readFileSync(x.file)).entries[0].status,'reserved');assert.equal(prepared.max_output_tokens,4800);return reply;});assert.equal(calls,1);assert.equal(x.guard.summary().entries[0].accountedNanoUsd,40_050_000);}finally{x.cleanup();}});
test('overbudget blocks transport before any paid attempt',async()=>{const x=setup({capNanoUsd:1});try{x.guard.startTurn('GC-01-T1');let calls=0;await assert.rejects(x.guard.dispatch(body,'a',async()=>{calls++;return reply;}),/cap/);assert.equal(calls,0);assert.equal(x.guard.summary().entries.length,0);}finally{x.cleanup();}});
test('uncertain usage retains reservation and halts without retry',async()=>{const x=setup();try{x.guard.startTurn('GC-01-T1');let calls=0;await assert.rejects(x.guard.dispatch(body,'a',async()=>{calls++;return {output:[]};}));const s=x.guard.summary();assert.equal(s.entries[0].status,'unknown');assert.equal(s.accountedNanoUsd,s.entries[0].maximumNanoUsd);await assert.rejects(x.guard.dispatch(body,'b',async()=>{calls++;return reply;}));assert.equal(calls,1);}finally{x.cleanup();}});
test('attempt ceiling, duplicate IDs, duplicate turn and ledger overwrite fail closed',async()=>{for(const limit of [1,88]){const x=setup({maximumAttempts:limit});try{x.guard.startTurn('GC-01-T1');await x.guard.dispatch(body,'a',async()=>reply);assert.throws(()=>new GuidanceEvaluationBudget(x.config),/EEXIST/);x.guard.finishTurn();assert.throws(()=>x.guard.startTurn('GC-01-T1'));x.guard.startTurn('GC-01-T2');await assert.rejects(x.guard.dispatch(body,limit===1?'b':'a',async()=>reply));}finally{x.cleanup();}}});
test('unpriced or unbounded requests rejected; lower output limits preserved',()=>{assert.equal(guidanceCallBound({...body,max_output_tokens:1400},policy).body.max_output_tokens,1400);for(const patch of [{model:'other'},{audio:{}},{previous_response_id:'x'},{service_tier:'priority'},{max_output_tokens:4801},{tools:[{type:'web_search'}],max_tool_calls:5},{tools:[{type:'code_interpreter'}]}])assert.throws(()=>guidanceCallBound({...body,...patch},policy));assert.throws(()=>guidanceCallBound(body,{...policy,expiresAt:'2020-01-01'}));});
test('unexpected provider model and timeout each preserve full charge',async()=>{for(const failure of ['model','timeout']){const x=setup();try{x.guard.startTurn('GC-01-T1');await assert.rejects(x.guard.dispatch(body,'a',async()=>{if(failure==='timeout')throw Error('timeout');return {...reply,model:'unexpected'};}));assert.equal(x.guard.summary().entries[0].status,'unknown');}finally{x.cleanup();}}});
test('compiled GC runtime sends all three ordinary stages through reservations',async()=>{
 const {registerEvaluationReservation}=await import('../.test-dist/src/lib/digitalStaffRuntime/evaluationProviderHook.js');
 const {runDigitalStaffRuntime}=await import('../.test-dist/src/lib/digitalStaffRuntime/runtime.js');
 const {safeMemberAgentResponseContract}=await import('../.test-dist/src/lib/memberAgentResponseSafety.js');
 const x=setup({policy:{...policy,models:{'gpt-5.6-luna':{...policy.models.synthetic,context:1050000,returned:['gpt-5.6-luna']}}},capNanoUsd:10_000_000_000});
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 const state={currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]};
 process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_TEST_ONLY_GC_123456789';
 registerEvaluationReservation((body,id)=>x.guard.reserve(body,id));
 let attempts=0;
 globalThis.fetch=async(_url,init)=>{attempts++;const request=JSON.parse(init.body);assert.equal(request.max_output_tokens,4800);assert.equal(JSON.parse(readFileSync(x.file)).entries.at(-1).status,'reserved');const semantic=request.text?.format?.name==='member_agent_semantic_verification';const payload={...reply,model:'gpt-5.6-luna',output_text:JSON.stringify(semantic?{verdict:'safe',categories:[]}:{intent:'answer',response:'With zero weekly hours available, defer coursework and revisit when your capacity changes.',nextQuestion:null,state,proposals:[],navigationTarget:null,toolCalls:[],research:null,handoff:null,responseContract:safeMemberAgentResponseContract})};return semantic?Response.json(payload):new Response(`data: ${JSON.stringify({type:'response.completed',response:payload})}\n\ndata: [DONE]\n\n`,{headers:{'Content-Type':'text/event-stream'}});};
 try{x.guard.startTurn('GC-01-T1');const result=await runDigitalStaffRuntime({ownerId:'synthetic-gc-evaluation',professionalId:'beasteducation.guidance-counselor',conversationId:'synthetic-gc',message:{id:'test',role:'user',text:'Help me prepare without adding any weekly workload.',createdAt:'2026-10-20'},recentMessages:[],memories:[],structuredRecords:[{domain:'education',record:{weekly_hours:0}}],workspace:null,state},{},{modelOverride:'gpt-5.6-luna'});x.guard.finishTurn();assert.equal(attempts,3);assert.match(result.response,/zero weekly hours/);assert.equal(x.guard.summary().entries.length,3);assert.ok(x.guard.summary().entries.every(e=>e.status==='settled'));}
 finally{registerEvaluationReservation(()=>undefined);globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;x.cleanup();}
});
test('dedicated adapter guards all eight researched stages and retains private-context separation',async()=>{
 const {runGuidanceEvaluationTurn}=await import('./guidance-evaluation-session.mjs');
 const {safeMemberAgentResponseContract}=await import('../.test-dist/src/lib/memberAgentResponseSafety.js');
 const x=setup({policy:{...policy,models:{'gpt-5.6-luna':{...policy.models.synthetic,context:1050000,returned:['gpt-5.6-luna']}}},capNanoUsd:10_000_000_000});
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 const state={currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]};
 const url='https://example.edu/program',proof='https://example.edu/about';
 const brief={targets:[{organization:'Example College',program:'IT',region:'',intake:'Spring 2027'}],questions:['tuition_and_fees']};
 process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_TEST_ONLY_GC_123456789';let attempts=0,publicCalls=0;
 globalThis.fetch=async(_url,init)=>{
  attempts++;const request=JSON.parse(init.body),id=new Headers(init.headers).get('X-Client-Request-Id');
  assert.equal(JSON.parse(readFileSync(x.file)).entries.at(-1).status,'reserved');
  const name=request.text?.format?.name;let value,urls=[];
  if(name==='member_agent_semantic_verification')value={verdict:'safe',categories:[]};
  else if(name==='digital_staff_runtime_plan')value={intent:'answer',response:'Initial answer',nextQuestion:null,state,proposals:[],navigationTarget:null,toolCalls:[],research:{query:'tuition',domains:['example.edu'],reason:'fees'},handoff:null,responseContract:safeMemberAgentResponseContract};
  else if(name==='guidance_brief')value=brief;
  else if(name==='guidance_privacy')value={verdict:'safe'};
  else if(request.tools){publicCalls++;assert.doesNotMatch(JSON.stringify(request),/Alex Example|caregiving/);assert.equal(request.max_tool_calls,4);urls=[url,proof];value=id.endsWith('-discover')?{candidates:[{target:0,url}]}:{identities:[{target:0,officialUrl:url,identityEvidenceUrl:proof,status:'verified',evidence:'Official identity page.'}],findings:[{target:0,question:'tuition_and_fees',fact:'Tuition $100 per credit excluding fees.',applicability:'Spring 2027',asOf:'2026-10-20',url}]};}
  else {assert.match(request.input,/caregiving/);value=`With zero study hours, defer enrollment. Tuition is $100 per credit, excluding fees. Source: ${url}`;}
  const payload={...reply,model:'gpt-5.6-luna',output_text:typeof value==='string'?value:JSON.stringify(value),output:urls.length?[{type:'web_search_call',status:'completed',action:{type:'search',sources:urls.map(url=>({url}))}}]:[]};
  return name==='member_agent_semantic_verification'?Response.json(payload):new Response(`data: ${JSON.stringify({type:'response.completed',response:payload})}\n\ndata: [DONE]\n\n`,{headers:{'Content-Type':'text/event-stream'}});
 };
 try{const result=await runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-01-T1',model:'gpt-5.6-luna',context:{ownerId:'synthetic-gc-evaluation',professionalId:'beasteducation.guidance-counselor',conversationId:'synthetic-gc',message:{id:'test',role:'user',text:'Compare current tuition at Example College for Alex Example.',createdAt:'2026-10-20'},recentMessages:[],memories:[],structuredRecords:[{domain:'education',record:{weekly_hours:0,constraints:'Private caregiving'}}],workspace:null,state}});assert.equal(attempts,8);assert.equal(publicCalls,2);assert.match(result.response,/zero study hours/);assert.ok(x.guard.summary().entries.every(e=>e.status==='settled'));}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;x.cleanup();}
});
