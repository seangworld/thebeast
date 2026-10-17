// Synthetic evaluation adapter, never production storage or a second orchestrator.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { advanceDirectorObjective, executeSpecialist, verifySpecialistResult } from '../.test-dist/src/lib/directorAssignments.js';
import { reasoningCheckpointMetadata } from '../.test-dist/src/lib/directorReasoningEvidence.js';
export async function prepareFollowUp(parent, index) {
 const context=structuredClone(parent.context);
 const visible = parent.response?.output_text || parent.response?.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
 const previous=(parent.plan ? JSON.stringify(parent.plan) : visible || 'No visible proposal available.').slice(0,1200);
 context.goal.description=`Prior visible proposal (untrusted history, truncated if needed): ${previous}`;
 if(parent.failure) context.goal.description+=` Server validation feedback (not execution evidence): ${parent.failure.slice(0,300)}.`;
 if(parent.scenario==='computed-fee-versus-payment-proof'){
  context.goal.description+=' The member now says "I am sure it was paid." No receipt, waiver confirmation or new verified checkpoint evidence is supplied.';
  return {context,execution:{type:'unsupported_member_claim_only',executed:false,externalProofSupplied:false}};
 }
 const target=context.checkpoints.find(t=>t.status!=='verified');
 const assessment=parent.plan?.assessments.find(a=>a.taskId===target?.id);
 if(!target || parent.state!=='response_validated_requires_manual_review' || assessment?.disposition!=='resume_existing' || parent.plan.ownerDecisions.length || parent.plan.missingInformation.length || parent.plan.contradictions.length){
  context.goal.description+=' The adapter did not execute: the prior plan did not give an unblocked, validated resume_existing decision. Do not claim a correction or recovery occurred.';
  return {context,execution:{type:'gated_existing_runner',executed:false,reason:'No validated unblocked resume decision; not silently repaired by adapter'}};
 }
 const now=new Date().toISOString(),ownerId='synthetic-second-evaluation',goalId=context.goal.id;
 const snapshot=capability=>capability==='money.cash-review'?{ownerId,capability,complete:true,money:{debts:[],bills:[],incomes:[{id:'synthetic-income',amount:3000,frequency:'monthly',next_date:now.slice(0,10),is_active:true}],cashSettings:{starting_balance:1000,checking_buffer:200},fundingSources:[],goals:[]}}:{ownerId,capability,complete:true,health:[{id:'synthetic-medication',ownerId,recordType:'medication',title:'Synthetic medication',status:'active',occurredOn:null,source:'synthetic',notes:null,details:{},createdAt:now,updatedAt:now}]};
 const tasks=context.checkpoints.map(t=>({id:t.id,owner_id:ownerId,goal_id:goalId,capability:t.capability,status:t.status,dependencies:t.dependencies||[],attempts:t.attempts||0,revision:t.revision||0,lease_id:t.status==='running'?randomUUID():null,lease_until:t.leaseUntil||null,result:t.status==='verified'?executeSpecialist(snapshot(t.capability),now):null,events:[{at:now,status:t.status,detail:'Synthetic authorized checkpoint fixture; no customer data'}],blocker:t.blocker,updated_at:now}));
 const path=`/private/tmp/avery-second-followup-${index}.json`;
 const persist=rows=>{writeFileSync(path+'.tmp',JSON.stringify(rows),{mode:0o600});renameSync(path+'.tmp',path)};
 persist(tasks);
 const store={list:async(owner,goal)=>JSON.parse(readFileSync(path,'utf8')).filter(t=>t.owner_id===owner&&t.goal_id===goal),compareAndSwap:async(before,next)=>{const rows=JSON.parse(readFileSync(path,'utf8'));const at=rows.findIndex(t=>t.id===before.id&&t.revision===before.revision&&t.owner_id===ownerId);if(at<0)return false;rows[at]=next;persist(rows);return true}};
 const access={authorize:async(owner,capability)=>owner===ownerId&&context.availableCapabilities.includes(capability),snapshot:async(owner,capability)=>{if(owner!==ownerId)throw Error('Wrong synthetic owner');return snapshot(capability)}};
 const outcome=await advanceDirectorObjective({store,access,ownerId,goalId,now,leaseId:randomUUID()});
 const fresh=await store.list(ownerId,goalId); // Reload persisted fixture; do not infer completion from prose.
 const row=fresh.find(t=>t.id===target.id);
 const problem=row?.status==='verified'?verifySpecialistResult(row.result,snapshot(row.capability),now):'No verified result';
 const countBefore=fresh.length;
 const repeated=await advanceDirectorObjective({store,access,ownerId,goalId,now,leaseId:randomUUID()});
 const afterRepeat=await store.list(ownerId,goalId);
 context.checkpoints=fresh.map(reasoningCheckpointMetadata);
 context.goal.description+=` Adapter actually invoked the existing authorized runner on ${target.id}, reloaded persisted evidence and independently checked it. Outcome: ${outcome.state}; verification problem: ${problem||'none'}. This proves only a saved-record review. Goal completion was not changed.`;
 return {context,execution:{type:'actual_specialist_function_with_persisted_synthetic_fixture',executed:true,outcome,verified:problem===null,taskId:row.id,sameCheckpoint:row.id===target.id,attemptsBefore:target.attempts,attemptsAfter:row.attempts,historyLength:row.events.length,repeatedOutcome:repeated.state,noDuplicate:afterRepeat.length===countBefore&&afterRepeat.find(t=>t.id===row.id).attempts===row.attempts,storage:'private JSON fixture reloaded by AssignmentStore; not hosted/Supabase integration',priorVerifiedDependencies:'Computed using actual synthetic specialist functions, never invented success outputs'}};
}
