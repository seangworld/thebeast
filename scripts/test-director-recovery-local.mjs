// Real local GoTrue/RLS/Next API/SQL integration; synthetic records, no AI inference.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { request } from '@playwright/test';
const config=JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json','utf8'));
const fixture=JSON.parse(readFileSync('/private/tmp/avery-local-fixture.json','utf8'));
assert.equal(config.API_URL,'http://127.0.0.1:54321');
const member=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
assert.equal((await member.auth.signInWithPassword(fixture.accounts[0])).error,null);
const storageState=JSON.parse(readFileSync('/private/tmp/avery-local-browser-state.json','utf8'));
storageState.cookies=storageState.cookies.map(cookie=>({...cookie,expires:cookie.expires??-1}));
const api=await request.newContext({baseURL:'http://127.0.0.1:3017',storageState});
const post=(goalId,action,assignmentId)=>api.post('/api/director/assignments',{data:{goalId,action,assignmentId}});
try {
 const goal=await member.from('beast_goals').insert({owner_id:fixture.accounts[0].id,title:'Synthetic interrupted budget preparation',category:'Money',status:'Active'}).select('id').single();assert.equal(goal.error,null);
 assert.equal((await member.rpc('plan_director_reviews',{p_goal_id:goal.data.id,p_capabilities:['money.cash-review']})).error,null);
 const fetchTask=async()=>{const r=await member.from('beast_director_assignments').select('*').eq('goal_id',goal.data.id).single();assert.equal(r.error,null);return r.data};
 let task=await fetchTask();const id=task.id;const priorEvents=task.events;
 assert.equal((await member.from('beast_director_assignments').update({status:'running',attempts:3,lease_id:randomUUID(),lease_until:'2000-01-01T00:00:00Z'}).eq('id',id)).error,null);
 assert.equal((await post(goal.data.id,'resume')).status(),200);task=await fetchTask();
 assert.equal(task.status,'blocked');assert.equal(task.attempts,3);assert.equal(task.id,id);assert.deepEqual(task.events.slice(0,priorEvents.length),priorEvents);
 assert.equal((await post(goal.data.id,'correction',id)).status(),200);task=await fetchTask();assert.equal(task.attempts,0);assert.equal(task.id,id);
 assert.equal((await post(goal.data.id,'supervise')).status(),200);task=await fetchTask();assert.equal(task.status,'verified');assert.equal(task.attempts,1);
 const eventsAfter=task.events;assert.equal((await post(goal.data.id,'supervise')).status(),200);task=await fetchTask();assert.deepEqual(task.events,eventsAfter);assert.equal(task.attempts,1);
 assert.equal((await member.from('beast_goals').select('status').eq('id',goal.data.id).single()).data.status,'Active');
 assert.equal((await post(fixture.goalIds[1],'resume')).status(),404,'foreign goal cannot use recovery');
 const disabled=await post(goal.data.id,'reason');assert.equal(disabled.status(),503,'model path stays disabled with zero paid calls');
 // Simulate a genuinely live independent run; no reset/racing or silent retry allowed.
 assert.equal((await member.from('beast_director_assignments').update({status:'running',result:null,attempts:1,lease_id:randomUUID(),lease_until:'2099-01-01T00:00:00Z'}).eq('id',id)).error,null);
 assert.equal((await post(goal.data.id,'resume')).status(),200);assert.equal((await fetchTask()).attempts,1);
 assert.equal((await post(goal.data.id,'correction',id)).status(),503);assert.equal((await fetchTask()).status,'running');
 console.log('PASS: real local auth/RLS/API/database exhausted-lease recovery -> explicit same-checkpoint correction -> actual specialist recomputation -> retained history -> repeat without duplication; live lease, foreign goal and disabled AI boundaries preserved. Paid calls: 0.');
} finally {await api.dispose();}
