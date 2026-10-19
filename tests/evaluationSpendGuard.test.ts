import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvaluationSpendGuard, evaluationCallBound, evaluationSpendScope } from "../src/lib/digitalStaffRuntime/evaluationSpendGuard";
import { requestOpenAIResponse, requestOpenAIResponseStream } from "../src/lib/digitalStaffRuntime/provider";
test.before(() => { mock.method(Date, "now", () => Date.parse("2026-10-18T23:00:00Z")); });
test.after(() => mock.restoreAll());
const body = { model: "gpt-5", max_output_tokens: 128000 };
const reply = { model: "gpt-5-2025-08-07", service_tier: "default", usage: { input_tokens: 400000, output_tokens: 128000 }, output: [] };
function fixture() { const dir = mkdtempSync(join(tmpdir(), "evaluation-spend-")); const file = join(dir,"run.json"); const guard = new EvaluationSpendGuard(file,"taylor-test"); return { file, guard, close: () => {guard.close();rmSync(dir,{recursive:true,force:true});} }; }

test("stops BEFORE dispatch could exceed $10, aggregating all previous calls", () => {
 const f=fixture();try {for(let i=0;i<5;i++){const t=f.guard.reserve(body,String(i));f.guard.settle(t,reply);} assert.equal(f.guard.summary().accountedNanoUsd,8900000000);assert.throws(()=>f.guard.reserve(body,"next"),/remaining/);assert.equal(f.guard.summary().attemptedCalls,5);} finally{f.close();}
});
test("unknown pricing, tiers, outputs, tools, search bounds and expired prices fail before reservation",()=>{
 for(const b of [{model:"unpriced"},{...body,service_tier:"priority"},{...body,max_output_tokens:NaN},{...body,tools:[{type:"code_interpreter"}]},{...body,tools:[{type:"web_search"}]},{...body,previous_response_id:"hidden"}]){const f=fixture();try{assert.throws(()=>f.guard.reserve(b,"x"));assert.equal(f.guard.summary().attemptedCalls,0);assert.throws(()=>f.guard.reserve(body,"retry"),/halted/);}finally{f.close();}}assert.throws(()=>evaluationCallBound(body,Date.parse("2026-10-21")),/expired/);
});
test("missing usage retains full reservation and prevents retry or reopen",()=>{
 const f=fixture();try{const t=f.guard.reserve(body,"input-verification");assert.throws(()=>f.guard.settle(t,{model:"gpt-5",output:[]}),/Missing/);assert.equal(f.guard.summary().accountedNanoUsd,t.bound.maximumNanoUsd);assert.throws(()=>f.guard.reserve(body,"retry"),/halted/);f.guard.close();assert.throws(()=>new EvaluationSpendGuard(f.file,"taylor-test"),/halted/);}finally{f.close();}
});
test("durable reservations survive process restart; concurrency and a new run ID cannot reset cap",()=>{
 const f=fixture();try{assert.throws(()=>new EvaluationSpendGuard(f.file,"taylor-test"));f.guard.reserve(body,"planning");assert.equal(JSON.parse(readFileSync(f.file,"utf8")).entries[0].status,"reserved");f.guard.close();assert.throws(()=>new EvaluationSpendGuard(f.file,"taylor-test"),/halted/);assert.throws(()=>new EvaluationSpendGuard(f.file,"another-run"),/mismatch/);}finally{f.close();}
});
test("search reservation includes full context per tool step, output and all tool fees",()=>{
 const b=evaluationCallBound({...body,tools:[{type:"web_search"}],max_tool_calls:3});assert.equal(b.maximumNanoUsd,3310000000);
 const f=fixture();try{const t=f.guard.reserve({...body,tools:[{type:"web_search"}],max_tool_calls:3},"research");f.guard.settle(t,{...reply,usage:{input_tokens:100,output_tokens:100},output:[{type:"web_search_call"}]});assert.equal(f.guard.summary().accountedNanoUsd,31125000);}finally{f.close();}
});
test("changed model, invalid usage and reservation violations stop permanently",()=>{
 for(const payload of [{...reply,model:"surprise"},{...reply,usage:{input_tokens:-1,output_tokens:1}},{...reply,usage:{input_tokens:1,output_tokens:128001}},{...reply,service_tier:"priority"}]){const f=fixture();try{const t=f.guard.reserve(body,"synthesis");assert.throws(()=>f.guard.settle(t,payload));assert.throws(()=>f.guard.reserve(body,"output-verification"));}finally{f.close();}}
});
test("provider intercepts non-streamed verification and streaming planning/synthesis in one ledger",async()=>{
 const f=fixture();let calls=0;const payload={...reply,usage:{input_tokens:10,output_tokens:20}};
 const fakeFetch:typeof fetch=async()=>{calls++;return new Response(JSON.stringify(payload),{status:200});};
 const streamFetch:typeof fetch=async()=>{calls++;return new Response('data: '+JSON.stringify({type:"response.completed",response:payload})+'\n\n',{status:200});};
 try{await evaluationSpendScope.run(f.guard,async()=>{await requestOpenAIResponse(body,{apiKey:"sk-synthetic",requestId:"verification",fetchImpl:fakeFetch});await requestOpenAIResponseStream(body,{apiKey:"sk-synthetic",requestId:"plan",fetchImpl:streamFetch});await requestOpenAIResponseStream(body,{apiKey:"sk-synthetic",requestId:"synthesis",fetchImpl:streamFetch});});assert.equal(calls,3);assert.equal(f.guard.summary().attemptedCalls,3);assert.ok(f.guard.summary().entries.every(e=>e.status==="settled"));}finally{f.close();}
});
test("failed dispatch counts, retains worst-case charge, and stops later calls",async()=>{
 const f=fixture();let calls=0;const fakeFetch:typeof fetch=async()=>{calls++;throw new Error("synthetic transport failure");};try{await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponse(body,{apiKey:"sk-synthetic",fetchImpl:fakeFetch})));await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponse(body,{apiKey:"sk-synthetic",fetchImpl:fakeFetch})));assert.equal(calls,1);assert.equal(f.guard.summary().attemptedCalls,1);}finally{f.close();}
});
test("provider stop-before-cap dispatches no request and does not count a rejected reservation",async()=>{
 const f=fixture();let calls=0;try{for(let i=0;i<5;i++){const t=f.guard.reserve(body,String(i));f.guard.settle(t,reply);}await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponseStream(body,{apiKey:"sk-synthetic",requestId:"cap",fetchImpl:async()=>{calls++;return new Response();}})),/remaining/);assert.equal(calls,0);assert.equal(f.guard.summary().attemptedCalls,5);}finally{f.close();}
});
test("stream with missing final usage retains reservation and blocks next provider call",async()=>{
 const f=fixture();try{await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponseStream(body,{apiKey:"sk-synthetic",requestId:"stream",fetchImpl:async()=>new Response('data: '+JSON.stringify({type:"response.completed",response:{model:"gpt-5",output:[]}})+'\n\n')})));assert.equal(f.guard.summary().entries[0].status,"unknown");assert.throws(()=>f.guard.reserve(body,"retry"));}finally{f.close();}
});
test("settled costs persist across scenario requests without resetting authorization",()=>{
 const f=fixture();try{f.guard.settle(f.guard.reserve(body,"scenario1"),reply);f.guard.close();const next=new EvaluationSpendGuard(f.file,"taylor-test");try{assert.equal(next.summary().accountedNanoUsd,1780000000);assert.equal(next.reserve(body,"scenario2").entry.maximumNanoUsd,1780000000);}finally{next.close();}}finally{f.close();}
});

