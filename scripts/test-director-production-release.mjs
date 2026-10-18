// Owner-authorized production release smoke only. No model inference; synthetic records only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {chromium,request} from '@playwright/test';
import {directorAssignmentStore,directorAssignmentAccess} from '../.test-dist/src/lib/directorAssignmentStore.js';
import {loadDirectorReasoningContext} from '../.test-dist/src/lib/directorReasoningContext.js';
const project='grpyzwvgqiwtxadfdtni',url=`https://${project}.supabase.co`,origin='https://thebeast.seangworld.com';
const keys=JSON.parse(readFileSync('/private/tmp/avery-production-api-keys-private.json'));
const service=keys.find(k=>k.name==='service_role').api_key,publicKey=keys.find(k=>k.name==='anon').api_key;
assert.equal(JSON.parse(Buffer.from(service.split('.')[1],'base64url')).ref,project);
const admin=createClient(url,service,{auth:{persistSession:false}}),ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data};
const events=[],evidenceDir='/private/tmp/avery-production-evidence';mkdirSync(evidenceDir,{recursive:true,mode:0o700});
const check=(name,detail={})=>{events.push({name,status:'pass',...detail});console.log('PASS',name)};
let actor,client,api,browser,fixture;
try{
 const email=`avery-release-${Date.now()}@test.seangworld.com`,password=randomUUID()+randomUUID();
 actor=ok(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Synthetic Avery Release Verification'}})).user;
 fixture={project,id:actor.id,email,password};writeFileSync('/private/tmp/avery-production-fixture-private.json',JSON.stringify(fixture),{mode:0o600});
 ok(await admin.from('profiles').update({birthday:'1990-01-01'}).eq('id',actor.id));
 const cookies=[];client=createServerClient(url,publicKey,{cookies:{getAll:()=>[],setAll:c=>cookies.push(...c)}});
 ok(await client.auth.signInWithPassword({email,password}));assert.equal(ok(await client.auth.getUser()).user.id,actor.id);
 const storageState={cookies:cookies.map(({name,value,options})=>({name,value,domain:new URL(origin).hostname,path:options.path||'/',httpOnly:Boolean(options.httpOnly),secure:true,sameSite:'Lax',expires:-1})),origins:[]};
 api=await request.newContext({baseURL:origin,storageState});const anon=await request.newContext({baseURL:origin});
 assert.equal((await anon.get('/api/director/assignments',{maxRedirects:0})).status(),401);await anon.dispose();
 const ready=await api.get('/api/director/assignments');assert.equal(ready.status(),200);const cfg=await ready.json();assert.equal(cfg.reasoningAvailable,true);assert.equal(cfg.modelConfiguration.model,'gpt-6.1-sol');assert.equal(cfg.modelConfiguration.reasoningEffort,'high');assert.equal(cfg.modelConfiguration.version,'sol-high-v1');
 check('production GoTrue authentication, anonymous denial and Sol High activation',{modelConfiguration:cfg.modelConfiguration,reasoningAvailable:cfg.reasoningAvailable});
 const owner=actor.id;const health='health.preparation-review',money='money.cash-review';
 ok(await client.from('beast_health_records').insert({owner_id:owner,record_type:'appointment',title:'Synthetic release verification appointment',status:'active',details:{context:'Synthetic release smoke; no clinical advice.'},notes:'Synthetic only. No booking or real-world action.'}));
 ok(await client.from('income_events').insert({user_id:owner,name:'Synthetic release monthly salary',amount:2800,frequency:'monthly',next_date:'2026-11-01',is_active:true}));
 ok(await client.from('cash_settings').upsert({user_id:owner,starting_balance:1000,checking_buffer:200},{onConflict:'user_id'}));
 const goal=ok(await client.from('beast_goals').insert({owner_id:owner,title:'Synthetic Avery production release verification',category:'Health',status:'Active'}).select('id,title,description,category,status,current_step,updated_at').single());
 const tasks=async()=>ok(await client.from('beast_director_assignments').select('*').eq('goal_id',goal.id));
 const context=await loadDirectorReasoningContext({client,user:{id:owner},goal,store:directorAssignmentStore(client),access:directorAssignmentAccess(client,{id:owner},goal.id,async()=>true)},[]);
 const plan={contractVersion:2,requirements:[],interpretation:'Authored synthetic release fixture; no AI inference. Review permitted saved Health records before saved Money records.',steps:[{capability:health,purpose:'Review synthetic saved appointment records',acceptance:'Verify saved-record preparation model',dependsOn:[]},{capability:money,purpose:'Review synthetic saved income',acceptance:'Verify canonical cash calculation',dependsOn:[health]}],alternatives:[],contradictions:[],missingInformation:[],ownerDecisions:[],unsupportedWork:['No booking, payment or external actions.'],assessments:[],planningNotes:[],evidenceClaims:[]};
 const cid=`director-objective-${goal.id}`,pid=randomUUID();
 ok(await client.from('agent_conversations').insert({id:cid,owner_id:owner,agent_id:'beastfusion.fusion-director',title:goal.title}));
 ok(await client.from('agent_conversation_messages').insert({id:pid,owner_id:owner,conversation_id:cid,sender:{kind:'agent',id:'beastfusion.fusion-director'},recipient:{kind:'user',id:owner},content:{text:'Authored synthetic release fixture. No model inference.',directorPlan:{version:2,plan,context}}}));
 browser=await chromium.launch();const bc=await browser.newContext({viewport:{width:1440,height:900},storageState,reducedMotion:'reduce'});const page=await bc.newPage(),hosts=new Set(),errors=[];let blockedInference=0;
 await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.hostname.endsWith('.supabase.co')){assert.equal(u.hostname,project+'.supabase.co');hosts.add(u.hostname)}if(u.hostname.endsWith('openai.com')){blockedInference++;return route.abort()}if(u.pathname==='/api/director/assignments'&&r.method()==='POST'&&r.postDataJSON()?.action==='reason'){blockedInference++;return route.abort()}return route.continue()});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/dashboard/director',{waitUntil:'networkidle'});await page.getByText('Supervised objectives · saved-record reviews',{exact:true}).waitFor({timeout:60000});
 const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.isVisible())await skip.click();
 await page.getByText('Supervised objectives · saved-record reviews',{exact:true}).click();await page.getByLabel('Saved objective',{exact:true}).selectOption(goal.id);await page.getByText('Proposed plan · not executed',{exact:true}).waitFor();
 const approval=page.waitForResponse(r=>r.url()===origin+'/api/director/assignments'&&r.request().method()==='POST');await page.getByRole('button',{name:'Authorize supported steps',exact:true}).click();assert.equal((await approval).status(),200);
 let rows=await tasks();assert.equal(rows.length,2);assert.ok(rows.every(t=>t.attempts===0));assert.equal(rows.find(t=>t.capability===money).dependencies[0],rows.find(t=>t.capability===health).id);
 const post=async action=>{assert.notEqual(action,'reason');const start=Date.now(),r=await api.post('/api/director/assignments',{data:{goalId:goal.id,action},timeout:60000});const b=await r.json();return {status:r.status(),body:b,latencyMs:Date.now()-start}};
 const first=await post('resume');assert.equal(first.status,200);rows=await tasks();assert.equal(rows.find(t=>t.capability===health).status,'verified');assert.equal(rows.find(t=>t.capability===money).attempts,0);
 const second=await post('resume');assert.equal(second.status,200);rows=await tasks();assert.ok(rows.every(t=>t.status==='verified'&&t.attempts===1));assert.equal(rows.find(t=>t.capability===money).result.output.monthlyIncome,2800);
 assert.equal((await post('supervise')).status,200);assert.ok((await tasks()).every(t=>t.attempts===1));assert.equal(ok(await client.from('beast_goals').select('status').eq('id',goal.id).single()).status,'Active');
 check('explicit browser approval, ordered saved-record execution, duplicate prevention and accurate unfinished goal',{latencyMs:[first.latencyMs,second.latencyMs],checkpoints:rows.map(t=>({capability:t.capability,status:t.status,attempts:t.attempts,revision:t.revision,hasResult:Boolean(t.result)}))});
 assert.equal((await api.post('/api/director/assignments',{data:{goalId:randomUUID(),action:'resume'}})).status(),404);
 const escalation=await client.from('profiles').update({role:'admin'}).eq('id',owner);assert.ok(escalation.error);check('foreign objective denied and owner-only role escalation prevented');
 for(const width of [1440,375]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/dashboard/director',{waitUntil:'networkidle'});await page.getByText('Supervised objectives · saved-record reviews',{exact:true}).click();await page.getByLabel('Saved objective',{exact:true}).selectOption(goal.id);await page.getByText('2 of 2 saved-record checkpoints verified',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:evidenceDir+`/director-${width}.png`,fullPage:true});
  for(const module of ['money','health']){await page.goto(origin+'/dashboard/'+module,{waitUntil:'networkidle'});await page.getByText('Opening your dashboard...',{exact:true}).waitFor({state:'hidden',timeout:60000});await page.waitForTimeout(1200);const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.isVisible())await skip.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.doesNotMatch(await page.locator('body').innerText(),/Your financial records could not be loaded|Dashboard unavailable/);await page.screenshot({path:evidenceDir+`/${module}-${width}.png`});}
 }
 assert.deepEqual(errors,[]);assert.equal(blockedInference,0);check('production Director/Money/Health desktop and mobile',{widths:[1440,375],supabaseHosts:[...hosts],pageErrors:errors,modelCalls:0});
 const cancellation=await post('cancel');assert.equal(cancellation.status,200);assert.equal((await post('resume')).status,409);check('production cancellation intent fences subsequent execution');
 await bc.close();
}finally{
 if(browser)await browser.close();if(api)await api.dispose();
 if(actor){
  if(client)ok(await client.auth.signOut({scope:'global'}));
  ok(await admin.auth.admin.updateUserById(actor.id,{ban_duration:'876000h'}));
  ok(await admin.from('beast_goals').update({status:'Archived',archived_at:new Date().toISOString()}).eq('owner_id',actor.id));
  for(const module_id of ['money','health'])ok(await admin.from('beast_admin_member_module_access').upsert({member_id:actor.id,module_id,enabled:false,updated_by:actor.id},{onConflict:'member_id,module_id'}));
  const denied=createClient(url,publicKey,{auth:{persistSession:false}});assert.ok((await denied.auth.signInWithPassword({email:fixture.email,password:fixture.password})).error);
  check('synthetic session revoked, login banned, goals archived and modules disabled; immutable audit retained');
 }
 writeFileSync(evidenceDir+'/results.json',JSON.stringify({project,origin,paidModelCalls:0,provenance:'Production smoke with one new synthetic account only; authored plan fixture, not AI competency evidence',events},null,2)+'\n',{mode:0o600});
}
