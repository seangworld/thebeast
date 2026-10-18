// Reuses the full local Supabase/Auth/Next fixture, production context loader, real API/RPC/runner.
// No OpenAI transport or credential. The caller controls paid authorization separately.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {request} from '@playwright/test';
import {directorAssignmentStore,directorAssignmentAccess,publicAssignments} from '../.test-dist/src/lib/directorAssignmentStore.js';
import {loadDirectorReasoningContext} from '../.test-dist/src/lib/directorReasoningContext.js';
import {finalCases} from './prepare-director-final.mjs';
const health='health.preparation-review',money='money.cash-review';
export async function createFinalLocalAdapter(scenarioId){
 const scenario=finalCases.find(s=>s.id===scenarioId);if(!scenario)throw Error('Unknown final case');
 const config=JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json'));assert.equal(config.API_URL,'http://127.0.0.1:54321');
 const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}}),cookies=[];
 const account={email:`avery-final-${randomUUID()}@example.invalid`,password:`Synthetic-${randomUUID()}!`};
 const created=await admin.auth.admin.createUser({...account,email_confirm:true});assert.equal(created.error,null);const user=created.data.user,ownerId=user.id;assert.match(ownerId,/^[a-f0-9-]{36}$/);
 const client=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){const i=cookies.findIndex(x=>x.name===c.name);if(i<0)cookies.push(c);else cookies[i]=c;}}}});assert.equal((await client.auth.signInWithPassword(account)).error,null);
 const sql=query=>execFileSync('docker',['exec','-i','supabase_db_thebeast','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8'});
 const incomeId=randomUUID(),appointmentId=randomUUID();
 sql(`update public.profiles set birthday='1980-01-01' where id='${ownerId}';
 insert into public.cash_settings(user_id,starting_balance,checking_buffer) values ('${ownerId}',1000,200);
 insert into public.income_events(id,user_id,name,amount,frequency,next_date,is_active) values ('${incomeId}','${ownerId}','Synthetic saved monthly pay',${scenarioId==='folio-28'?4800:3000},'monthly',current_date+5,true);
 insert into public.beast_health_records(id,owner_id,record_type,title,status,occurred_on,notes,details) values ('${appointmentId}','${ownerId}','appointment','Own appointment paperwork','active',current_date+10,'Transport paperwork has not yet been arranged.','{}');`);
 const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
 const goal=ok(await client.from('beast_goals').insert({owner_id:ownerId,title:scenario.objective,description:JSON.stringify(scenario.evidence),category:'Health',status:'Active'}).select('id,title,description,category,status,current_step,updated_at').single());
 const browserCookies=cookies.map(c=>({name:c.name,value:c.value,domain:'127.0.0.1',path:c.options?.path||'/',expires:-1,httpOnly:Boolean(c.options?.httpOnly),secure:false,sameSite:'Lax'}));
 const api=await request.newContext({baseURL:'http://127.0.0.1:3017',storageState:{cookies:browserCookies,origins:[]}});
 const post=async data=>{const r=await api.post('/api/director/assignments',{data:{goalId:goal.id,...data}});return{status:r.status(),payload:await r.json()};};
 const store=directorAssignmentStore(client),access=directorAssignmentAccess(client,user,goal.id,async()=>true),events=[];
 const freshGoal=async()=>ok(await client.from('beast_goals').select('id,title,description,category,status,current_step,updated_at').eq('id',goal.id).single());
 const setPermission=(module,enabled)=>sql(`insert into public.beast_admin_member_module_access(member_id,module_id,enabled,updated_by) values ('${ownerId}','${module}',${enabled},'${ownerId}') on conflict(member_id,module_id) do update set enabled=${enabled};`);
 if(scenarioId==='folio-41'){
  ok(await client.rpc('approve_director_scoped_plan',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at,p_steps:[{capability:health,dependsOn:[]},{capability:money,dependsOn:[health]}]}));
  ok(await client.from('beast_director_assignments').update({status:'running',attempts:1,lease_id:randomUUID(),lease_until:new Date(Date.now()+3600_000).toISOString()}).eq('goal_id',goal.id).eq('capability',health));
  ok(await client.from('beast_director_assignments').update({status:'running',attempts:2,lease_id:randomUUID(),lease_until:'2000-01-01T00:00:00Z'}).eq('goal_id',goal.id).eq('capability',money));
 }
 async function advanceApproved(turn){
  const outcomes=[],limit=scenarioId==='folio-63'||scenarioId==='folio-41'||scenarioId==='folio-17'?1:2;
  for(let i=0;i<limit;i++){const result=await post({action:'resume'});outcomes.push(result);if(result.status!==200||!['verified','needs_correction'].includes(result.payload.outcome?.state))break;}
  events.push({kind:'actual_authorized_foreground_runner',turn,outcomes});return outcomes;
 }
 return {
  environment:'synthetic-local-postgres',ownerId,
  async beforeTurn(turn,previous){
   if(scenarioId==='folio-41'&&turn===2){ok(await client.from('beast_director_assignments').update({lease_until:'2000-01-01T00:00:00Z'}).eq('goal_id',goal.id).eq('capability',health));events.push({kind:'synthetic_clock_equivalent_lease_expiration',modelDecision:false});}
   if(scenarioId==='folio-41'&&turn===3&&previous?.plan?.assessments.some(a=>a.disposition==='resume_existing')){await advanceApproved(turn);events.push({kind:'queued_duplicate_continue',result:await post({action:'resume'})});}
   if(scenarioId==='folio-28'&&turn===3){sql(`update public.income_events set amount=2800 where id='${incomeId}' and user_id='${ownerId}';`);events.push({kind:'explicit_owner_source_correction',amount:2800});if(previous?.plan?.assessments.some(a=>a.disposition==='request_correction'))await advanceApproved(turn);}
   if(scenarioId==='folio-63'&&turn===2){events.push({kind:'current_owner_cancellation_v2',result:await post({action:'cancel'})});events.push({kind:'stale_queued_v1_continue',result:await post({action:'resume'})});}
  },
  async context(turn){
   const tasks=await publicAssignments(store,access,ownerId,goal.id);
   const selection=tasks.filter(t=>t.status==='verified'&&t.result).map(t=>({taskId:t.id,recordIds:[t.capability===health?appointmentId:incomeId]}));
   // Predefined explicit synthetic owner selections, not hidden engineering/model assistance.
   return loadDirectorReasoningContext({client,user,goal:await freshGoal(),store,access},selection,scenario.memberMessages[String(turn)]);
  },
  async ownerApprove(plan,caps,turn){
   const permitted=scenarioId==='folio-17'?(turn===1?[health]:[money]):['folio-28','folio-76'].includes(scenarioId)?[money]:scenarioId==='folio-41'?[]:[health,money];
   if(caps.some(c=>!permitted.includes(c)))return{approved:false,reason:'Proposed steps exceed current scenario owner approval scope; no substitute plan inserted'};
   const conversationId=`director-objective-${goal.id}`,proposalId=randomUUID(),context=await this.context(turn);
   ok(await client.from('agent_conversations').upsert({id:conversationId,owner_id:ownerId,agent_id:'beastfusion.fusion-director',title:goal.title.slice(0,80)},{onConflict:'id',ignoreDuplicates:true}));
   ok(await client.from('agent_conversation_messages').insert({id:proposalId,owner_id:ownerId,conversation_id:conversationId,sender:{kind:'agent',id:'beastfusion.fusion-director'},recipient:{kind:'user',id:ownerId},content:{text:plan.interpretation,directorPlan:{version:2,plan,context}}}));
   const result=await post({action:'approve_reasoned_plan',proposalId});
   if(scenarioId==='folio-55'){setPermission('money',false);events.push({kind:'owner_revoked_money_before_execution'});}
   return{approved:result.status===200,kind:'explicit_synthetic_owner_approval_via_real_cookie_API',...result};
  },
  advanceApproved,
  async evidence(){return{events:structuredClone(events),assignments:await publicAssignments(store,access,ownerId,goal.id),goalStatus:ok(await client.from('beast_goals').select('status').eq('id',goal.id).single()).status,toolEvidenceGeneratedByDeterministicRunner:true};},
  async close(){await api.dispose();}
 };
}
