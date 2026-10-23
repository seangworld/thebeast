import assert from 'node:assert/strict';
import test from 'node:test';
import {saveKnowledgeProposalDecision} from '../src/lib/digitalStaffRuntime/persistence';
import {decideDigitalStaffProposal} from '../src/lib/digitalStaffRuntime/client';
const proposal={id:'p',sourceMessageId:'u',domain:'health' as const,entityType:'medication',fields:{name:'Example'},confidence:1,missingFields:[],contradictions:[],approvalStatus:'proposed' as const,relatedRecordId:null,proposedAction:'create' as const};
function fixture(mode='ok'){
 const filters:unknown[][]=[];let content:unknown,writes=0;
 const current={text:'Review this record.',runtime:{proposals:[proposal]}};
 const q={from(){return q},update(v:{content:unknown}){content=v.content;writes++;return q},eq(k:string,v:unknown){filters.push([k,v]);return q},select(){return q},maybeSingle:async()=>({error:mode==='error'?{}:null,data:mode==='missing'?null:{id:mode==='wrong-id'?'other':'m',content:mode==='stale'?current:content}})};
 return{filters,writes:()=>writes,run:(status:'approved'|'rejected'='rejected')=>saveKnowledgeProposalDecision({client:q as never,ownerId:'owner',conversationId:'c',professionalId:'beasthealth.health-advisor',messageId:'m',content:current,proposalId:'p',status,...(status==='approved'?{recordId:'record'}:{})})};
}
test('owner decisions require exact pending snapshot and confirmed saved status',async()=>{
 for(const status of ['approved','rejected'] as const){const f=fixture();assert.equal((await f.run(status)).status,status);for(const key of ['id','owner_id','conversation_id','sender->>kind','sender->>id','content'])assert.ok(f.filters.some(([k])=>k===key));}
 for(const mode of ['error','missing','wrong-id','stale']){await assert.rejects(fixture(mode).run(),/could not be confirmed/);}
});
test('an already-decided or ambiguous proposal cannot be overwritten',async()=>{
 let writes=0;const client={from(){writes++;throw Error('must not write')}} as never;
 for(const proposals of [[{...proposal,approvalStatus:'approved' as const}],[proposal,proposal]])await assert.rejects(saveKnowledgeProposalDecision({client,ownerId:'owner',conversationId:'c',professionalId:'beasthealth.health-advisor',messageId:'m',content:{runtime:{proposals}},proposalId:'p',status:'rejected'}),/Only a pending/);
 assert.equal(writes,0);
});
test('unconfirmed decision tells the member to reload without claiming rollback',async()=>{
 const previous=globalThis.fetch;try{globalThis.fetch=(async()=>Response.json({error:'Safe unavailable',code:'proposal_decision_unconfirmed'},{status:409})) as typeof fetch;await assert.rejects(decideDigitalStaffProposal({professionalId:'beasthealth.health-advisor',conversationId:'c',proposalId:'p',decision:'reject'}),/Some changes may already have saved.*Reload/);}finally{globalThis.fetch=previous;}
});

// Exercise the real route with an injected database and no provider adapter.
import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
function routeFixture({receiptMissing=false,alreadyApproved=false,foreignConversation=false}={}) {
 let canonicalWrites=0,decisionWrites=0;let nextContent:unknown;
 const content={text:'Review',runtime:{proposals:[{...proposal,...(alreadyApproved?{approvalStatus:'approved' as const}:{})}]}};
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from(table:string){let writing=false;
  const result=()=>table==='agent_conversations'?{data:foreignConversation?null:{id:'c',agent_id:'beasthealth.health-advisor'},error:null}:writing?{data:receiptMissing?null:{id:'m',content:nextContent},error:null}:{data:[{id:'m',sender:{kind:'agent',id:'beasthealth.health-advisor'},content}],error:null};
  const q={select(){return q},eq(){return q},order(){return q},limit(){return q},update(v:{content:unknown}){writing=true;nextContent=v.content;decisionWrites++;return q},maybeSingle:async()=>result(),then(resolve:(v:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve)}};return q;
 }};
 const modules:Record<string,unknown>={'next/server':{NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}},'@/lib/supabase/server':{createRouteClient:()=>db},'@/lib/memberAgeServer':{requireProfessionalEntitlement:async()=>({ok:true})},'@/lib/health/advisorDocuments':{parseAdvisorDocumentIds:()=>[]},'@/lib/digitalStaffRuntime':{requireProfessionalConfig:()=>({}),saveKnowledgeProposalDecision,applyApprovedKnowledgeProposal:async()=>{canonicalWrites++;return{recordId:'record'}},safeDigitalStaffFailure:()=>({error:'Unavailable',requestId:'fixture'})}};
 const m={exports:{} as {POST:(r:Request)=>Promise<Response>}};const js=transpileModule(readFileSync('src/app/api/digital-staff/runtime/route.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)((name:string)=>modules[name]??(name.startsWith('@/')?{}:require(name)),m,m.exports);
 return{canonicalWrites:()=>canonicalWrites,decisionWrites:()=>decisionWrites,run:(decision='reject')=>m.exports.POST(new Request('http://local/api/digital-staff/runtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({professionalId:'beasthealth.health-advisor',conversationId:'c',proposalId:'p',decision})}))};
}
test('route never reports an unconfirmed rejection/approval as saved and preserves access gates',async()=>{
 for(const decision of ['approve','reject']){const f=routeFixture({receiptMissing:true});const r=await f.run(decision);assert.equal(r.ok,false);assert.equal((await r.json()).code,'proposal_decision_unconfirmed');assert.equal(f.canonicalWrites(),decision==='approve'?1:0);}
 const decided=routeFixture({alreadyApproved:true});assert.equal((await decided.run()).status,409);assert.equal(decided.canonicalWrites()+decided.decisionWrites(),0);
 const foreign=routeFixture({foreignConversation:true});assert.equal((await foreign.run('approve')).status,404);assert.equal(foreign.canonicalWrites()+foreign.decisionWrites(),0);
 for(const decision of ['approve','reject'])assert.equal((await routeFixture().run(decision)).status,200);
});
