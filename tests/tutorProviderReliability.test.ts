import assert from 'node:assert/strict';
import test from 'node:test';
import { callOpenAILearningSpecialist } from '../src/lib/learning/openai';
import { buildLearningAIContext } from '../src/lib/learning/contextBuilder';
import { getHomeworkPolicyForRequest } from '../src/lib/learning/homeworkPolicy';
import { tutorDeadline, tutorRuntimeLimits, type LearningProviderReceipt } from '../src/lib/learning/providerBounds';
import type { OpenAILearningRequest } from '../src/lib/learning/types';
const apiKey='sk-local-fixture-not-a-real-key';
const contract={consequentialAction:'none',providerConnection:'none',professionalAuthority:'bounded_ai',diagnosis:'none',medicationDirection:'none',emergencyEscalation:'not_applicable',homeworkReview:'evidence_based'};
function request(image=false):OpenAILearningRequest { return {
 specialistId:'math-coach',specialistName:'Math Coach',conversationType:'Explanation',outwardPersona:'tutor',
 context:buildLearningAIContext({learnerName:'Learner (teen learner)',mastery:{overallMasteryPercent:0,confidence:'low',concepts:[],weakConcepts:[],strongestConcepts:[],suggestedReviewTopics:[]},weakAreas:[],currentLesson:'Homework'}),
 homeworkPolicy:getHomeworkPolicyForRequest('Check my attempt: 2x=6 so x=2'),messages:[{role:'user',content:'Check my attempt: 2x=6 so x=2'}],
 ...(image?{imageAttachment:{dataUrl:'data:image/png;base64,YQ==',fileName:'private-name.png',mediaType:'image/png'}}:{}),
 }; }
function payload(content=JSON.stringify({message:'Dividing both sides by 2 gives x=3. Try 2x=8.',responseContract:contract}),finish='stop',usage:unknown={prompt_tokens:20,completion_tokens:10,total_tokens:30}) {return new Response(JSON.stringify({model:'gpt-4.1-mini-fixture',choices:[{finish_reason:finish,message:{content}}],usage}));}

test('Tutor bounds both worksheet and teaching calls, preserves usage, and returns only completed teaching',async()=>{
 const calls:Record<string,unknown>[]=[], receipts:LearningProviderReceipt[]=[];
 const fetchImpl=(async(_url,init)=>{assert.ok(init?.signal);const body=JSON.parse(String(init.body));calls.push(body);return calls.length===1?payload('2x=6; learner wrote x=2'):payload();}) as typeof fetch;
 const result=await callOpenAILearningSpecialist(request(true),{apiKey,fetchImpl,onReceipt:r=>receipts.push(r)});
 assert.equal(result.status,'ready');assert.equal(calls.length,2);
 assert.equal(calls[0].max_completion_tokens,tutorRuntimeLimits.transcriptionTokens);assert.equal(calls[1].max_completion_tokens,tutorRuntimeLimits.teachingTokens);
 assert.ok(calls.every(c=>c.store===false&&c.n===1&&!c.tools));
 assert.match(JSON.stringify(calls[1]),/2x=6; learner wrote x=2/);
 assert.equal(result.worksheetTranscription,'2x=6; learner wrote x=2');
 assert.deepEqual(receipts.map(r=>r.usage?.totalTokens),[30,30]);assert.equal(receipts[0].model,'gpt-4.1-mini-fixture');
 assert.doesNotMatch(JSON.stringify(receipts),/private-name|learner wrote|2x=6/);
});

test('Tutor rejects every non-stop finish and does not continue after an incomplete worksheet',async()=>{
 for(const finish of ['length','content_filter','tool_calls','', 'unexpected']){
  let calls=0;const receipts:LearningProviderReceipt[]=[];
  const result=await callOpenAILearningSpecialist(request(true),{apiKey,fetchImpl:(async()=>{calls++;return payload('plausible truncated work',finish);}) as typeof fetch,onReceipt:r=>receipts.push(r)});
  assert.equal(result.status,'error');assert.equal(calls,1);assert.equal(receipts[0].outcome,'incomplete');assert.equal(receipts[0].usage?.totalTokens,30);
 }
});

test('Tutor never dispatches after cancellation, cancels slow calls, and never retries',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 const fetchImpl=(async(_url,init)=>{calls++;return await new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}) as typeof fetch;
 assert.equal((await callOpenAILearningSpecialist(request(),{apiKey,fetchImpl,signal:c.signal})).status,'error');assert.equal(calls,0);
 const receipts:LearningProviderReceipt[]=[];
 assert.equal((await callOpenAILearningSpecialist(request(),{apiKey,fetchImpl,timeoutMs:10,onReceipt:r=>receipts.push(r)})).status,'error');assert.equal(calls,1);assert.equal(receipts[0].outcome,'cancelled');assert.equal(receipts[0].usage,null);
 const d=new AbortController();calls=0;
 const result=await callOpenAILearningSpecialist(request(true),{apiKey,signal:d.signal,fetchImpl:(async()=>{calls++;d.abort();return payload('2x=6');}) as typeof fetch});
 assert.equal(result.status,'error');assert.equal(calls,1);
});

test('Tutor bounds response bytes and rejects malformed, empty, refused and disconnected responses',async()=>{
 for(const make of [()=>new Response('x'.repeat(tutorRuntimeLimits.responseBytes+1)),()=>new Response('{'),()=>payload(''),()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{refusal:'no',content:'no'}}]})),()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));c.error(new Error('disconnect'));}}))]){
  let calls=0;const result=await callOpenAILearningSpecialist(request(),{apiKey,fetchImpl:(async()=>{calls++;return make();}) as typeof fetch});assert.equal(result.status,'error');assert.equal(calls,1);
 }
});

test('Tutor preserves unknown usage honestly and rejects invalid teaching envelopes',async()=>{
 const receipts:LearningProviderReceipt[]=[];
 const ready=await callOpenAILearningSpecialist(request(),{apiKey,fetchImpl:(async()=>payload(undefined,'stop',null)) as typeof fetch,onReceipt:r=>receipts.push(r)});
 assert.equal(ready.status,'ready');assert.equal(receipts[0].usage,null);
 for(const content of ['not json','{"message":"answer"}'])assert.equal((await callOpenAILearningSpecialist(request(),{apiKey,fetchImpl:(async()=>payload(content)) as typeof fetch})).status,'error');
});


test('Tutor exhausted total deadline is already aborted before any next dispatch',()=>{
 for(const remaining of [0,-1,Number.NaN]){const deadline=tutorDeadline(undefined,remaining);assert.equal(deadline.signal.aborted,true);deadline.dispose();}
});

test('Tutor cancellation interrupts a pending provider body without a second call',async()=>{
 let calls=0;const receipts:LearningProviderReceipt[]=[];
 const result=await callOpenAILearningSpecialist(request(true),{apiKey,timeoutMs:10,onReceipt:r=>receipts.push(r),fetchImpl:(async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}}));}) as typeof fetch});
 assert.equal(result.status,'error');assert.equal(calls,1);assert.equal(receipts[0].usage,null);assert.equal(receipts[0].outcome,'cancelled');
});
