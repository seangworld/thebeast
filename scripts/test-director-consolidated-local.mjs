// Real local GoTrue, cookies, Next API, PostgreSQL/RLS. No model transport or credential access.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {request,chromium} from '@playwright/test';
import {directorAssignmentAccess,directorAssignmentStore} from '../.test-dist/src/lib/directorAssignmentStore.js';
import {sharedDirectorEvidence} from '../.test-dist/src/lib/directorEvidenceAccess.js';
const config=JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json')),fixture=JSON.parse(readFileSync('/private/tmp/avery-local-fixture.json'));
assert.equal(config.API_URL,'http://127.0.0.1:54321');
const a=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
assert.equal((await a.auth.signInWithPassword(fixture.accounts[0])).error,null);
const owner=fixture.accounts[0].id;
assert.match(owner,/^[a-f0-9-]{36}$/);
const sql=query=>execFileSync('docker',['exec','-i','supabase_db_thebeast','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8'});
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const goal=ok(await a.from('beast_goals').insert({owner_id:owner,title:'Synthetic conditional transport and income evidence',category:'Health',status:'Active'}).select('*').single());
const appointment={id:crypto.randomUUID()}; const appointmentTitle=`Synthetic transport logistics ${appointment.id}`;
sql(`insert into public.beast_health_records(id,owner_id,record_type,title,status,occurred_on,notes,details) values ('${appointment.id}','${owner}','appointment','${appointmentTitle}','active','2026-10-20','Transport paperwork remains outstanding.','{"context":"Owner-selected logistics"}');`);
ok(await a.rpc('approve_director_scoped_plan',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at,p_steps:[{capability:'health.preparation-review',dependsOn:[]},{capability:'money.cash-review',dependsOn:['health.preparation-review']}]}));
const state=JSON.parse(readFileSync('/private/tmp/avery-local-browser-state.json'));state.cookies=state.cookies.map(c=>({...c,expires:c.expires??-1}));
const api=await request.newContext({baseURL:'http://127.0.0.1:3017',storageState:state}),anon=await request.newContext({baseURL:'http://127.0.0.1:3017'});
const post=action=>api.post('/api/director/assignments',{data:{action,goalId:goal.id}});
const results=[];
try{
 assert.equal((await anon.get('/api/director/assignments?goalId='+goal.id)).status(),401);
 assert.equal((await api.post('/api/director/assignments',{data:{action:'cancel',goalId:fixture.goalIds[1]}})).status(),404);
 assert.equal((await post('resume')).status(),200);
 let rows=ok(await a.from('beast_director_assignments').select('*').eq('goal_id',goal.id));const care=rows.find(t=>t.capability==='health.preparation-review'),cash=rows.find(t=>t.capability==='money.cash-review');
 assert.equal(care.status,'verified');assert.equal(cash.attempts,0);
 const access=directorAssignmentAccess(a,{id:owner},goal.id,async()=>true),store=directorAssignmentStore(a);
 const selection=[{taskId:care.id,recordIds:[appointment.id]}];
 const evidence=await sharedDirectorEvidence(store,access,owner,goal.id,selection);
 assert.equal(evidence.findings[0].records[0].notes,'Transport paperwork remains outstanding.');
 assert.doesNotMatch(JSON.stringify(evidence),/Synthetic medication|owner_id|snapshot/);
 const get=await api.get('/api/director/assignments?goalId='+goal.id);assert.equal(get.status(),200);const payload=await get.json();assert.ok(payload.evidenceOptions.some(o=>o.records.some(r=>r.id===appointment.id)));
 results.push({check:'actual verified owner-selected evidence with provenance',pass:true,evidence});
 // Real browser displays explicit opt-in; no AI model is enabled.
 const browser=await chromium.launch();try{const context=await browser.newContext({storageState:'/private/tmp/avery-local-browser-state.json',viewport:{width:390,height:844}}),page=await context.newPage();await page.goto('http://127.0.0.1:3017/dashboard/director');const skip=page.getByRole('button',{name:'Skip',exact:true});try{await skip.waitFor({timeout:4000});await skip.click();}catch(e){if(e.name!=='TimeoutError')throw e;}await page.getByText('Supervised objectives · saved-record reviews',{exact:true}).click();await page.getByLabel('Saved objective',{exact:true}).selectOption(goal.id);const checkbox=page.getByRole('checkbox',{name:appointmentTitle,exact:true});await checkbox.waitFor();assert.equal(await checkbox.isChecked(),false);await checkbox.check();assert.equal(await checkbox.isChecked(),true);assert.equal(await page.getByRole('button',{name:'Ask Avery to plan or review',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/private/tmp/avery-consolidated-evidence.png',fullPage:true});await context.close();}finally{await browser.close();}
 sql(`insert into public.beast_admin_member_module_access(member_id,module_id,enabled,updated_by) values ('${owner}','money',false,'${owner}') on conflict(member_id,module_id) do update set enabled=false;`);
 assert.equal(ok(await a.from('beast_director_assignments').select('id').eq('id',cash.id)).length,0);
 assert.equal((await post('cancel')).status(),200,'cancellation works while money is hidden by module RLS');
 assert.deepEqual(ok(await a.from('beast_director_assignments').select('*').eq('id',care.id).single()),care,'verified care/history retained');
 sql(`update public.beast_admin_member_module_access set enabled=true where member_id='${owner}' and module_id='money';`);
 assert.equal((await post('resume')).status(),409);assert.equal((await post('correction')).status(),409);assert.equal((await post('plan')).status(),409);
 const stale=await a.from('beast_director_assignments').update({status:'running',revision:cash.revision+1,lease_id:crypto.randomUUID(),lease_until:'2099-01-01T00:00:00Z'}).eq('id',cash.id);assert.equal(stale.error?.code,'PT409','SQL fences direct stale recovery after permission restoration');
 const late=await a.from('beast_director_assignments').update({status:'verified',result:care.result}).eq('id',cash.id);assert.equal(late.error?.code,'PT409','late result cannot certify cancelled work');
 assert.equal(ok(await a.from('beast_director_assignments').select('attempts,result').eq('id',cash.id).single()).attempts,0);
 assert.ok((await a.from('beast_director_cancellations').delete().eq('goal_id',goal.id)).error,'deny-only cancellation cannot be removed by member');
 const b=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});ok(await b.auth.signInWithPassword(fixture.accounts[1]));assert.equal(ok(await b.from('beast_director_cancellations').select('*').eq('goal_id',goal.id)).length,0);assert.ok((await b.rpc('record_director_cancellation',{p_goal_id:goal.id,p_goal_updated_at:goal.updated_at})).error);
 results.push({check:'revoked hidden work cancellation + permission restoration + stale/late results + foreign denial',pass:true,remainingAttempts:0,verifiedCarePreserved:true});
 sql(`insert into public.beast_admin_member_module_access(member_id,module_id,enabled,updated_by) values ('${owner}','health',false,'${owner}') on conflict(member_id,module_id) do update set enabled=false;`);
 await assert.rejects(sharedDirectorEvidence(store,access,owner,goal.id,selection),/unavailable|permitted/);
 sql(`update public.beast_admin_member_module_access set enabled=true where member_id='${owner}' and module_id='health';`);
 results.push({check:'evidence revoked after selection fails closed',pass:true});
 console.log('PASS consolidated real local auth/cookie/API/evidence/permission/cancellation/SQL/tenant checks; no paid calls.');
 writeFileSync('/private/tmp/avery-consolidated-local-results.json',JSON.stringify({paidCalls:0,syntheticOnly:true,realGoTrue:true,realBrowserCookies:true,results},null,2)+'\n');
}finally{await api.dispose();await anon.dispose();}
