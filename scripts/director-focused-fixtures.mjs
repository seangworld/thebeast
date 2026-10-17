// Assessment-only authenticated synthetic fixtures; existing specialist/runner/verifier.
import { readFileSync,writeFileSync,renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { advanceDirectorObjective,executeSpecialist,verifySpecialistResult,cancelDirectorAssignment } from '../.test-dist/src/lib/directorAssignments.js';
export const clock='2026-10-17T18:00:00.000Z';
export const owner='synthetic-focused-member';
export const health='health.preparation-review',money='money.cash-review';
export function createFocusedFixture(path,scenario,{live=false,resumeState=null}={}){
 let leaseSequence=0;
 const fixtureLease=()=>createHash('sha256').update(scenario.id+':lease:'+leaseSequence++).digest('hex').slice(0,32);
 let now=clock,amount=scenario.id==='folio-28'?4800:3000;
 const allowed=new Set([health,money]),reads={own:0,foreign:0,denied:0};
 const snapshot=capability=>capability===money?{ownerId:owner,capability,complete:true,money:{debts:[],bills:[],incomes:[{id:'saved-pay',amount,frequency:'monthly',next_date:'2026-10-17',is_active:true}],cashSettings:{starting_balance:1000,checking_buffer:200},fundingSources:[],goals:[]}}:{ownerId:owner,capability,complete:true,health:[{id:'saved-logistics',ownerId:owner,recordType:'appointment',title:'Own appointment paperwork',status:'active',occurredOn:'2026-11-03',source:'synthetic',notes:'Transport paperwork has not yet been arranged.',details:{},createdAt:clock,updatedAt:clock}]};
 const make=(id,capability,status='planned',dependencies=[],attempts=0,lease=null)=>({id,owner_id:owner,goal_id:scenario.id,capability,status,dependencies,attempts,revision:0,lease_id:status==='running'?fixtureLease():null,lease_until:lease,result:status==='verified'?executeSpecialist(snapshot(capability),clock):null,events:[{at:clock,status,detail:'Explicit synthetic fixture authorization'}],blocker:null,updated_at:clock});
 let initial;
 if(scenario.id==='folio-41')initial=[make('care-row',health,'running',[],1,'2026-10-17T18:00:30.000Z'),make('cash-row',money,'running',['care-row'],2,'2026-10-17T17:59:00.000Z')];
 else if(['folio-17','folio-55','folio-63'].includes(scenario.id))initial=[make('care-row',health)];
 else initial=[make('cash-row',money)];
 if(['folio-55','folio-63'].includes(scenario.id))initial.push(make('cash-row',money,'planned',['care-row']));
 if(live&&scenario.id!=='folio-41')initial=[];
 if(resumeState){if(scenario.id!=='folio-41')throw Error('Resume hydration limited to unchanged recovery fixture');initial=structuredClone(resumeState.rows);now=resumeState.clock;allowed.clear();for(const c of resumeState.availableCapabilities)allowed.add(c);Object.assign(reads,resumeState.reads);}
 const persist=rows=>{writeFileSync(path+'.tmp',JSON.stringify(rows),{mode:0o600});renameSync(path+'.tmp',path);};persist(initial);
 const list=()=>JSON.parse(readFileSync(path,'utf8'));
 const store={list:async(o,g)=>list().filter(t=>t.owner_id===o&&t.goal_id===g),compareAndSwap:async(previous,next)=>{if(next.owner_id!==owner||next.goal_id!==scenario.id)return false;const rows=list(),at=rows.findIndex(t=>t.id===previous.id&&t.owner_id===owner&&t.revision===previous.revision);if(at<0)return false;rows[at]=next;persist(rows);return true;}};
 const access={authorize:async(o,c)=>o===owner&&allowed.has(c),snapshot:async(o,c)=>{if(o!==owner){reads.denied++;throw Error('Foreign owner denied before source access');}if(!allowed.has(c)){reads.denied++;throw Error('Permission denied before source access');}reads.own++;return snapshot(c);}};
 const step=()=>advanceDirectorObjective({store,access,ownerId:owner,goalId:scenario.id,now,leaseId:fixtureLease()});
 const evidence=()=>({clock:now,authenticatedOwner:owner,availableCapabilities:[...allowed],rows:list(),verification:list().map(t=>({id:t.id,status:t.status,problem:t.status==='verified'?verifySpecialistResult(t.result,snapshot(t.capability),now):'No verified result'})),reads:{...reads},storage:'Actual private synthetic JSON AssignmentStore reload; not hosted isolation',modelGenerated:false});
 return {step,evidence,access,cancel:taskId=>cancelDirectorAssignment({store,ownerId:owner,goalId:scenario.id,taskId,now}),approve:plan=>{const rows=list();for(const s of plan.steps){if(rows.some(t=>t.capability===s.capability))throw Error("Duplicate checkpoint refused");const dependencies=s.dependsOn.map(c=>{const parent=rows.find(t=>t.capability===c);if(!parent)throw Error("Missing dependency");return parent.id;});rows.push(make(s.capability===health?"care-row":"cash-row",s.capability,"planned",dependencies));}persist(rows);},setClock:value=>{now=value;},setPay:value=>{amount=value;},deny:c=>allowed.delete(c),addCash:()=>{const rows=list();if(rows.some(t=>t.capability===money))throw Error('Duplicate cash checkpoint refused');rows.push(make('cash-row',money,'planned',['care-row']));persist(rows);}};
}
export async function dryRunFocusedScenario(scenario,path){
 const f=createFocusedFixture(path,scenario),events=[],initial=f.evidence();
 if(scenario.id==='folio-41'){
  events.push(await f.step()); // Active care lease prevents its expired dependent cash step.
  f.setClock('2026-10-17T18:01:30.000Z');events.push(await f.step());
 }else{if(scenario.id==='folio-55')f.deny(money);events.push(await f.step());if(scenario.id==='folio-55'){events.push(await f.step());await f.access.snapshot('different-synthetic-member',money).catch(()=>{});}}
 if(scenario.id==='folio-63'){f.deny(money);events.push(await f.step());}
 const afterFirst=f.evidence();
 if(scenario.id==='folio-17'){f.addCash();events.push(await f.step());}
 if(scenario.id==='folio-28'){f.setPay(2800);events.push(await f.step());events.push(await f.step());}
 if(scenario.id==='folio-41')events.push(await f.step());
 const afterSecond=f.evidence(),beforeRepeat=JSON.stringify(afterSecond.rows.map(t=>({id:t.id,attempts:t.attempts})));
 if(['folio-17','folio-28','folio-41'].includes(scenario.id))events.push(await f.step());
 const final=f.evidence();
 return {evidenceType:'DETERMINISTIC FIXTURE REHEARSAL ONLY; no model response, decision or competency score',initial,afterFirst,afterSecond,final,events,noDuplicateOnRepeat:beforeRepeat===JSON.stringify(final.rows.map(t=>({id:t.id,attempts:t.attempts}))),foreignSourceReads:final.reads.foreign};
}
