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
test('delivered results and returned state are persisted before turn completion',async()=>{
 const x=setup();try{x.guard.startTurn('GC-01-T1');await x.guard.dispatch(body,'a',async()=>reply);
 const result={response:'Delivered answer',state:{corrections:['two hours']},researchSources:[],validationFailures:[]};
 x.guard.finishTurn(result);result.response='Changed outside ledger';
 const saved=JSON.parse(readFileSync(x.file));assert.equal(saved.results[0].turnId,'GC-01-T1');assert.equal(saved.results[0].result.response,'Delivered answer');assert.deepEqual(saved.results[0].result.state.corrections,['two hours']);
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
test('dedicated adapter guards seven research-first stages and retains private-context separation',async()=>{
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
  if(attempts===1)await assert.rejects(runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-01-T2',context:{},model:'gpt-5.6-luna'}),/already active/);
  assert.equal(JSON.parse(readFileSync(x.file)).entries.at(-1).status,'reserved');
  const name=request.text?.format?.name;let value,urls=[];
  if(name==='member_agent_semantic_verification')value={verdict:'safe',categories:[]};
  else if(name==='digital_staff_runtime_plan')assert.fail('mandatory research must not draft an initial answer');
  else if(name==='guidance_brief')value=brief;
  else if(name==='guidance_privacy')value={verdict:'safe'};
  else if(request.tools){publicCalls++;assert.doesNotMatch(JSON.stringify(request),/Alex Example|caregiving/);assert.equal(request.max_tool_calls,4);urls=[url,proof];value=id.endsWith('-discover')?{candidates:[{target:0,url}]}:{identities:[{target:0,officialUrl:url,identityEvidenceUrl:proof,status:'verified',evidence:'Official identity page.'}],findings:[{target:0,question:'tuition_and_fees',fact:'Tuition $100 per credit excluding fees.',applicability:'Spring 2027',asOf:'2026-10-20',url}]};}
  else {assert.match(request.input,/caregiving/);value=`With zero study hours, defer enrollment. Tuition is $100 per credit, excluding fees. Source: ${url}`;}
  const payload={...reply,model:'gpt-5.6-luna',output_text:typeof value==='string'?value:JSON.stringify(value),output:urls.length?[{type:'web_search_call',status:'completed',action:{type:'search',sources:urls.map(url=>({url}))}}]:[]};
  return name==='member_agent_semantic_verification'?Response.json(payload):new Response(`data: ${JSON.stringify({type:'response.completed',response:payload})}\n\ndata: [DONE]\n\n`,{headers:{'Content-Type':'text/event-stream'}});
 };
 try{const result=await runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-01-T1',model:'gpt-5.6-luna',context:{ownerId:'synthetic-gc-evaluation',professionalId:'beasteducation.guidance-counselor',conversationId:'synthetic-gc',message:{id:'test',role:'user',text:'Compare current tuition at Example College for Alex Example.',createdAt:'2026-10-20'},recentMessages:[],memories:[],structuredRecords:[{domain:'education',record:{weekly_hours:0,constraints:'Private caregiving'}}],workspace:null,state}});assert.equal(attempts,7);assert.equal(publicCalls,2);assert.match(result.response,/zero study hours/);assert.ok(x.guard.summary().entries.every(e=>e.status==='settled'));}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;x.cleanup();}
});
test('unknown usage preserves the original response and measured latency',async()=>{
 const x=setup();try{x.guard.startTurn('GC-01-T1');const payload={model:'synthetic',output:[],output_text:'Unsettled original answer'};
 await assert.rejects(x.guard.dispatch(body,'missing-usage',async()=>payload));
 const e=JSON.parse(readFileSync(x.file)).entries[0];assert.deepEqual(e.response,payload);assert.equal(e.status,'unknown');assert.ok(e.latencyMs>=0);
 }finally{x.cleanup();}
});
test('default effort is pinned Medium; explicit Minimal/Low and lower ceilings survive',()=>{
 assert.equal(guidanceCallBound({...body,reasoning:{effort:'minimal'},max_output_tokens:1400},policy).body.reasoning.effort,'minimal');
 assert.equal(guidanceCallBound(body,policy).body.reasoning.effort,'medium');
 assert.equal(guidanceCallBound({...body,reasoning:{effort:'low'}},policy).body.reasoning.effort,'low');
 assert.throws(()=>guidanceCallBound({...body,reasoning:{effort:'unknown'}},policy));
});
test('followups require genuine answers/state; exact private owner approval is mandatory',async()=>{
 const {contextFor,verifyApproval,sha}=await import('./guidance-evaluation-dispatch.mjs');
 const {writeFileSync,chmodSync}=await import('node:fs');const x=setup();
 try{
 const p={id:'GC-01-T2',scenarioId:'GC-01',turn:2,prompt:'Only two hours',syntheticRecord:{weekly_hours:4},seedHistory:[]};
 assert.throws(()=>contextFor(p,[]),/preceding/);
 const context=contextFor(p,[{packet:{id:'GC-01-T1',prompt:'Original question',seedHistory:[]},result:{response:'Actual previous reply',state:{corrections:['actual returned state']}}}]);
 assert.equal(context.recentMessages[1].text,'Actual previous reply');assert.deepEqual(context.state.corrections,['actual returned state']);
 const file=x.file+'.approval';const m={capNanoUsd:10_000_000_000,maximumInferenceAttempts:88,runId:'gc-test'},digest=sha('frozen manifest');
 writeFileSync(file,JSON.stringify({owner:'Sean',approved:false,manifestSha256:digest,...m}),{mode:0o600});assert.throws(()=>verifyApproval(file,digest,m),/approval/);
 writeFileSync(file,JSON.stringify({owner:'Sean',approved:true,manifestSha256:digest,...m}));assert.ok(verifyApproval(file,digest,m));assert.throws(()=>verifyApproval(file,sha('changed'),m),/approval/);
 chmodSync(file,0o644);assert.throws(()=>verifyApproval(file,digest,m),/Private/);
 }finally{x.cleanup();}
});
test('whole-run cap stops before the third transport after earlier calls settle',async()=>{
 const x=setup({capNanoUsd:10_650_000});try{x.guard.startTurn('GC-01-T1');let calls=0;
 for(let i=0;i<2;i++)await x.guard.dispatch(body,'paid-'+i,async()=>{calls++;return reply;});
 await assert.rejects(x.guard.dispatch(body,'blocked',async()=>{calls++;return reply;}),/exceeds cap/);
 assert.equal(calls,2);assert.equal(x.guard.summary().entries.length,2);assert.equal(x.guard.summary().accountedNanoUsd,100_000);
 }finally{x.cleanup();}
});
test('actual provider adapter diagnoses completed/incomplete/failed/disconnected streams; uncertain usage never reduces reservation',async()=>{
 const {requestOpenAIResponseStream}=await import('../.test-dist/src/lib/digitalStaffRuntime/provider.js');
 const {registerEvaluationReservation}=await import('../.test-dist/src/lib/digitalStaffRuntime/evaluationProviderHook.js');
 for(const kind of ['completed','incomplete','failed','error','disconnect','completed-missing-usage']){
  const x=setup();try{
   x.guard.startTurn('GC-01-T1');registerEvaluationReservation((body,id)=>x.guard.reserve(body,id));let attempts=0;
   const response={...reply,status:kind==='completed'||kind==='completed-missing-usage'?'completed':kind};
   if(kind==='completed-missing-usage')delete response.usage;
   const data=kind==='disconnect'?{type:'response.created',response:reply}:kind==='error'?{type:'error',code:'synthetic_error',message:'private diagnostic message',usage:reply.usage}:{type:'response.'+(kind==='completed-missing-usage'?'completed':kind),response};
   let pulled=false;
   const fetchImpl=async()=>{attempts++;return new Response(new ReadableStream({pull(c){if(!pulled){pulled=true;c.enqueue(new TextEncoder().encode('data: '+JSON.stringify(data)+'\n\n'));}else if(kind==='disconnect')c.error(new Error('synthetic disconnect'));else c.close();}}),{headers:{'x-request-id':'synthetic-provider-reference'}});};
   const call=requestOpenAIResponseStream(body,{requestId:'adapter-'+kind,apiKey:'sk-proj-SYNTHETIC_TEST_ONLY_GC_DIAGNOSTICS',fetchImpl});
   if(kind==='completed')await call;else await assert.rejects(call);
   const e=JSON.parse(readFileSync(x.file)).entries[0];assert.equal(attempts,1);assert.equal(e.streamDiagnostic.providerRequestId,'synthetic-provider-reference');
   if(kind==='completed')assert.equal(e.status,'settled');
   else{assert.equal(e.status,'unknown');assert.equal(x.guard.summary().accountedNanoUsd,e.maximumNanoUsd);assert.throws(()=>x.guard.startTurn('GC-01-T2'));}
   if(kind!=='completed-missing-usage')assert.deepEqual(e.streamDiagnostic.reportedUsage,reply.usage);
   if(kind==='incomplete'||kind==='failed')assert.deepEqual(JSON.parse(e.streamDiagnostic.terminalJson).response.usage,reply.usage);
  }finally{registerEvaluationReservation(()=>undefined);x.cleanup();}
 }
});
test('a separate proposed run accounts for the prior halted balance without releasing its unknown reservation',async()=>{
 assert.throws(()=>setup({capNanoUsd:9_440_000_000,priorAccountedNanoUsd:565_628_670,priorLedgerSha256:'a'.repeat(64)}),/Cumulative/);
 const x=setup({capNanoUsd:9_430_000_000,priorAccountedNanoUsd:565_628_670,priorLedgerSha256:'a'.repeat(64)});
 try{x.guard.startTurn('GC-01-T1');await x.guard.dispatch(body,'new-only',async()=>reply);assert.equal(x.guard.summary().cumulativeAccountedNanoUsd,565_678_670);assert.equal(x.guard.summary().priorAccountedNanoUsd,565_628_670);}finally{x.cleanup();}
});
test('future metadata requests are recorded once and failure stops before inference without retry',async()=>{
 const {verifyModelMetadata}=await import('./guidance-evaluation-dispatch.mjs');
 for(const failed of [false,true]){const x=setup();try{let count=0;
 const call=verifyModelMetadata(x.guard,{turnModels:{a:'synthetic-one',b:'synthetic-two'},metadataAttempts:2},async url=>{assert.match(url,/^https:\/\/api.openai.com\/v1\/models\//);count++;if(failed)throw Error('synthetic metadata failure');return new Response('{}');});
 if(failed)await assert.rejects(call);else await call;
 assert.equal(count,failed?1:2);assert.equal(x.guard.summary().entries.length,0);assert.equal(x.guard.state.metadataReceipt.attempts.length,count);
 if(failed)assert.ok(x.guard.state.halted);
 }finally{x.cleanup();}}
});


test('mandatory research brief with missing usage halts the real adapter before privacy, search or synthesis',async()=>{
 const {runGuidanceEvaluationTurn}=await import('./guidance-evaluation-session.mjs');
 const x=setup({turnIds:['GC-04-T1','GC-04-T2'],policy:{...policy,models:{'gpt-5.6-luna':{...policy.models.synthetic,context:1050000,returned:['gpt-5.6-luna']}}},capNanoUsd:10_000_000_000});
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY;const stages=[];
 process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_TEST_ONLY_GC_123456789';
 globalThis.fetch=async(_url,init)=>{
  const request=JSON.parse(init.body),name=request.text?.format?.name;stages.push(name);
  if(name==='member_agent_semantic_verification')return Response.json({...reply,model:'gpt-5.6-luna',output_text:JSON.stringify({verdict:'safe',categories:[]})});
  assert.equal(name,'guidance_brief');
  return new Response('data: '+JSON.stringify({type:'response.completed',response:{model:'gpt-5.6-luna',output_text:'{"targets":[],"questions":[]}'}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
 };
 try{
  const context={ownerId:'synthetic-gc-evaluation',professionalId:'beasteducation.guidance-counselor',conversationId:'synthetic-gc',message:{id:'test',role:'user',text:'What are the current FAFSA requirements?',createdAt:'2026-10-21'},recentMessages:[],memories:[],structuredRecords:[],workspace:null,state:{currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]}};
  await assert.rejects(runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-04-T1',model:'gpt-5.6-luna',context}));
  assert.deepEqual(stages,['member_agent_semantic_verification','guidance_brief']);
  const entries=x.guard.summary().entries;assert.equal(entries.length,2);assert.equal(entries[0].status,'settled');assert.equal(entries[1].status,'unknown');assert.ok(x.guard.summary().accountedNanoUsd>=entries[1].maximumNanoUsd);
  assert.throws(()=>x.guard.startTurn('GC-04-T2'));
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;x.cleanup();}
});

test('actual $3 policy stops before next four-tool reservation and retains both prior balances',async()=>{
 const real={expiresAt:'2099-01-01',searchNano:10000000,models:{'gpt-5':{context:400000,inputNano:1250,outputNano:10000,returned:['gpt-5','gpt-5-2025-08-07']}}};
 const x=setup({policy:real,capNanoUsd:3000000000,maximumAttempts:7,priorAccountedNanoUsd:1124180130,priorLedgerSha256:'a'.repeat(64)});
 try{
  x.guard.startTurn('GC-01-T1');let transports=0;
  await x.guard.dispatch({model:'gpt-5',store:false,max_output_tokens:4800},'first',async()=>{transports++;return {model:'gpt-5',usage:{input_tokens:400000,output_tokens:4800},output:[]};});
  const request={model:'gpt-5',store:false,max_output_tokens:3600,tools:[{type:'web_search'}],max_tool_calls:4};
  assert.equal(guidanceCallBound(request,real).maximumNanoUsd,2576000000);
  await assert.rejects(x.guard.dispatch(request,'cannot-fit',async()=>{transports++;return reply;}),/Next reservation exceeds cap/);
  assert.equal(transports,1);assert.equal(x.guard.summary().entries.length,1);assert.equal(x.guard.summary().cumulativeAccountedNanoUsd,1672180130);
  assert.equal(x.guard.state.priorAccountedNanoUsd+x.guard.state.capNanoUsd,4124180130);
 }finally{x.cleanup();}
});

test('two prior halted receipts are checked read-only; tampering, duplicates and wrong totals fail closed',async()=>{
 const {verifyPriorAccounting,sha}=await import('./guidance-evaluation-dispatch.mjs');
 const {mkdirSync,writeFileSync}=await import('node:fs');
 const root=mkdtempSync(join(tmpdir(),'gc-parent-check-'));
 try{
  const receipts=[];
  for(const [runId,known,unknown] of [['gc-first',51628670,514000000],['gc-second',10551460,548000000]]){
   const dir=join(root,runId);mkdirSync(dir,{mode:0o700});const file=join(dir,'spend.json');
   const bytes=JSON.stringify({halted:'uncertain',entries:[{status:'settled',accountedNanoUsd:known},{status:'unknown',maximumNanoUsd:unknown}]});writeFileSync(file,bytes,{mode:0o600});
   receipts.push({runId,ledgerSha256:sha(bytes),accountedNanoUsd:known+unknown});
  }
  const m={capNanoUsd:3000000000,maximumCumulativeAccountedNanoUsd:4124180130,priorAccounting:{receipts,accountedNanoUsd:1124180130,ledgerSha256:sha(JSON.stringify(receipts))}};
  assert.equal(verifyPriorAccounting(m,root),1124180130);
  assert.throws(()=>verifyPriorAccounting({...m,priorAccounting:{...m.priorAccounting,accountedNanoUsd:0}},root));
  assert.throws(()=>verifyPriorAccounting({...m,priorAccounting:{...m.priorAccounting,receipts:[receipts[0],receipts[0]]}},root));
  writeFileSync(join(root,'gc-second','spend.json'),'{}',{mode:0o600});assert.throws(()=>verifyPriorAccounting(m,root));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('single-turn seven-attempt ceiling blocks an eighth transport even with budget remaining',async()=>{
 const x=setup({maximumAttempts:7});try{
  x.guard.startTurn('GC-01-T1');let calls=0;
  for(let i=0;i<7;i++)await x.guard.dispatch(body,'single-'+i,async()=>{calls++;return reply;});
  await assert.rejects(x.guard.dispatch(body,'eighth',async()=>{calls++;return reply;}),/Attempt ceiling/);
  assert.equal(calls,7);assert.equal(x.guard.summary().entries.length,7);
 }finally{x.cleanup();}
});

test('private probe stops after actual runtime privacy review; no public or later transport can run',async()=>{
 const {runGuidanceEvaluationTurn}=await import('./guidance-evaluation-session.mjs');
 const {contextFor}=await import('./guidance-evaluation-dispatch.mjs');
 const fixture=JSON.parse(readFileSync('docs/guidance-counselor-upgrade/evaluation/preparation-20261020/scenario-packets-v2.json'));
 const context=contextFor(fixture.packets.find(p=>p.id==='GC-04-T1'));
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY,env=process.env.NODE_ENV;
 process.env.OPENAI_API_KEY='sk-proj-SYNTHETIC_TEST_ONLY_GC_123456789';process.env.NODE_ENV='development';
 try{for(const mode of ['safe','unsafe','uncertain','invalid-brief','incomplete','missing-usage']){
  const p={...policy,allowWebSearch:false,allowedRequestSuffixes:['-semantic-input','-guidance-brief','-guidance-privacy'],models:{'gpt-5':{context:400000,inputNano:1250,outputNano:10000,returned:['gpt-5','gpt-5-2025-08-07']}}};
  const x=setup({policy:p,capNanoUsd:1580000000,maximumAttempts:3,turnIds:['GC-04-T1'],priorAccountedNanoUsd:1640700130,priorLedgerSha256:'a'.repeat(64)});const stages=[],efforts=[];
  try{
   globalThis.fetch=async(_url,init)=>{
    const request=JSON.parse(init.body),name=request.text?.format?.name;stages.push(name);efforts.push(request.reasoning.effort);assert.equal(request.tools,undefined);
    let value;if(name==='member_agent_semantic_verification')value={verdict:'safe',categories:[]};
    else if(name==='guidance_brief')value=mode==='invalid-brief'?{targets:[],questions:[]}:{targets:[{organization:'Federal Student Aid',program:'FAFSA',region:'',intake:''}],questions:['funding']};
    else if(name==='guidance_privacy')value={verdict:['unsafe','uncertain'].includes(mode)?mode:'safe'};
    else assert.fail('Public discovery, planning, synthesis and output stages forbidden');
    const payload={...reply,model:'gpt-5-2025-08-07',output_text:JSON.stringify(value)};
    if(name==='guidance_brief'&&mode==='missing-usage')delete payload.usage;
    const type=name==='guidance_brief'&&mode==='incomplete'?'response.incomplete':'response.completed';
    return name==='member_agent_semantic_verification'?Response.json(payload):new Response('data: '+JSON.stringify({type,response:payload})+'\n\n');
   };
   const call=runGuidanceEvaluationTurn({guard:x.guard,turnId:'GC-04-T1',context,model:'gpt-5',privateProbe:true});
   if(['incomplete','missing-usage'].includes(mode)){await assert.rejects(call);assert.equal(x.guard.summary().entries.at(-1).status,'unknown');assert.equal(stages.length,2);}
   else{const result=await call;assert.equal(result.kind,'private-stage-probe');assert.equal(result.privacyVerdict,mode==='invalid-brief'?null:mode);assert.equal(stages.length,mode==='invalid-brief'?2:3);assert.equal(result.response,undefined);}
   assert.deepEqual(efforts,stages.length===3?['low','minimal','medium']:['low','minimal']);
   assert.equal(x.guard.summary().cumulativeAccountedNanoUsd,x.guard.summary().accountedNanoUsd+1640700130);
  }finally{x.cleanup();}
 }}finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;if(env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env;}
});
test('private policy rejects public tools and later stages before transport independently of runtime stop',async()=>{
 const x=setup({policy:{...policy,allowWebSearch:false,allowedRequestSuffixes:['-semantic-input','-guidance-brief','-guidance-privacy']},capNanoUsd:1580000000,maximumAttempts:3});
 try{x.guard.startTurn('GC-01-T1');let calls=0;await assert.rejects(x.guard.dispatch(body,'GC-01-T1-synthesis',async()=>{calls++;return reply;}),/Stage forbidden/);assert.equal(calls,0);assert.throws(()=>guidanceCallBound({...body,tools:[{type:'web_search'}],max_tool_calls:1},x.guard.policy),/Public tools forbidden/);}finally{x.cleanup();}
});

test('private $1.58 cap fits only the three frozen maximum reservations and refuses fourth dispatch',async()=>{
 const p={...policy,models:{'gpt-5':{context:400000,inputNano:1250,outputNano:10000,returned:['gpt-5']}}};
 const x=setup({policy:p,capNanoUsd:1580000000,maximumAttempts:3,priorAccountedNanoUsd:1640700130,priorLedgerSha256:'a'.repeat(64)});
 try{x.guard.startTurn('GC-01-T1');let calls=0;
  for(const [i,limit] of [4800,1400,1400].entries())await x.guard.dispatch({model:'gpt-5',store:false,max_output_tokens:limit},'probe-'+i,async()=>{calls++;return {model:'gpt-5',usage:{input_tokens:400000,output_tokens:limit},output:[]};});
  assert.equal(x.guard.summary().accountedNanoUsd,1576000000);assert.equal(x.guard.summary().cumulativeAccountedNanoUsd,3216700130);
  assert.equal(x.guard.state.capNanoUsd+x.guard.state.priorAccountedNanoUsd,3220700130);
  await assert.rejects(x.guard.dispatch({model:'gpt-5',store:false},'fourth',async()=>{calls++;return reply;}),/Attempt ceiling/);assert.equal(calls,3);
 }finally{x.cleanup();}
});

test('finished invalid probe remains immutable and requires pinned completion when not transport-halted',async()=>{
 const {verifyPriorAccounting,sha}=await import('./guidance-evaluation-dispatch.mjs');
 const {mkdirSync,writeFileSync}=await import('node:fs');const root=mkdtempSync(join(tmpdir(),'gc-sealed-'));
 try{const runId='gc-finished-invalid';mkdirSync(join(root,runId),{mode:0o700});
  const ledger=JSON.stringify({halted:null,entries:[{status:'settled',accountedNanoUsd:4715000}]});
  writeFileSync(join(root,runId,'spend.json'),ledger,{mode:0o600});
  const completion=JSON.stringify({manifestSha256:'b'.repeat(64),accountedNanoUsd:4715000,inferenceAttempts:1});
  writeFileSync(join(root,runId,'completion.json'),completion,{mode:0o600});
  const receipt={runId,ledgerSha256:sha(ledger),accountedNanoUsd:4715000,completionSha256:sha(completion),manifestSha256:'b'.repeat(64)};
  const manifest={capNanoUsd:1580000000,priorAccounting:{receipts:[receipt],accountedNanoUsd:4715000,ledgerSha256:sha(JSON.stringify([receipt]))}};
  assert.equal(verifyPriorAccounting(manifest,root),4715000);
  const unsealed={...receipt};delete unsealed.completionSha256;
  assert.throws(()=>verifyPriorAccounting({...manifest,priorAccounting:{...manifest.priorAccounting,receipts:[unsealed]}},root));
  writeFileSync(join(root,runId,'completion.json'),'{}',{mode:0o600});assert.throws(()=>verifyPriorAccounting(manifest,root));
 }finally{rmSync(root,{recursive:true,force:true});}
});
