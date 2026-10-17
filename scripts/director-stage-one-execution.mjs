// Synthetic evaluation adapter using existing production approval/runner/verifier.
import { readFileSync,writeFileSync,renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { approveDirectorReasoning } from '../.test-dist/src/lib/directorReasoning.js';
import { advanceDirectorObjective,executeSpecialist,verifySpecialistResult } from '../.test-dist/src/lib/directorAssignments.js';
export async function executeStageOneDecision(context,plan,path) {
 const started=performance.now(),now='2026-10-17T17:00:00.000Z',owner='synthetic-stage-one-owner',goal=context.goal.id;
 const snapshot=capability=>capability==='money.cash-review'?{ownerId:owner,capability,complete:true,money:{debts:[],bills:[],incomes:[{id:'synthetic-income',amount:3000,frequency:'monthly',next_date:'2026-10-17',is_active:true}],cashSettings:{starting_balance:1000,checking_buffer:200},fundingSources:[],goals:[]}}:{ownerId:owner,capability,complete:true,health:[{id:'synthetic-medication',ownerId:owner,recordType:'medication',title:'Synthetic medication',status:'active',occurredOn:null,source:'synthetic',notes:null,details:{},createdAt:now,updatedAt:now}]};
 const before=context.checkpoints.map(t=>({id:t.id,owner_id:owner,goal_id:goal,capability:t.capability,status:t.status,dependencies:t.dependencies||[],attempts:t.attempts||0,revision:0,lease_id:t.status==='running'?randomUUID():null,lease_until:t.leaseUntil||null,result:t.status==='verified'?executeSpecialist(snapshot(t.capability),now):null,events:[{at:now,status:t.status,detail:'Synthetic approved baseline checkpoint'}],blocker:t.blocker||null,updated_at:now}));
 let tasks=structuredClone(before),authorization='No action requested',blocked=null;
 try {
  if(plan.steps.length){
   const capabilities=approveDirectorReasoning(plan,context,context);authorization='Explicit synthetic member approval of the validated proposed supported steps';
   for(const capability of capabilities){const step=plan.steps.find(s=>s.capability===capability);tasks.push({id:`${goal}:${capability}`,owner_id:owner,goal_id:goal,capability,status:'planned',dependencies:(step.dependsOn||[]).map(c=>tasks.find(t=>t.capability===c)?.id),attempts:0,revision:0,lease_id:null,lease_until:null,result:null,events:[{at:now,status:'planned',detail:'Explicit synthetic member approval'}],blocker:null,updated_at:now});}
  } else if(plan.assessments.some(a=>a.disposition==='resume_existing')){
   if(plan.ownerDecisions.length||plan.missingInformation.length||plan.contradictions.length)throw Error('Model returned execution blockers; no recovery authorized by this decision');
   authorization='Existing synthetic checkpoint authorization; validated resume_existing decision';
  }
 }catch(e){blocked=String(e.message);}
 const persist=rows=>{writeFileSync(path+'.tmp',JSON.stringify(rows),{mode:0o600});renameSync(path+'.tmp',path);};persist(tasks);
 const store={list:async(o,g)=>JSON.parse(readFileSync(path,'utf8')).filter(t=>t.owner_id===o&&t.goal_id===g),compareAndSwap:async(previous,next)=>{const rows=JSON.parse(readFileSync(path,'utf8'));const i=rows.findIndex(t=>t.id===previous.id&&t.owner_id===owner&&t.revision===previous.revision);if(i<0)return false;rows[i]=next;persist(rows);return true;}};
 const access={authorize:async(o,c)=>o===owner&&context.availableCapabilities.includes(c),snapshot:async(o,c)=>{if(o!==owner||!context.availableCapabilities.includes(c))throw Error('Synthetic access denied');return snapshot(c);}};
 const executable=!blocked&&(plan.steps.length>0||plan.assessments.some(a=>a.disposition==='resume_existing'));
 const outcomes=[];
 if(executable)for(let n=0;n<tasks.length;n++){const outcome=await advanceDirectorObjective({store,access,ownerId:owner,goalId:goal,now,leaseId:randomUUID()});outcomes.push(outcome);if(!['verified'].includes(outcome.state))break;}
 const fresh=await store.list(owner,goal);
 const verification=fresh.map(t=>({taskId:t.id,status:t.status,attempts:t.attempts,dependencies:t.dependencies,history:t.events,verificationProblem:t.status==='verified'?verifySpecialistResult(t.result,snapshot(t.capability),now):'No verified result',originalCheckpoint:before.some(b=>b.id===t.id),priorAttempts:before.find(b=>b.id===t.id)?.attempts??null}));
 let repeated=null;
 if(executable&&fresh.every(t=>t.status==='verified'))repeated=await advanceDirectorObjective({store,access,ownerId:owner,goalId:goal,now,leaseId:randomUUID()});
 const after=await store.list(owner,goal);
 return {storage:'Private persisted/reloaded synthetic AssignmentStore; not hosted/Supabase',authorization,blocked,executed:executable,outcomes,verification,checkpointIdsPreserved:before.every(t=>after.some(a=>a.id===t.id)),noDuplicateOnRepeat:after.length===fresh.length&&after.every(t=>t.attempts===fresh.find(a=>a.id===t.id).attempts),repeatedOutcome:repeated,goalMarkedComplete:false,externalActionsPerformed:false,executionElapsedMs:performance.now()-started};
}
