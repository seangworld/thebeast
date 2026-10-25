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
test('estimated reservation uses input/output plus headroom; stale pricing and malformed usage stop dispatch',()=>{
 assert.equal(COLE_DAILY.monthlyLimitMicros,10000000);assert.equal(COLE_DAILY.mode,'approval_required');
 assert.equal(requestQuote(new Date('2026-10-25')),250000);assert.throws(()=>requestQuote(new Date('2026-11-25')),/pricing_review_required/);
 const usage={input_tokens:110,input_tokens_details:{text_tokens:10,image_tokens:100},output_tokens:200,output_tokens_details:{image_tokens:200,text_tokens:0}};
 assert.equal(usageCost(usage),6850);for(const u of [null,{}, {...usage,input_tokens:109},{...usage,output_tokens:201},{...usage,input_tokens_details:{text_tokens:-1,image_tokens:111}}])assert.throws(()=>usageCost(u),/usage_unverified/);
});
test('rotation uses only approved tattoo-free fictional appearance; no public image or boilerplate caption',()=>{
 const days=['2026-10-25','2026-10-26','2026-10-27'].map(dailyCreative);assert.equal(new Set(days.map(x=>x.theme)).size,3);
 for(const c of days){assert.match(c.prompt,/exact face/);assert.match(c.prompt,/6 feet 1 inch/);assert.match(c.prompt,/NO tattoos/);assert.doesNotMatch(c.prompt,/Pinterest|https?:/);assert.doesNotMatch(c.caption,/AI.generated|not a real person/);}
});
function generationFixture(mode='ok'){
 const crypto=require('node:crypto'),appearance=require('../src/lib/agencyAppearance'),pure=require('../src/lib/agencyDaily');
 const reference=Buffer.from('synthetic approved private reference'),image=Buffer.from([255,216,1,2,255,217]),hash=(b:Buffer)=>crypto.createHash('sha256').update(b).digest('hex');
 const refs={...appearance.talentAppearance,cole:{...appearance.talentAppearance.cole,bytes:reference.length,sha256:hash(reference)}};
 const control:any={owner_id:'owner',presenter_profile_id:'cole',enabled:true,paused:mode==='paused',epoch:1,hold_reason:null};
 const rows:Record<string,any[]>={agency_cole_daily_controls:[control],agency_cole_daily_jobs:[],agency_cole_ai_reservations:[],profiles:[{id:'owner',role:'admin'}],beast_marketing_presenter_profiles:[{id:'cole',owner_id:'owner',name:'Cole Mercer',presenter_type:'future_character',visual_identity:{canonicalAppearance:{sha256:hash(reference)}}}],beast_marketing_agency_posts:[]};
 let providerCalls=0,uploads=0,claimed=false;const payloads:any[]=[];const storage=new Map<string,Buffer>();
 const client={storage:{from(bucket:string){assert.equal(bucket,'beast-marketing-media');return {download:async(path:string)=>({data:new Blob([new Uint8Array(path.includes('agency-appearance')?reference:storage.get(path)!)]),error:null}),upload:async(path:string,bytes:Buffer,options:any)=>{uploads++;assert.equal(options.upsert,false);storage.set(path,Buffer.from(bytes));return {error:null};}};}},from(table:string){let patch:any=null,insert:any=null;const filters:((r:any)=>boolean)[]=[];const result=()=>{if(insert){rows[table].push({id:'post',...insert});insert=null;}const found=rows[table].filter(r=>filters.every(f=>f(r)));if(patch)found.forEach(r=>Object.assign(r,patch));return {data:found.map(r=>({...r})),error:null};};const q:any={select(){return q},eq(k:string,v:any){filters.push(r=>r[k]===v);return q},in(k:string,v:any[]){filters.push(r=>v.includes(r[k]));return q},order(){return q},limit(){return q},update(p:any){patch=p;return q},insert(p:any){insert=p;return q},then(resolve:any){return Promise.resolve(result()).then(resolve)},single:async()=>{const r=result();return {data:r.data[0]??null,error:r.data.length===1?null:'not single'}},maybeSingle:async()=>({data:result().data[0]??null,error:null})};return q;},rpc:async(name:string,args:any)=>{
  if(name==='agency_cole_claim_day'){if(claimed)return {data:null,error:null};claimed=true;rows.agency_cole_daily_jobs.push({id:'job',owner_id:'owner',local_day:args.p_day,state:'preparing',control_epoch:1,caption:args.p_caption});return {data:'job',error:null};}
  if(name==='agency_cole_reserve'){if(mode==='budget')return {error:{message:'budget_exhausted'},data:null};assert.equal(args.p_maximum,250000);rows.agency_cole_ai_reservations.push({id:'reservation',owner_id:'owner',job_id:'job',month:pure.nyMonth(new Date()),state:'reserved',maximum_micros:250000,settled_micros:null});return {data:'reservation',error:null};}
  if(name==='agency_cole_dispatch'){rows.agency_cole_ai_reservations[0].state='dispatched';return {data:true,error:null};}
  if(name==='agency_cole_settle_estimate'){const u=args.p_usage,cost=u?u.textInputTokens*5+u.imageInputTokens*8+u.imageOutputTokens*30:null;const reason=cost===null?'usage_unverified':cost>250000?'reservation_exceeded':null;const r=rows.agency_cole_ai_reservations[0];r.state=cost===null?'uncertain':'settled';r.settled_micros=cost;r.usage_counts=u;if(reason){control.paused=true;control.hold_reason=reason;}return {data:{state:r.state,cost_micros:cost,pause_reason:reason},error:null};}
  throw Error('Unexpected RPC '+name);
 }};
 const fakeFetch=async(_url:string,options:any)=>{providerCalls++;payloads.push(JSON.parse(options.body));if(mode==='owner_pause'){control.epoch++;control.paused=true;control.hold_reason=null;}if(mode==='timeout'){const e=new Error('private network detail');e.name='TimeoutError';throw e;}if(mode==='provider_error')return Response.json({error:{code:'model_not_found',message:'DO NOT EXPOSE RAW RESPONSE'}},{status:404});const n=mode==='overrun'?10000:200;return Response.json({data:[{b64_json:image.toString('base64')}],usage:mode==='unknown'?undefined:{input_tokens:110,input_tokens_details:{text_tokens:10,image_tokens:100},output_tokens:n}});};
 const modules:Record<string,unknown>={'node:crypto':crypto,'@/lib/supabase/service':{createBeastFusionPublicationClient:()=>client},'@/lib/agencyDaily':pure,'@/lib/agencyAppearance':{talentAppearance:refs},'./store':{agencyAccount:async()=>({account:{username:'cole.after.hours'},token:'synthetic'})},'@/lib/agencyWorkflow':require('../src/lib/agencyWorkflow'),'@/lib/server/social/providers':{metaRequest:async()=>{throw Error('No Meta publishing in draft generation');}}};
 const m={exports:{} as {prepareDaily:(owner:string)=>Promise<any>;dailyControl:(owner:string,enabled:boolean)=>Promise<void>}};new Function('require','module','exports','fetch','process',transpileModule(readFileSync('src/lib/server/agency/daily.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>modules[id],m,m.exports,fakeFetch,{env:{OPENAI_API_KEY:'synthetic-only'}});
 return {prepare:()=>m.exports.prepareDaily('owner'),setControl:(enabled:boolean)=>m.exports.dailyControl('owner',enabled),rows,payloads,reference,image,storage,control,providerCalls:()=>providerCalls,uploads:()=>uploads};
}
test('one production-shaped request saves exact private bytes and real usage; duplicate job never dispatches again',async()=>{
 const f=generationFixture(),r=await f.prepare();assert.equal(r.status,'ready');assert.equal(r.generationCostMicros,6850);assert.equal(f.providerCalls(),1);assert.equal(f.uploads(),1);assert.equal(f.rows.beast_marketing_agency_posts[0].status,'draft');assert.equal(f.control.paused,false);
 const p=f.payloads[0];assert.equal(p.model,COLE_DAILY.model);assert.equal(p.n,1);assert.equal(p.size,'1024x1024');assert.equal(p.quality,'low');assert.equal(p.output_format,'jpeg');assert.equal(p.images.length,1);assert.equal(p.images[0].image_url,'data:image/png;base64,'+f.reference.toString('base64'));assert.deepEqual(f.storage.get('owner/agency-daily/job.jpeg'),f.image);
 assert.equal((await f.prepare()).status,'already_attempted_or_prepared');assert.equal(f.providerCalls(),1);
});
test('unknown and over-reservation usage pause further generation but retain the private photo; known overrun is recorded',async()=>{
 for(const mode of ['unknown','overrun']){const f=generationFixture(mode),r=await f.prepare();assert.equal(r.status,'ready');assert.equal(f.control.paused,true);assert.equal(f.uploads(),1);assert.equal(f.rows.beast_marketing_agency_posts[0].status,'draft');assert.equal(r.generationCostMicros,mode==='unknown'?null:300850);await f.setControl(false);assert.equal(f.control.hold_reason,mode==='unknown'?'usage_unverified':'reservation_exceeded');await assert.rejects(f.setControl(true),/Reconcile/);await assert.rejects(f.prepare(),/paused/);assert.equal(f.providerCalls(),1);}
});
test('budget stops before paid dispatch; provider error/timeout is sanitized, held and never retried; explicit pause stops private persistence',async()=>{
 for(const mode of ['budget','provider_error','timeout','owner_pause']){const f=generationFixture(mode),r=await f.prepare();assert.equal(r.status,'blocked');assert.equal(f.providerCalls(),mode==='budget'?0:1);assert.equal(f.uploads(),0);assert.equal(f.rows.beast_marketing_agency_posts.length,0);if(mode==='provider_error'){assert.equal(r.reason,'provider_http_404');assert.equal(r.providerCode,'model_not_found');assert.doesNotMatch(JSON.stringify(r),/RAW RESPONSE/);}if(mode==='timeout')assert.equal(r.reason,'provider_timeout');if(['provider_error','timeout','owner_pause'].includes(mode)){assert.equal(f.control.paused,true);await assert.rejects(f.prepare(),/paused/);}else await f.prepare();assert.equal(f.providerCalls(),mode==='budget'?0:1);}
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
