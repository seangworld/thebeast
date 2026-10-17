// Explicit synthetic MODEL adapter; real auth, API, approval, database and tools.
// This file tests integration, not AI reasoning competence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
const config=JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json','utf8'));
const fixture=JSON.parse(readFileSync('/private/tmp/avery-local-fixture.json','utf8'));
assert.equal(config.API_URL,'http://127.0.0.1:54321');
const client=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(15000)})}});
assert.equal((await client.auth.signInWithPassword(fixture.accounts[0])).error,null);
console.log('Local authentication verified');
const created=await client.from('beast_goals').insert({owner_id:fixture.accounts[0].id,title:'Synthetic model-adapter plan integration',category:'Health',status:'Active'}).select('id,title,description,category,status,current_step,updated_at').single();
assert.equal(created.error,null);
console.log('Synthetic objective saved');
const goal=created.data;
const stale=await client.rpc('approve_director_review_plan',{p_goal_id:goal.id,p_goal_updated_at:'2000-01-01T00:00:00Z',p_capabilities:['money.cash-review']});
assert.equal(stale.error?.code,'PT409','database rejects an outdated objective version atomically');
console.log('Stale objective version rejected');
const plan={interpretation:'Synthetic adapter: prepare current care records, then calculate the saved cash position.',steps:[{capability:'health.preparation-review',purpose:'Prepare existing care records',acceptance:'Recompute current preparation model'},{capability:'money.cash-review',purpose:'Review saved cash',acceptance:'Recompute canonical cash calculation'}],alternatives:['Defer unsupported moving decisions until the reviews are available.'],contradictions:[],missingInformation:[],ownerDecisions:[],unsupportedWork:['No booking, payment or publication is performed.'],assessments:[],planningNotes:['Compare scheduling preferences later; the saved-record reviews can proceed.'],evidenceClaims:[]};
const evidence={goal,availableCapabilities:['money.cash-review','health.preparation-review'],checkpoints:[]};
const conversationId=`director-objective-${goal.id}`,proposalId=randomUUID();
assert.equal((await client.from('agent_conversations').insert({id:conversationId,owner_id:fixture.accounts[0].id,agent_id:'beastfusion.fusion-director',title:goal.title})).error,null);
assert.equal((await client.from('agent_conversation_messages').insert({id:proposalId,owner_id:fixture.accounts[0].id,conversation_id:conversationId,sender:{kind:'agent',id:'beastfusion.fusion-director'},recipient:{kind:'user',id:fixture.accounts[0].id},content:{text:'Synthetic model adapter only',directorPlan:{version:1,plan,context:evidence}}})).error,null);
const browser=await chromium.launch();
console.log('Synthetic proposal persisted; opening browser');
try {
  const context=await browser.newContext({storageState:'/private/tmp/avery-local-browser-state.json',viewport:{width:1440,height:900}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3017/dashboard/director',{waitUntil:'networkidle'});
  const skip=page.getByRole('button',{name:'Skip',exact:true});
  try { await skip.waitFor({state:'visible',timeout:5000}); await skip.click(); } catch(error) { if(error.name!=='TimeoutError')throw error; }
  await page.getByText('Supervised objectives · saved-record reviews',{exact:true}).click();
  await page.getByLabel('Saved objective',{exact:true}).selectOption(goal.id);
  await page.getByText('Proposed plan · not executed',{exact:true}).waitFor();
  await page.getByText('Planning notes · not execution blockers',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Authorize supported steps',exact:true}).isEnabled(),true,'routine planning notes do not create another approval blocker');
  const approval=page.waitForResponse(r=>r.url().endsWith('/api/director/assignments')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Authorize supported steps',exact:true}).click();
  assert.equal((await approval).status(),200);
  const again=await context.request.post('http://127.0.0.1:3017/api/director/assignments',{data:{action:'approve_reasoned_plan',goalId:goal.id,proposalId,approved:true,capabilities:['publish']}});
  assert.equal(again.status(),409,'repeated stale approval cannot duplicate or expand work');
  await page.getByRole('button',{name:'Run approved checkpoints',exact:true}).click();
  await page.getByText('2 of 2 saved-record checkpoints verified',{exact:true}).waitFor();
  const tasks=await client.from('beast_director_assignments').select('status,attempts').eq('goal_id',goal.id);
  assert.equal(tasks.data.length,2);assert.ok(tasks.data.every(t=>t.status==='verified'&&t.attempts===1));
  assert.equal((await client.from('beast_goals').select('status').eq('id',goal.id).single()).data.status,'Active');
  assert.equal((await client.from('agent_conversations').select('message_count').eq('id',conversationId).single()).data.message_count,2);
  await context.close();
} finally { await browser.close(); }
console.log('PASS: synthetic model proposal -> persisted conversation -> real authenticated UI approval -> version-locked transaction -> two actual specialist tools -> independently verified evidence. Repeated stale approval rejected; history retained; life goal stays Active. No real-model competence claim or paid call.');
