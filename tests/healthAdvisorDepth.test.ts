import test from 'node:test';
import assert from 'node:assert/strict';
import { digitalStaffModelTier, healthPlanPerformance, healthEvidenceRetrievalPolicy, requiresDeterministicResearch, runDigitalStaffRuntime } from '../src/lib/digitalStaffRuntime/runtime';
import { buildRuntimeInput } from '../src/lib/digitalStaffRuntime/prompt';
import { requireProfessionalConfig } from '../src/lib/digitalStaffRuntime/config';
import { parseAdvisorDocumentIds, loadAdvisorDocuments } from '../src/lib/health/advisorDocuments';
import { safeMemberAgentResponseContract } from '../src/lib/memberAgentResponseSafety';
import type { RuntimeContext } from '../src/lib/digitalStaffRuntime/types';
const ctx: RuntimeContext = {ownerId:'member',professionalId:'beasthealth.health-advisor',conversationId:'conversation',message:{id:'m',role:'user',text:'Explain VA service connection requirements for this issue.',createdAt:'2026-09-17'},recentMessages:[],memories:[],structuredRecords:[{domain:'health',record:{title:'Private member history'}}],workspace:'/dashboard/health/veterans',state:{currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]}};
test('latency tuning is limited to bounded drafting and mandatory research planning',()=>{
  const draft = {...ctx,message:{...ctx.message,text:'Help draft a short personal statement. Do not invent details.'}};
  assert.deepEqual(healthPlanPerformance(draft,'gpt-5'),{reasoning:{effort:'low'}});
  assert.match(healthPlanPerformance(ctx,'gpt-5').instruction || '',/Do not draft the substantive answer before retrieval/);
  for (const text of ['Explain my symptoms.','Draft a personal statement establishing medical causation.','Draft a personal statement about my diagnosis.']) {
    assert.deepEqual(healthPlanPerformance({...ctx,message:{...ctx.message,text}},'gpt-5'),{});
  }
  assert.deepEqual(healthPlanPerformance({...draft,documents:[{id:'d',title:'Original',content:{}}]},'gpt-5'),{});
  assert.deepEqual(healthPlanPerformance(draft,'another-model'),{});
  assert.deepEqual(healthPlanPerformance({...draft,professionalId:'beastmoney.money-coach'},'gpt-5'),{});
});
test('health evidence retrieval has a bounded budget below the unchanged member request deadline',()=>{
  assert.equal(healthEvidenceRetrievalPolicy.timeoutMs,90_000);
  assert.ok(healthEvidenceRetrievalPolicy.timeoutMs < 170_000);
  assert.equal(healthEvidenceRetrievalPolicy.searchContextSize,'medium');
});
test('VA preparation and selected files route to strong reasoning, requirements require research',()=>{
  for(const text of ['Help prepare my personal statement.','Explain my VA denial.','What evidence supports service connection?']) assert.equal(digitalStaffModelTier({...ctx,message:{...ctx.message,text}}),'strong');
  assert.equal(requiresDeterministicResearch(ctx),true);
  assert.equal(requiresDeterministicResearch({...ctx,message:{...ctx.message,text:'Help draft my personal statement.'}}),false);
  assert.equal(digitalStaffModelTier({...ctx,workspace:null,message:{...ctx.message,text:'Explain this.'},documents:[{id:'d',title:'File',content:{}}]}),'strong');
});
test('health context retains older conversation details without changing other advisors',()=>{
  const recentMessages=Array.from({length:32},(_,i)=>({...ctx.message,id:String(i),text:i===0?'Important earlier correction':'Recent message'}));
  const input=JSON.parse(buildRuntimeInput(requireProfessionalConfig(ctx.professionalId),{...ctx,recentMessages}));
  assert.equal(input.recentConversation[0].text,'Important earlier correction');
  assert.equal(input.recentConversation.length,32);
});
test('document selection rejects malformed IDs, other advisors and oversized selection',()=>{
  const id='11111111-1111-1111-1111-111111111111';
  assert.deepEqual(parseAdvisorDocumentIds([id,id],ctx.professionalId),[id]);
  assert.throws(()=>parseAdvisorDocumentIds([id],'beastmoney.money-coach'));
  assert.throws(()=>parseAdvisorDocumentIds(['../private'],ctx.professionalId));
  assert.throws(()=>parseAdvisorDocumentIds([id,id,id],ctx.professionalId));
});
test('document loader refuses missing or foreign rows before storage access and includes ownership filters',async()=>{
  const filters:unknown[]=[]; let downloaded=false;
  const query={select:()=>query,eq:(...args:unknown[])=>{filters.push(args);return query;},in:()=>query,not:async()=>({data:[],error:null})};
  const client={from:()=>query,storage:{from:()=>{downloaded=true;throw new Error('Should not download');}}};
  await assert.rejects(loadAdvisorDocuments(client as unknown as Parameters<typeof loadAdvisorDocuments>[0],'member',['11111111-1111-1111-1111-111111111111']));
  assert.deepEqual(filters,[['owner_id','member'],['category','Health']]);
  assert.equal(downloaded,false);
});
test('researched health answer is synthesized with private context, never passed to web search',async()=>{
  const originalFetch=globalThis.fetch; const key=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='sk-proj-TEST_ONLY_CONTEXTUAL_RESEARCH_123456789';
  const calls:Record<string,unknown>[]=[];
  const stream=(response:unknown)=>new Response(`data: ${JSON.stringify({type:'response.completed',response})}\n\ndata: [DONE]\n\n`,{headers:{'Content-Type':'text/event-stream'}});
  globalThis.fetch=async(_url,init)=>{
    const request=JSON.parse(String(init?.body)); calls.push(request);
    if(request.text?.format?.name==='member_agent_semantic_verification') return Response.json({output_text:JSON.stringify({verdict:'safe',categories:[]})});
    if(request.text?.format?.name==='digital_staff_runtime_plan') return stream({output_text:JSON.stringify({intent:'answer',response:'Initial analysis',nextQuestion:null,state:ctx.state,proposals:[],navigationTarget:null,toolCalls:[],research:{query:'VA service connection evidence requirements',reason:'official requirements',domains:['va.gov']},handoff:null,responseContract:safeMemberAgentResponseContract})});
    if(request.tools) {
      assert.equal(request.tools[0].search_context_size,'medium');
      assert.deepEqual(request.tools[0].filters.allowed_domains,requireProfessionalConfig(ctx.professionalId).researchDomains);
      assert.equal(request.tool_choice,'required');
      assert.doesNotMatch(request.instructions, /Return JSON matching|You are Health Advisor/);
      assert.match(request.instructions, /separate private step/);
      assert.match(new Headers(init?.headers).get('X-Client-Request-Id') || '', /-research$/);
      return stream({output:[{content:[{type:'output_text',text:'General official guidance.',annotations:[{type:'url_citation',title:'VA',url:'https://www.va.gov/disability/'}]}]}]});
    }
    assert.match(JSON.stringify(request.input),/Private member history/);
    assert.match(JSON.stringify(request.input),/General official guidance/);
    return stream({output_text:'Your records identify an issue to discuss. The supplied evidence does not establish a medical nexus. Here is the next question to prepare.'});
  };
  try {
    const result=await runDigitalStaffRuntime({...ctx,requestId:'health-depth-test'});
    assert.match(result.response,/Your records identify/);
    assert.equal(result.researchSources.length,1);
    assert.equal(calls.filter(call=>call.tools).length,1);
    assert.doesNotMatch(JSON.stringify(calls.find(call=>call.tools)?.input),/Private member history/);
    assert.equal(result.timings.providerInvocationCount,5);
  } finally {globalThis.fetch=originalFetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('selected original reaches private model input and oversized content fails',async()=>{
  const id='11111111-1111-1111-1111-111111111111';
  let file=new Blob(['%PDF-1.4 synthetic fixture'],{type:'application/pdf'});
  const query={select:()=>query,eq:()=>query,in:()=>query,not:async()=>({data:[{id,title:'Decision letter',storage_bucket:'private',storage_path:'member/letter.pdf',mime_type:'application/pdf',size_bytes:20}],error:null})};
  const client={from:()=>query,storage:{from:()=>({download:async()=>({data:file,error:null})})}};
  const documents=await loadAdvisorDocuments(client as unknown as Parameters<typeof loadAdvisorDocuments>[0],'member',[id]);
  assert.equal(documents[0].content.type,'input_file');
  assert.match(String(documents[0].content.file_data),/^data:application\/pdf;base64,/);
  file=new Blob([new Uint8Array(10*1024*1024+1)]);
  await assert.rejects(loadAdvisorDocuments(client as unknown as Parameters<typeof loadAdvisorDocuments>[0],'member',[id]),/exceed 10 MB/);
});
test('provider quota failure produces service-unavailable text rather than a medical refusal',async()=>{
  const originalFetch=globalThis.fetch; const key=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='sk-proj-TEST_ONLY_QUOTA_CASE_123456789';
  globalThis.fetch=async()=>Response.json({error:{type:'insufficient_quota',code:'credit_balance_exhausted'}},{status:429});
  try {
    const result=await runDigitalStaffRuntime({...ctx,requestId:'health-depth-test'});
    assert.match(result.response,/service is temporarily unavailable/i);
    assert.doesNotMatch(result.response,/cannot diagnose/i);
    assert.ok(result.validationFailures.includes('semantic-verifier-unavailable'));
    assert.equal(result.proposals.length,0);
    assert.equal(result.timings.providerInvocationCount,1);
  } finally {globalThis.fetch=originalFetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
