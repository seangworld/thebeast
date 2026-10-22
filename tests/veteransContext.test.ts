import assert from 'node:assert/strict';
import test from 'node:test';
import {scopeVeteransHistory,veteransEvidenceBoundary,type VeteransTurnSelection,type VeteransHistoryRow} from '../src/lib/health/veteransContext';
import {loadSelectedVeteranClaim,saveVeteranClaim} from '../src/lib/health/veteranClaimsPersistence';
import {emptyVeteranClaim,draftClaimStatement} from '../src/lib/health/veteranClaims';
import {loadAdvisorDocuments} from '../src/lib/health/advisorDocuments';
import {DigitalStaffClientError,requestDigitalStaffResponse} from '../src/lib/digitalStaffRuntime/client';
import {veteransSaveFailureCode} from '../src/lib/health/veteransSave';
import {createHash} from 'node:crypto';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const scope=(id=a,revision=1,doc=a):VeteransTurnSelection=>({version:1,claim:{id,revision,updatedAt:'2026-10-20'},documents:[{id:doc,sha256:'sha'+doc,updatedAt:'2026-10-20'}]});
const state={currentTopic:'old diagnosis',currentWorkspace:null,lastProfessionalQuestion:'old question',unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:['old draft']};
function pair(id:string,s:VeteransTurnSelection):VeteransHistoryRow[]{return[{id:'u'+id,sender:{kind:'user'},content:'my account '+id,created_at:'2026-10-20'},{id:'a'+id,sender:{kind:'agent'},content:{text:'assistant inference '+id,runtime:{veteransSelection:s,sourceMessageId:'u'+id}},created_at:'2026-10-20'}];}

