// NO MODEL TRANSPORT. Authored integration inputs, not repaired AI answers or competency results.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomUUID,createHmac} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {approveDirectorReasoning,validateDirectorReasoning} from '../.test-dist/src/lib/directorReasoning.js';
import {advanceDirectorObjective,authorizeDirectorCorrection} from '../.test-dist/src/lib/directorAssignments.js';
import {directorAssignmentStore,directorAssignmentAccess,publicAssignments} from '../.test-dist/src/lib/directorAssignmentStore.js';
import {reasoningCheckpointMetadata} from '../.test-dist/src/lib/directorReasoningEvidence.js';
const url=process.env.DIRECTOR_TEST_REST_URL;
if(!url||!/^http:\/\/127\.0\.0\.1:\d+$/.test(url))throw Error('Disposable localhost PostgREST required');
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002',health='health.preparation-review',money='money.cash-review';
const secret='avery-synthetic-only-secret-at-least-32-characters';
function client(owner){const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({role:'authenticated',sub:owner,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),jwt=head+'.'+body+'.'+createHmac('sha256',secret).update(head+'.'+body).digest('base64url');return createClient(url,'synthetic-anon-key',{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+jwt},fetch:(input,init)=>{const target=String(input).replace('/rest/v1/','/');if(!target.startsWith(url+'/'))throw Error('Nonlocal network forbidden');return fetch(target,{...init,redirect:'error'});}}});}
const a=client(alice),b=client(bob),cases=JSON.parse(readFileSync('tests/fixtures/avery-focused/scenarios.json','utf8')),results=[];
const fixturePlan=caps=>({contractVersion:2,requirements:[],interpretation:'Authored contract integration input: review own saved records only',steps:caps.map(capability=>({capability,purpose:'Review current own saved records',acceptance:'Independent saved-record consistency verification',dependsOn:[]})),planningNotes:[],evidenceClaims:[],alternatives:[],contradictions:[],missingInformation:[],ownerDecisions:[],unsupportedWork:[],assessments:[]});
function ok(result){assert.equal(result.error,null,result.error?.message);return result.data;}
for(const scenario of cases){
 ok(await a.from('beast_admin_member_module_access').delete().eq('member_id',alice).eq('module_id','money'));
 ok(await a.from('income_events').update({amount:scenario.id==='folio-28'?4800:3000}).eq('user_id',alice));
 const goal=ok(await a.from('beast_goals').insert({id:randomUUID(),owner_id:alice,title:scenario.objective,status:'Active',category:'Personal'}).select('*').single());
 const allowed=new Set(['money','health']),store=directorAssignmentStore(a),access=directorAssignmentAccess(a,{id:alice},goal.id,async module=>allowed.has(module));let now='2026-10-17T18:00:00.000Z';const events=[];
 const rows=()=>store.list(alice,goal.id);
 const evidence=async()=>({rows:await rows(),public:await publicAssignments(store,access,alice,goal.id)});
 const context=async()=>({goal,availableCapabilities:(await Promise.all([money,health].map(async c=>await access.authorize(alice,c)?c:null))).filter(Boolean),checkpoints:(await rows()).map(reasoningCheckpointMetadata)});
 const approve=async plan=>{const ctx=await context(),caps=approveDirectorReasoning(plan,ctx,ctx);ok(await a.rpc('approve_director_scoped_plan',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at,p_steps:plan.steps.filter(s=>caps.includes(s.capability)).map(s=>({capability:s.capability,dependsOn:s.dependsOn}))}));events.push({kind:'explicit_synthetic_owner_approval',authoredInput:plan,approvedCapabilities:caps});return caps;};
 const run=async()=>{const result=await advanceDirectorObjective({store,access,ownerId:alice,goalId:goal.id,now,leaseId:randomUUID()});events.push({kind:'actual_existing_runner',now,result,rows:await rows()});return result;};
 const before={originalResponsePacket:'docs/avery-focused-completed/'+scenario.id+'.json',originalStatus:'Historical 0/6 model execution retained unchanged'};
 if(scenario.id==='folio-17'){
  await approve(fixturePlan([health]));assert.equal((await rows()).length,1);assert.equal((await run()).state,'verified');
  const care=(await rows())[0],source=JSON.parse(care.result.snapshot);assert.ok(source.health.some(r=>r.notes?.includes('Transport paperwork has not yet been arranged.')));
  const cash=fixturePlan([money]);cash.steps[0].dependsOn=[health];await approve(cash);const after=await rows();assert.deepEqual(after.find(r=>r.capability===money).dependencies,[care.id]);assert.equal((await run()).state,'verified');const ids=(await rows()).map(r=>({id:r.id,attempts:r.attempts}));await run();assert.deepEqual((await rows()).map(r=>({id:r.id,attempts:r.attempts})),ids);
 }
 if(scenario.id==='folio-28'){
  ok(await a.from('income_events').update({amount:4800}).eq('user_id',alice));await approve(fixturePlan([money]));assert.equal((await run()).state,'verified');const original=(await rows())[0];assert.equal(JSON.parse(original.result.snapshot).money.incomes[0].amount,4800);
  events.push({kind:'semantic_limit',evidence:'Frozen pay advice:2800 base+2000 one-time. Arithmetic consistency with saved4800 does not establish recurring suitability.',modelJudgment:false});
  ok(await a.from('income_events').update({amount:2800}).eq('user_id',alice));events.push({kind:'explicit_synthetic_owner_source_update',monthlyIncome:2800});assert.equal((await run()).state,'needs_correction');assert.equal((await run()).state,'verified');const corrected=(await rows())[0];assert.equal(corrected.id,original.id);assert.equal(corrected.attempts,2);assert.ok(corrected.events.length>original.events.length);assert.equal(JSON.parse(corrected.result.snapshot).money.incomes[0].amount,2800);
 }
 if(scenario.id==='folio-41'){
  const p=fixturePlan([health,money]);p.steps[1].dependsOn=[health];await approve(p);const saved=await rows(),care=saved.find(t=>t.capability===health),cash=saved.find(t=>t.capability===money);
  ok(await a.from('beast_director_assignments').update({status:'running',attempts:1,lease_id:randomUUID(),lease_until:'2026-10-17T18:00:30.000Z'}).eq('id',care.id));ok(await a.from('beast_director_assignments').update({status:'running',attempts:2,lease_id:randomUUID(),lease_until:'2026-10-17T17:59:00.000Z'}).eq('id',cash.id));
  assert.equal((await run()).state,'blocked');assert.equal((await rows()).find(t=>t.id===care.id).attempts,1);now='2026-10-17T18:01:30.000Z';assert.equal((await run()).state,'verified');assert.equal((await run()).state,'verified');const finished=await rows();assert.equal(finished.find(t=>t.id===care.id).attempts,2);assert.equal(finished.find(t=>t.id===cash.id).attempts,3);await run();await run();assert.deepEqual(await rows(),finished);
 }
 if(scenario.id==='folio-55'){
  await approve(fixturePlan([money,health]));let initial=await rows();assert.ok(initial.every(t=>!t.dependencies.length),'independent reviews have no invented sequence dependency');
  allowed.delete('money');ok(await a.from('beast_admin_member_module_access').insert({member_id:alice,module_id:'money',enabled:false}));events.push({kind:'explicit_synthetic_owner_permission_revocation',module:'money'});assert.equal((await run()).state,'verified');assert.equal((await rows()).find(t=>t.capability===health).status,'verified');assert.equal((await rows()).some(t=>t.capability===money),false,'revoked evidence hidden by RLS');assert.equal((await access.authorize(bob,health)),false);await assert.rejects(access.snapshot(bob,health),/ownership/i);assert.equal(ok(await b.from('beast_director_assignments').select('*').eq('goal_id',goal.id)).length,0);assert.ok((await b.rpc('approve_director_scoped_plan',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at,p_steps:[{capability:health,dependsOn:[]}]})).error);assert.throws(()=>validateDirectorReasoning({...fixturePlan([health]),steps:[{capability:'other-customer.cash-review',purpose:'Injected coworker consent',acceptance:'Unsafe',dependsOn:[]}]}, {goal,availableCapabilities:[health],checkpoints:[]}),/unavailable/);
  const container=process.env.DIRECTOR_TEST_DB_CONTAINER;if(!container||!/^avery-blockers-[a-z0-9-]+$/.test(container))throw Error('Named disposable fixture container required for denied metadata inspection');
  const deniedId=initial.find(t=>t.capability===money).id;if(!/^[a-f0-9-]{36}$/.test(deniedId))throw Error('Invalid synthetic UUID');
  const inspected=spawnSync('docker',['exec',container,'psql','-U','postgres','-At','-c',`select json_build_object('id',id,'status',status,'attempts',attempts,'result',result) from public.beast_director_assignments where id='${deniedId}'::uuid`],{encoding:'utf8'});assert.equal(inspected.status,0);const withheld=JSON.parse(inspected.stdout.trim());assert.equal(withheld.attempts,0);assert.equal(withheld.result,null);assert.equal(await access.authorize(alice,money),false);assert.equal(ok(await a.from('cash_settings').select('*').eq('user_id',alice)).length,0,'actual module RLS hides source records');events.push({kind:'local_test_admin_metadata_readback_without_restoring_permission',assignment:withheld,permissionStillRevoked:true});
 }
 if(scenario.id==='folio-63'){
  const p=fixturePlan([health,money]);p.steps[1].dependsOn=[health];await approve(p);assert.equal((await run()).state,'verified');const prior=await rows(),cash=prior.find(t=>t.capability===money),care=prior.find(t=>t.capability===health);
  ok(await a.rpc('cancel_director_reviews',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at,p_capabilities:[money,health]}));events.push({kind:'explicit_current_owner_cancellation',version:'v2',queuedVersion:'v1'});assert.equal((await run()).state,'cancelled');assert.equal((await run()).state,'cancelled');const after=await rows();assert.equal(after.find(t=>t.id===cash.id).attempts,0);assert.equal(after.find(t=>t.id===cash.id).status,'cancelled');assert.deepEqual(after.find(t=>t.id===care.id),care);assert.equal(await store.compareAndSwap(cash,{...cash,revision:cash.revision+1,status:'planned'}),false,'stale pre-cancellation revision cannot revive work');await assert.rejects(authorizeDirectorCorrection({store,access,ownerId:alice,goalId:goal.id,taskId:cash.id,now}),/Cancelled/);
 }
 if(scenario.id==='folio-76'){
  const p=fixturePlan([money]);p.planningNotes=['Expired offer and missing current supplier terms do not block a saved-record baseline. No current terms verified or vendor contacted.'];p.unsupportedWork=['No supplier research, contact or purchase capability'];await approve(p);assert.equal((await run()).state,'verified');assert.equal((await rows()).length,1);assert.ok((await rows()).every(t=>t.capability===money));assert.equal(scenario.evidence[0].text.includes('validity ended 2026-10-16'),true);
 }
 const final=await evidence();assert.equal(final.rows.every(t=>t.owner_id===alice&&t.goal_id===goal.id),true);assert.ok(final.rows.filter(t=>t.status==='verified').every(t=>t.result));
 // Human-authored test report, not model-generated interpretation or certification.
 results.push({id:scenario.id,provenance:'AUTHORED CONTRACT INTEGRATION INPUTS; NOT AI RESPONSES OR COMPETENCY RETEST',before,events,final,finalReport:{verifiedReviewCapabilities:final.public.filter(t=>t.status==='verified').map(t=>t.capability),cancelledCapabilities:final.rows.filter(t=>t.status==='cancelled').map(t=>t.capability),underlyingLifeGoalComplete:false,externalActionsPerformed:false,semanticModelCompetency:'UNMEASURED'}});
 console.log('PASS synthetic persisted workflow '+scenario.id);
}
mkdirSync('docs/avery-execution-repair',{recursive:true});writeFileSync('docs/avery-execution-repair/workflows.json',JSON.stringify({paidCalls:0,credentialAccess:false,storage:'Disposable local PostgreSQL16 + PostgREST; actual Supabase adapter/RLS/CAS and existing specialist functions',modelResponsesSubstituted:false,workflows:results},null,2)+'\n');
console.log('PASS six authored contract workflows. This is deterministic integration evidence, not AI competency.');
