import test from 'node:test';
import assert from 'node:assert/strict';
import {COLE_DAILY,nyDay,nyMonth,nyHour,nextPostingTime,dayAtHour,requestQuote,usageCost,dailyCreative} from '../src/lib/agencyDaily';
import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
test('New York daily/month keys and 6 PM target follow DST and month boundaries',()=>{
 assert.equal(nyDay(new Date('2026-11-01T03:59:00Z')),'2026-10-31');assert.equal(nyMonth(new Date('2026-11-01T03:59:00Z')),'2026-10');
 assert.equal(dayAtHour('2026-10-31',18),'2026-10-31T22:00:00.000Z');assert.equal(dayAtHour('2026-11-01',18),'2026-11-01T23:00:00.000Z');
 assert.equal(dayAtHour('2027-03-14',18),'2027-03-14T22:00:00.000Z');assert.equal(nyHour(new Date('2026-11-01T11:00:00Z')),6);
 assert.equal(nextPostingTime(new Date('2026-10-31T22:00:01Z')),'2026-11-01T23:00:00.000Z');
 assert.equal(nextPostingTime(new Date('2026-12-31T23:01:00Z')),'2027-01-01T23:00:00.000Z');
});
test('uncertain maximum and stale pricing hold before dispatch; usage requires exact integer accounting',()=>{
 assert.equal(COLE_DAILY.monthlyLimitMicros,10000000);assert.equal(COLE_DAILY.mode,'approval_required');
 assert.throws(()=>requestQuote(new Date('2026-10-25')),/request_cost_bound_unverified/);assert.throws(()=>requestQuote(new Date('2026-11-25')),/pricing_review_required/);
 const usage={input_tokens:110,input_tokens_details:{text_tokens:10,image_tokens:100},output_tokens:200,output_tokens_details:{image_tokens:200,text_tokens:0}};
 assert.equal(usageCost(usage),6850);for(const u of [null,{}, {...usage,input_tokens:109},{...usage,output_tokens:201},{...usage,input_tokens_details:{text_tokens:-1,image_tokens:111}}])assert.throws(()=>usageCost(u),/usage_unverified/);
});
test('rotation uses only approved tattoo-free fictional appearance; no public image or boilerplate caption',()=>{
 const days=['2026-10-25','2026-10-26','2026-10-27'].map(dailyCreative);assert.equal(new Set(days.map(x=>x.theme)).size,3);
 for(const c of days){assert.match(c.prompt,/exact face/);assert.match(c.prompt,/6 feet 1 inch/);assert.match(c.prompt,/NO tattoos/);assert.doesNotMatch(c.prompt,/Pinterest|https?:/);assert.doesNotMatch(c.caption,/AI.generated|not a real person/);}
});
function loadDaily(){
 const writes:any[]=[],calls:string[]=[];let job:any=null;
 const control={enabled:true,paused:false,epoch:2,presenter_profile_id:'cole'};
 const client={from(table:string){const q:any={select(){return q},eq(){return q},order(){return q},in(){return q},limit(){return q},maybeSingle:async()=>({data:table==='agency_cole_daily_controls'?control:null,error:null}),single:async()=>({data:job,error:null}),insert(value:any){writes.push({table,...value});job={id:'daily-job',...value};return q;},update(value:any){writes.push({table,...value});return q;},then(resolve:any){return Promise.resolve({data:table==='agency_cole_ai_reservations'?[]:[],error:null}).then(resolve);}};return q;}};
 const m={exports:{} as {prepareDaily:(owner:string)=>Promise<unknown>}};
 const modules:Record<string,unknown>={'node:crypto':require('node:crypto'),'@/lib/supabase/service':{createBeastFusionPublicationClient:()=>client},'@/lib/agencyDaily':require('../src/lib/agencyDaily'),'@/lib/agencyAppearance':require('../src/lib/agencyAppearance'),'./store':{agencyAccount:async()=>{calls.push('provider');throw Error('must not read provider');}},'@/lib/agencyWorkflow':require('../src/lib/agencyWorkflow'),'@/lib/server/social/providers':{metaRequest:async()=>{calls.push('meta');throw Error('must not dispatch');}}};
 new Function('require','module','exports',transpileModule(readFileSync('src/lib/server/agency/daily.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>{assert.ok(id in modules,id);return modules[id];},m,m.exports);
 return {prepare:m.exports.prepareDaily,writes,calls};
}
test('actual preparation preflight records a hold without provider, storage, reservation or paid calls',async()=>{
 const r=loadDaily();const outcome=await r.prepare('owner');assert.deepEqual(outcome,{status:'blocked',reason:'request_cost_bound_unverified'});assert.deepEqual(r.calls,[]);assert.equal(r.writes.length,2);assert.equal(r.writes[0].table,'agency_cole_daily_jobs');assert.equal(r.writes[1].state,'blocked');assert.equal(r.writes[1].reason,'request_cost_bound_unverified');
});
function imageRoute(owner:boolean){
 let reads=0;const m={exports:{} as {GET:(r:Request)=>Promise<Response>}};
 const modules:Record<string,unknown>={'@/lib/server/social/auth':{socialOwner:async()=>owner?{id:'owner'}:null,socialJson:(b:unknown,status=200)=>Response.json(b,{status})},'@/lib/server/agency/daily':{privateDailyImage:async()=>{reads++;return new Uint8Array([255,216,255,217]);}},'@/lib/marketingSocial':require('../src/lib/marketingSocial')};
 new Function('require','module','exports',transpileModule(readFileSync('src/app/api/admin/agency/daily/image/route.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>modules[id],m,m.exports);
 return {get:m.exports.GET,reads:()=>reads};
}
test('generated media endpoint denies anonymous and invalid IDs before storage; owner receives private/no-store JPEG',async()=>{
 const id='00000000-0000-4000-8000-000000000001';for(const owner of [false,true]){const r=imageRoute(owner),out=await r.get(new Request(`https://beast.test/?job=${id}`));assert.equal(out.status,owner?200:403);assert.equal(r.reads(),owner?1:0);if(owner){assert.equal(out.headers.get('Cache-Control'),'private, no-store');assert.equal(out.headers.get('Content-Type'),'image/jpeg');}}
 const r=imageRoute(true);assert.equal((await r.get(new Request('https://beast.test/?job=../../foreign'))).status,404);assert.equal(r.reads(),0);
});
function scheduleFixture(paused=false){
 const crypto=require('node:crypto'),workflow=require('../src/lib/agencyWorkflow');
 const bytes=Buffer.from([255,216,0,1,255,217]),mediaHash=crypto.createHash('sha256').update(bytes).digest('hex');
 const account={connectionId:'connection',accountId:'17841414868844559',username:'cole.after.hours',connectedAt:'version'};
 const profile={id:'cole',name:'Cole Mercer',presenter_type:'future_character',owner_id:'owner',provenance:{manualAgencyApproved:true,identityApproval:true,disclosureApproved:true}};
 const job={id:'job',owner_id:'owner',state:'ready',post_id:'post',caption:'Quiet miles.',control_epoch:1,media_path:'owner/agency-daily/job.jpeg',media_hash:mediaHash,media_bytes:bytes.length};
 const post={id:'post',owner_id:'owner',presenter_profile_id:'cole',revision:1,status:'draft',content:{caption:job.caption,mediaUrl:''},media_hash:mediaHash,content_hash:workflow.digest([job.caption,mediaHash]),profile_hash:workflow.profileFingerprint(profile)};
 const rows:Record<string,any[]>={agency_cole_daily_controls:[{owner_id:'owner',enabled:true,paused,epoch:1}],agency_cole_daily_jobs:[job],beast_marketing_presenter_profiles:[profile],beast_marketing_agency_posts:[post],profiles:[{id:'owner',role:'admin'}]};
 const client={storage:{from(){return {download:async()=>({data:new Blob([bytes]),error:null})};}},from(table:string){let patch:any=null;const filters:((r:any)=>boolean)[]=[];const result=()=>{const found=(rows[table]??[]).filter(r=>filters.every(f=>f(r)));if(patch)found.forEach(r=>Object.assign(r,patch));return {data:found,error:null};};const q:any={select(){return q},eq(k:string,v:any){filters.push(r=>r[k]===v);return q},update(p:any){patch=p;return q},single:async()=>{const r=result();return {data:r.data.length===1?{...r.data[0]}:null,error:r.data.length===1?null:'not found'};},maybeSingle:async()=>{const r=result();return {data:r.data[0]?{...r.data[0]}:null,error:null};}};return q;}};
 const m={exports:{} as {scheduleDaily:(owner:string,job:string,rev:number,user:string,reviewed:boolean)=>Promise<any>}};
 const modules:Record<string,unknown>={'node:crypto':crypto,'@/lib/supabase/service':{createBeastFusionPublicationClient:()=>client},'@/lib/agencyDaily':require('../src/lib/agencyDaily'),'@/lib/agencyAppearance':require('../src/lib/agencyAppearance'),'./store':{agencyAccount:async()=>({account,token:'synthetic-only'})},'@/lib/agencyWorkflow':workflow,'@/lib/server/social/providers':{metaRequest:async()=>{throw Error('No publishing in approval');}}};
 new Function('require','module','exports',transpileModule(readFileSync('src/lib/server/agency/daily.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>modules[id],m,m.exports);
 return {schedule:m.exports.scheduleDaily,post,job,profile};
}
test('Approve & Schedule requires exact private bytes, brand, revision, destination and review; records only one approval',async()=>{
 for(const [revision,username,reviewed] of [[1,'cole.after.hours',false],[1,'other',true],[2,'cole.after.hours',true]] as const){const f=scheduleFixture();await assert.rejects(f.schedule('owner','job',revision,username,reviewed));assert.equal(f.post.status,'draft');}
 const changed=scheduleFixture();changed.job.media_hash='0'.repeat(64);await assert.rejects(changed.schedule('owner','job',1,'cole.after.hours',true),/checksum/);
 const f=scheduleFixture();const out=await f.schedule('owner','job',1,'@cole.after.hours',true);assert.ok(out.scheduledFor);assert.equal(f.post.status,'approved');assert.equal(f.job.state,'scheduled');assert.equal((f.job as any).approved_revision,1);assert.ok((f.post as any).approval_hash);await assert.rejects(f.schedule('owner','job',1,'cole.after.hours',true));
 const paused=scheduleFixture(true);await assert.rejects(paused.schedule('owner','job',1,'cole.after.hours',true),/paused/);assert.equal(paused.post.status,'draft');
 const brand=scheduleFixture();brand.profile.provenance.manualAgencyApproved=false;await assert.rejects(brand.schedule('owner','job',1,'cole.after.hours',true),/Brand/);
});