test("all five provider phases consume the same run-wide ledger, including research and both classifiers",async()=>{
 const f=fixture();let calls=0;const payload={...reply,usage:{input_tokens:10,output_tokens:20}};
 const fakeFetch:typeof fetch=async()=>{calls++;return new Response(JSON.stringify(payload));};
 const streamFetch:typeof fetch=async()=>{calls++;return new Response('data: '+JSON.stringify({type:"response.completed",response:payload})+'\n\n');};
 try{await evaluationSpendScope.run(f.guard,async()=>{
  await requestOpenAIResponse(body,{apiKey:"sk-synthetic",requestId:"input-classifier",fetchImpl:fakeFetch});
  for(const phase of ["planning","research","synthesis"])await requestOpenAIResponseStream(phase==="research"?{...body,tools:[{type:"web_search"}],max_tool_calls:3}:body,{apiKey:"sk-synthetic",requestId:phase,fetchImpl:streamFetch});
  await requestOpenAIResponse(body,{apiKey:"sk-synthetic",requestId:"output-classifier",fetchImpl:fakeFetch});
 });assert.equal(calls,5);assert.equal(f.guard.summary().attemptedCalls,5);assert.ok(f.guard.summary().entries[2].maximumNanoUsd>f.guard.summary().entries[1].maximumNanoUsd);}finally{f.close();}
});

