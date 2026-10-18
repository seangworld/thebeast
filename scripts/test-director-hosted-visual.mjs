// Supplement hosted Director integration with settled module views; no model actions.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {chromium} from '@playwright/test';
const cfg=JSON.parse(readFileSync('/private/tmp/avery-hosted-dev-config.json')),fixture=JSON.parse(readFileSync('/private/tmp/avery-hosted-fixture.json'));
assert.equal(cfg.project,'zvzcojwjgnedrouilovc');assert.equal(fixture.project,cfg.project);
const origin=readFileSync('/private/tmp/avery-integration-redeploy-url.txt','utf8').trim();assert.match(origin,/^https:\/\/thebeast-[a-z0-9]+-seangworld-3898s-projects\.vercel\.app$/);
const token=process.env.VERCEL_OIDC_TOKEN;assert.ok(token);
const cookies=[],client=createServerClient(cfg.url,cfg.publicKey,{cookies:{getAll:()=>[],setAll:c=>cookies.push(...c)}});
assert.equal((await client.auth.signInWithPassword(fixture.accounts[0])).error,null);
const browser=await chromium.launch(),results=[];
try{
 for(const width of [1440,375]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',storageState:{cookies:cookies.map(({name,value,options})=>({name,value,domain:new URL(origin).hostname,path:options.path||'/',httpOnly:Boolean(options.httpOnly),secure:true,sameSite:'Lax',expires:-1})),origins:[]}});
  const page=await ctx.newPage();await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname.endsWith('.supabase.co'))assert.equal(u.hostname,'zvzcojwjgnedrouilovc.supabase.co');await route.continue(u.origin===origin?{headers:{...route.request().headers(),'x-vercel-trusted-oidc-idp-token':token}}:{});});
  for(const module of ['money','health']){await page.goto(origin+'/dashboard/'+module,{waitUntil:'networkidle'});await page.getByText('Opening your dashboard...',{exact:true}).waitFor({state:'hidden',timeout:60000});await page.waitForTimeout(1200);const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.isVisible())await skip.click();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const text=await page.locator('body').innerText();assert.doesNotMatch(text,/Your financial records could not be loaded|Dashboard unavailable/);await page.screenshot({path:`/private/tmp/avery-hosted-evidence/${module}-${width}-settled.png`});results.push({module,width,status:'pass',noOverflow:true,noDataLoadError:true});}
  await ctx.close();
 }
 const keys=JSON.parse(readFileSync('/private/tmp/avery-hosted-dev-api-keys.json')),key=keys.find(k=>k.name==='service_role').api_key;assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).ref,cfg.project);
 const admin=createClient(cfg.url,key,{auth:{persistSession:false}}),actors=fixture.accounts.map(a=>a.id);
 const goals=await admin.from('beast_goals').select('id,title,status,owner_id').in('owner_id',actors);assert.equal(goals.error,null);
 const assignments=await admin.from('beast_director_assignments').select('id,goal_id,capability,status,attempts,revision,dependencies,events,result').in('owner_id',actors);assert.equal(assignments.error,null);
 const cancellations=await admin.from('beast_director_cancellations').select('goal_id,cancelled_at').in('owner_id',actors);assert.equal(cancellations.error,null);
 writeFileSync('/private/tmp/avery-hosted-checkpoints.json',JSON.stringify({provenance:'Actual hosted DEV PostgreSQL, only newly created synthetic accounts, sanitized projection',goals:goals.data.map(({id,title,status,owner_id})=>({id,title,status,actor:fixture.accounts.findIndex(a=>a.id===owner_id)})),assignments:assignments.data.map(t=>({id:t.id,goalId:t.goal_id,capability:t.capability,status:t.status,attempts:t.attempts,revision:t.revision,dependencies:t.dependencies,history:t.events,hasResult:Boolean(t.result),resultAsOf:t.result?.asOf,monthlyIncome:t.result?.output?.monthlyIncome,specialist:t.result?.specialist,limitations:t.result?.limitations})),cancellations:cancellations.data},null,2));
 writeFileSync('/private/tmp/avery-hosted-module-visual.json',JSON.stringify(results,null,2));console.log('PASS settled hosted Money/Health desktop and mobile views; actual synthetic checkpoint evidence captured.');
}finally{await browser.close();await client.auth.signOut();}