test('claim switches exclude other claims, legacy unknown provenance and global memory/state without erasing stored history',()=>{
 const rows=[...pair('A',scope()),...pair('B',scope(b)),{id:'legacy',sender:{kind:'user'},content:'unlinked prior account',created_at:'2026-10-20'}];
 const result=scopeVeteransHistory(rows,scope(b),scope(),state);
 assert.deepEqual(result.messages.map(x=>x.id),['uB','aB']);assert.equal(result.state.currentTopic,null);assert.deepEqual(result.state.previousDecisions,[]);assert.equal(rows.length,5);assert.equal(result.excludedCount,3);
 assert.match(veteransEvidenceBoundary,/member-entered\/unverified/);assert.match(veteransEvidenceBoundary,/not clinically or VA verified/);assert.match(veteransEvidenceBoundary,/Prior assistant drafts/);
 const revised=scopeVeteransHistory(rows,scope(a,2),scope(),state);assert.equal(revised.messages.length,0);assert.equal(revised.state.currentTopic,null);
});
test('same-claim history retains source stamps; changed originals reset cached state and do not imply a fresh reading of older attachments',()=>{
 const rows=pair('A',scope());const unchanged=scopeVeteransHistory(rows,scope(),scope(),state);assert.equal(unchanged.state,state);
 const changed=scopeVeteransHistory(rows,scope(a,1,b),scope(),state);assert.equal(changed.messages.length,2);assert.equal(changed.state.currentTopic,null);assert.deepEqual(changed.messages[0].veteransSelection?.documents,scope().documents);
 const ordinary=scopeVeteransHistory(rows,null,scope(),state);assert.equal(ordinary.messages.length,0);assert.equal(ordinary.state.currentTopic,null);
});
function claimClient(row:Record<string,unknown>|null){const filters:unknown[][]=[];const q={select(){return q},eq(k:string,v:unknown){filters.push([k,v]);return q},maybeSingle:async()=>({data:row,error:null})};return {filters,client:{from:()=>q} as unknown as Parameters<typeof loadSelectedVeteranClaim>[0]};}
function claimRow(){const c=emptyVeteranClaim(a);c.title='Left knee — member account';return{id:a,owner_id:'owner',revision:1,title:c.title,claim_type:c.claimType,stage:'submitted',details:c.details,updated_at:'2026-10-20'};}
test('selected claim lookup checks exact identity, owner and saved revision; it never upgrades reported stage to verified',async()=>{
 const f=claimClient(claimRow());const got=await loadSelectedVeteranClaim(f.client,'owner',a);assert.deepEqual(f.filters,[['id',a],['owner_id','owner']]);assert.equal(got.claim.stage,'submitted');assert.equal(got.claim.revision,1);
 for(const row of [null,{...claimRow(),owner_id:'other'},{...claimRow(),id:b},{...claimRow(),revision:0},{...claimRow(),stage:'externally-verified'}])await assert.rejects(loadSelectedVeteranClaim(claimClient(row).client,'owner',a),/unavailable/);
 const invalid=claimClient(claimRow());await assert.rejects(loadSelectedVeteranClaim(invalid.client,'owner','../private'),/unavailable/);assert.equal(invalid.filters.length,0);
});
test('organizer draft preserves uncertain/conflicting accounts and missing facts without inventing a clinical or causal conclusion',()=>{
 const c=emptyVeteranClaim(a);c.title='Issue not yet diagnosed';c.details.serviceContext='I recall an injury around 2014; I am unsure of the date.';c.details.timeline='My account says left knee; the letter says right ankle. I need to resolve that.';
 const draft=draftClaimStatement(c);assert.ok(draft.includes(c.details.serviceContext));assert.ok(draft.includes(c.details.timeline));assert.match(draft,/Add specific examples/);assert.doesNotMatch(draft,/caused by|established diagnosis|eligible for|submitted to VA/);
});
test('a matching saved row ID/revision cannot conceal changed statement content',async()=>{
 const c=emptyVeteranClaim(a);c.title='Issue';c.details.statement='My uncertain account.';let payload:Record<string,unknown>={};
 const q={insert(v:Record<string,unknown>){payload=v;return q},select(){return q},maybeSingle:async()=>({data:{...payload,owner_id:'owner',details:{...c.details,statement:'Invented replacement'}},error:null})};
 const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:()=>q} as unknown as Parameters<typeof saveVeteranClaim>[0];await assert.rejects(saveVeteranClaim(client,c),/saved content/);assert.equal(c.details.statement,'My uncertain account.');
});
function documentClient(rows:Record<string,unknown>[],file=new Blob(['%PDF-1.4 synthetic selected original'])){let downloads=0;const filters:unknown[][]=[];const q={select(){return q},eq(k:string,v:unknown){filters.push([k,v]);return q},in(){return q},not:async()=>({data:rows,error:null})};return {downloads:()=>downloads,filters,client:{from:()=>q,storage:{from:()=>({download:async()=>{downloads++;return {data:file,error:null}}})}} as unknown as Parameters<typeof loadAdvisorDocuments>[0]};}
const docRow=(id=a)=>({id,owner_id:'owner',category:'Health',status:'Active',title:'Decision letter',storage_bucket:'private',storage_path:'owner/letter.pdf',mime_type:'application/pdf',size_bytes:30,updated_at:'2026-10-20'});
test('selected originals have exact owner/ID provenance and a digest of actual downloaded bytes',async()=>{
 const f=documentClient([docRow()]);const result=await loadAdvisorDocuments(f.client,'owner',[a]);assert.deepEqual(f.filters,[['owner_id','owner'],['category','Health']]);assert.equal(result[0].provenance?.sha256,createHash('sha256').update('%PDF-1.4 synthetic selected original').digest('hex'));assert.equal(result[0].provenance?.source,'selected-member-original');assert.equal(f.downloads(),1);
 for(const rows of [[docRow(b)],[{...docRow(),owner_id:'other'}],[{...docRow(),category:'Money'}],[{...docRow(),status:'Archived'}],[docRow(),docRow()]]){const bad=documentClient(rows);await assert.rejects(loadAdvisorDocuments(bad.client,'owner',rows.length===2?[a,b]:[a]),/unavailable/);assert.equal(bad.downloads(),0);}
 const unreadable=documentClient([docRow()],new Blob(['not a supported original']));await assert.rejects(loadAdvisorDocuments(unreadable.client,'owner',[a]),/supports PDF/);
});
test('unconfirmed save is a bounded explicit client error, not a success or a promise nothing saved',async()=>{
 assert.match(new DigitalStaffClientError('receipt',veteransSaveFailureCode).message,/Some conversation messages may have saved/);
 const original=globalThis.fetch;let calls=0;try{globalThis.fetch=(async()=>{calls++;return Response.json({code:veteransSaveFailureCode,requestId:'receipt'},{status:502});}) as typeof fetch;
 await assert.rejects(requestDigitalStaffResponse({professionalId:'beasthealth.health-advisor',conversationId:'c',message:'Draft my supplied account',workspace:'/dashboard/health/veterans'}),/Review this conversation before retrying/);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

test('fresh scoped state never shares mutable arrays between requests',()=>{
 const first=scopeVeteransHistory([],scope(),null,state);first.state.previousDecisions.push('private');
 assert.deepEqual(scopeVeteransHistory([],scope(b),null,state).state.previousDecisions,[]);
});