test("scenario replay cannot start a second paid evaluation cycle",()=>{
 const f=fixture();try{f.guard.startScenario("health-medication-discrepancy");f.guard.recordScenario({scenarioId:"health-medication-discrepancy",syntheticOnly:true});assert.throws(()=>f.guard.startScenario("health-medication-discrepancy"),/replay/);assert.throws(()=>f.guard.startScenario("money-adaptive-cashflow"),/Unapproved/);assert.equal(JSON.parse(readFileSync(f.file,"utf8")).results.length,1);}finally{f.close();}
});
test("research deadline after partial stream retains tool-inclusive reservation and partial scenario evidence",async()=>{
 const f=fixture();let calls=0;
 const fakeFetch:typeof fetch=async(_url,init)=>{calls++;return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: {"type":"response.created"}\n\n'));init?.signal?.addEventListener('abort',()=>controller.error(new DOMException('Synthetic timeout','AbortError')),{once:true});}}));};
 try{
  await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponseStream({...body,tools:[{type:"web_search"}],max_tool_calls:3},{apiKey:"sk-synthetic",requestId:"research-timeout",fetchImpl:fakeFetch,timeoutMs:5})));
  f.guard.recordScenario({completedTurns:1,results:[{response:"Preserved prior synthetic response"}],failure:{category:"provider_timeout"}});
  assert.equal(f.guard.summary().accountedNanoUsd,3310000000);assert.equal(f.guard.summary().entries[0].status,"unknown");
  await assert.rejects(()=>evaluationSpendScope.run(f.guard,()=>requestOpenAIResponse(body,{apiKey:"sk-synthetic",requestId:"next",fetchImpl:fakeFetch})));
  assert.equal(calls,1);assert.equal(JSON.parse(readFileSync(f.file,"utf8")).results[0].results[0].response,"Preserved prior synthetic response");
 }finally{f.close();}
});

test("new continuation conserves prior spending and stops BEFORE $6.58 including tools", async () => {
 const { continuationBudget } = await import("../src/lib/digitalStaffRuntime/evaluationSpendGuard");
 const dir=mkdtempSync(join(tmpdir(),"continuation-")); const file=join(dir,"run.json");
 const g=new EvaluationSpendGuard(file,"new-run",continuationBudget); let dispatches=0;
 try {
  for(let i=0;i<3;i++)g.settle(g.reserve(body,String(i)),reply);
  assert.equal(g.summary().accountedNanoUsd,5_340_000_000);
  assert.equal(g.summary().priorAccountedNanoUsd,3_416_366_950);
  assert.equal(g.summary().cumulativeCapNanoUsd,9_996_366_950);
  await assert.rejects(()=>evaluationSpendScope.run(g,()=>requestOpenAIResponse(body,{apiKey:"sk-synthetic",requestId:"stop",fetchImpl:async()=>{dispatches++;return new Response();}})),/remaining/);
  assert.equal(dispatches,0); assert.equal(g.summary().attemptedCalls,3);
  g.close(); assert.throws(()=>new EvaluationSpendGuard(file,"new-run",continuationBudget),/halted/);
  assert.throws(()=>new EvaluationSpendGuard(file,"new-run"),/mismatch/);
 } finally {g.close();rmSync(dir,{recursive:true,force:true});}
});
test("continuation rejects a larger cap or reduced prior cost and retains missing-usage reservation", async()=>{
 const {continuationBudget}=await import("../src/lib/digitalStaffRuntime/evaluationSpendGuard");
 const dir=mkdtempSync(join(tmpdir(),"continuation-")); const file=join(dir,"run.json");
 try {
  assert.throws(()=>new EvaluationSpendGuard(file,"new-run",{...continuationBudget,capNanoUsd:10_000_000_000}),/authorization/);
  assert.throws(()=>new EvaluationSpendGuard(file,"new-run",{...continuationBudget,priorAccountedNanoUsd:0}),/authorization/);
  const g=new EvaluationSpendGuard(file,"new-run",continuationBudget);
  try{const t=g.reserve({...body,tools:[{type:"web_search"}],max_tool_calls:3},"research");assert.throws(()=>g.settle(t,{model:"gpt-5",output:[]}),/Missing/);assert.equal(g.summary().accountedNanoUsd,3_310_000_000);assert.equal(g.summary().accountedNanoUsd+g.summary().priorAccountedNanoUsd,6_726_366_950);assert.throws(()=>g.reserve(body,"next"),/halted/);}finally{g.close();}
 } finally{rmSync(dir,{recursive:true,force:true});}
});
test("new continuation rejects unknown pricing before dispatch without releasing prior spending",async()=>{
 const {continuationBudget}=await import('../src/lib/digitalStaffRuntime/evaluationSpendGuard');
 const dir=mkdtempSync(join(tmpdir(),'continuation-'));const g=new EvaluationSpendGuard(join(dir,'run.json'),'new-run',continuationBudget);let calls=0;
 try{await assert.rejects(()=>evaluationSpendScope.run(g,()=>requestOpenAIResponse({model:'unknown-pricing'},{apiKey:'sk-synthetic',fetchImpl:async()=>{calls++;return new Response();}})),/Unknown/);assert.equal(calls,0);assert.equal(g.summary().attemptedCalls,0);assert.equal(g.summary().priorAccountedNanoUsd,3_416_366_950);assert.throws(()=>g.reserve(body,'next'),/halted/);}finally{g.close();rmSync(dir,{recursive:true,force:true});}
});
test("continuation loader refuses a copied prior ledger location",async()=>{
 const {loadTaylorContinuation}=await import('../src/lib/digitalStaffRuntime/taylorContinuation');
 assert.throws(()=>loadTaylorContinuation('/tmp/copied-prior.json','/tmp/new-ledger.json','another-run'),/Original prior ledger location/);
});
